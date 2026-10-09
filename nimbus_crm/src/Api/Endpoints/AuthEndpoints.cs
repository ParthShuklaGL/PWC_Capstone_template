using System.Globalization;
using System.Security.Claims;
using System.Threading.RateLimiting;
using Mediator;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;
using NimbusCrm.Api.Auth;
using NimbusCrm.Api.Contracts;
using NimbusCrm.Application.Abstractions;
using NimbusCrm.Application.Auth;
using NimbusCrm.Application.Auth.Login;
using NimbusCrm.Application.Auth.Register;
using NimbusCrm.Application.Users;

namespace NimbusCrm.Api.Endpoints;

public static class AuthEndpoints
{
    public const string LoginRateLimitPolicy = "login";

    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        // Open to anyone, and rate limited. No CSRF token: there is no login to hijack yet.
        // Responses can carry a token, so none of them may be cached.
        var open = app.MapGroup("/api/auth")
            .AllowAnonymous()
            .RequireRateLimiting(LoginRateLimitPolicy)
            .AddEndpointFilter<NoStoreEndpointFilter>();
        open.MapPost("/register", Register);
        open.MapPost("/login", Login);

        // Everything else needs a signed-in caller, however they signed in.
        var secured = app.MapGroup("/api")
            .RequireAuthorization()
            .AddEndpointFilter<NoStoreEndpointFilter>()
            .AddEndpointFilter<CsrfEndpointFilter>();
        secured.MapGet("/auth/me", Me);
        secured.MapGet("/auth/csrf", Csrf);
        secured.MapPost("/auth/logout", Logout);
        secured.MapGet("/users", ListUsers).RequireAuthorization(AuthenticationExtensions.AdminOnlyPolicy);

        return app;
    }

    private static async Task<IResult> Register(RegisterRequest request, ISender sender, CancellationToken cancellationToken)
    {
        var result = await sender.Send(
            new RegisterCommand(request.Username, request.Email, request.Password), cancellationToken);

        return result.IsSuccess
            ? Results.Json(result.Value, statusCode: StatusCodes.Status201Created)
            : result.Error.ToProblem();
    }

    private static async Task<IResult> Login(
        LoginRequest request,
        HttpContext http,
        ISender sender,
        ITokenService tokens,
        IOptions<AuthOptions> authOptions,
        TimeProvider clock,
        CancellationToken cancellationToken)
    {
        var mode = authOptions.Value.DefaultMode;
        if (request.Mode is not null && !AuthModeParser.TryParse(request.Mode, out mode))
        {
            return Results.ValidationProblem(new Dictionary<string, string[]>
            {
                ["Mode"] = ["Mode must be Jwt, Cookie or Session."],
            });
        }

        var result = await sender.Send(new LoginCommand(request.Username, request.Password), cancellationToken);
        if (!result.IsSuccess)
        {
            return result.Error.ToProblem();
        }

        var user = result.Value;

        switch (mode)
        {
            case AuthMode.Cookie:
                var expires = clock.GetUtcNow().AddMinutes(authOptions.Value.CookieMinutes);
                var principal = AppClaims.Principal(
                    AppClaims.For(user, Guid.NewGuid().ToString("N")), AuthSchemes.Cookies);
                await http.SignInAsync(AuthSchemes.Cookies, principal, new AuthenticationProperties
                {
                    IsPersistent = true,
                    ExpiresUtc = expires,
                    AllowRefresh = false,
                });
                return Results.Ok(new LoginResponse(user, nameof(AuthMode.Cookie), null, expires));

            case AuthMode.Session:
                http.Session.SetString(SessionAuthenticationHandler.UserIdKey, user.Id.ToString(CultureInfo.InvariantCulture));
                http.Session.SetString(SessionAuthenticationHandler.UserNameKey, user.Username);
                http.Session.SetString(SessionAuthenticationHandler.RoleKey, user.Role);
                await http.Session.CommitAsync(cancellationToken);
                return Results.Ok(new LoginResponse(user, nameof(AuthMode.Session), null, null));

            default:
                var issued = tokens.Issue(user);
                return Results.Ok(new LoginResponse(user, nameof(AuthMode.Jwt), issued.Token, issued.ExpiresAt));
        }
    }

    private static IResult Me(HttpContext http, IOptions<AuthOptions> authOptions)
    {
        var id = http.User.FindFirstValue(AppClaims.Subject);
        var name = http.User.FindFirstValue(AppClaims.Name);
        var role = http.User.FindFirstValue(AppClaims.Role);

        // A credential that lacks any of these is not one this API issued: treat it as not signed in.
        if (!long.TryParse(id, NumberStyles.None, CultureInfo.InvariantCulture, out var userId) || name is null || role is null)
        {
            return Results.Unauthorized();
        }

        return Results.Ok(new MeResponse(userId, name, role, AuthSchemes.Select(http, authOptions.Value.DefaultMode)));
    }

    private static IResult Csrf(HttpContext http, IAntiforgery antiforgery)
    {
        var tokens = antiforgery.GetAndStoreTokens(http);
        var token = tokens.RequestToken
            ?? throw new InvalidOperationException("The anti-forgery service did not produce a request token.");
        return Results.Ok(new CsrfResponse("X-CSRF-TOKEN", token));
    }

    /// <summary>Ends the credential this request used. The other two modes are left alone.</summary>
    private static async Task<IResult> Logout(
        HttpContext http,
        ITokenRevocationList revocations,
        IOptions<AuthOptions> authOptions,
        IOptions<JwtOptions> jwtOptions,
        TimeProvider clock,
        CancellationToken cancellationToken)
    {
        var tokenId = http.User.FindFirstValue(AppClaims.TokenId);

        switch (AuthSchemes.Select(http, authOptions.Value.DefaultMode))
        {
            case AuthSchemes.Bearer:
                if (tokenId is not null)
                {
                    await revocations.RevokeAsync(
                        tokenId, clock.GetUtcNow().AddMinutes(jwtOptions.Value.AccessTokenMinutes), cancellationToken);
                }

                break;

            case AuthSchemes.Cookies:
                if (tokenId is not null)
                {
                    await revocations.RevokeAsync(
                        tokenId, clock.GetUtcNow().AddMinutes(authOptions.Value.CookieMinutes), cancellationToken);
                }

                await http.SignOutAsync(AuthSchemes.Cookies);
                break;

            default:
                http.Session.Clear();
                http.Response.Cookies.Delete(AuthSchemes.SessionCookieName);
                break;
        }

        return Results.NoContent();
    }

    private static async Task<IResult> ListUsers(int? page, int? size, ISender sender, CancellationToken cancellationToken) =>
        Results.Ok(await sender.Send(new ListUsersQuery(page ?? 0, size ?? 20), cancellationToken));

    public static void AddLoginRateLimiter(this Microsoft.AspNetCore.RateLimiting.RateLimiterOptions options, int permitsPerMinute)
    {
        options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
        options.AddPolicy(LoginRateLimitPolicy, context => RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = permitsPerMinute,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
            }));
    }
}
