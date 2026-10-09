using System.Text;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using NimbusCrm.Application.Auth;

namespace NimbusCrm.Api.Auth;

public static class AuthenticationExtensions
{
    public const string AdminOnlyPolicy = "AdminOnly";

    /// <summary>
    /// One default scheme ("Smart") that forwards to Bearer, Cookies or Session depending on the
    /// credential the request carries. Every endpoint just says RequireAuthorization(); it does not
    /// care which of the three proved the caller's identity. After each scheme accepts a credential,
    /// <see cref="CredentialCheck"/> confirms the user is still active with the same role and that the
    /// credential was not signed out.
    /// </summary>
    public static IServiceCollection AddAuthModes(
        this IServiceCollection services, IConfiguration configuration, IHostEnvironment environment)
    {
        services.AddSingleton(TimeProvider.System);

        services.AddOptions<AuthOptions>()
            .Bind(configuration.GetSection(AuthOptions.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();

        services.AddOptions<JwtOptions>()
            .Bind(configuration.GetSection(JwtOptions.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();
        services.AddSingleton<IValidateOptions<JwtOptions>, JwtOptionsValidator>();

        var auth = configuration.GetSection(AuthOptions.SectionName).Get<AuthOptions>() ?? new AuthOptions();
        var securePolicy = environment.IsDevelopment() ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;

        services.AddSingleton(new LockoutPolicy(auth.MaxFailedLogins, TimeSpan.FromMinutes(auth.LockoutMinutes)));
        services.AddSingleton<Application.Abstractions.ITokenService, JwtTokenService>();

        services.AddAuthentication(AuthSchemes.Smart)
            .AddPolicyScheme(AuthSchemes.Smart, "Bearer, cookie or session", options =>
            {
                options.ForwardDefaultSelector = context => AuthSchemes.Select(context, auth.DefaultMode);
            })
            .AddJwtBearer(AuthSchemes.Bearer, _ => { })
            .AddCookie(AuthSchemes.Cookies, options =>
            {
                options.Cookie.Name = AuthSchemes.CookieName;
                options.Cookie.HttpOnly = true;
                options.Cookie.SameSite = SameSiteMode.Lax;
                options.Cookie.SecurePolicy = securePolicy;
                options.ExpireTimeSpan = TimeSpan.FromMinutes(auth.CookieMinutes);
                options.SlidingExpiration = false;

                // An API answers 401 and 403; it never redirects to a login page.
                options.Events.OnRedirectToLogin = context =>
                {
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    return Task.CompletedTask;
                };
                options.Events.OnRedirectToAccessDenied = context =>
                {
                    context.Response.StatusCode = StatusCodes.Status403Forbidden;
                    return Task.CompletedTask;
                };
                options.Events.OnValidatePrincipal = async context =>
                {
                    if (!await CredentialCheck.IsStillValidAsync(context.HttpContext, context.Principal))
                    {
                        context.RejectPrincipal();
                    }
                };
            })
            .AddScheme<AuthenticationSchemeOptions, SessionAuthenticationHandler>(AuthSchemes.Session, _ => { });

        // The JWT settings come from IOptions<JwtOptions>, so the signing key is read from
        // user-secrets or the environment and never appears in this file.
        services.AddOptions<JwtBearerOptions>(AuthSchemes.Bearer)
            .Configure<IOptions<JwtOptions>>((options, jwt) =>
            {
                options.MapInboundClaims = false;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = jwt.Value.Issuer,
                    ValidateAudience = true,
                    ValidAudience = jwt.Value.Audience,
                    ValidateIssuerSigningKey = true,

                    // The current key first, then keys kept only to verify tokens signed before a rotation.
                    IssuerSigningKeys = new[] { jwt.Value.SigningKey }
                        .Concat(jwt.Value.PreviousSigningKeys)
                        .Select(key => (SecurityKey)new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)))
                        .ToList(),
                    ValidAlgorithms = [SecurityAlgorithms.HmacSha256],
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.FromSeconds(30),
                    NameClaimType = AppClaims.Name,
                    RoleClaimType = AppClaims.Role,
                };
                options.Events = new JwtBearerEvents
                {
                    OnTokenValidated = async context =>
                    {
                        if (!await CredentialCheck.IsStillValidAsync(context.HttpContext, context.Principal))
                        {
                            context.Fail("This token is no longer valid.");
                        }
                    },
                };
            });

        services.AddDistributedMemoryCache();
        services.AddSession(options =>
        {
            options.Cookie.Name = AuthSchemes.SessionCookieName;
            options.Cookie.HttpOnly = true;
            options.Cookie.SameSite = SameSiteMode.Lax;
            options.Cookie.SecurePolicy = securePolicy;
            options.Cookie.IsEssential = true;
            options.IdleTimeout = TimeSpan.FromMinutes(auth.SessionIdleMinutes);
        });

        services.AddAntiforgery(options =>
        {
            options.HeaderName = "X-CSRF-TOKEN";
            options.Cookie.Name = "crm.csrf";
            options.Cookie.HttpOnly = true;
            options.Cookie.SameSite = SameSiteMode.Strict;
            options.Cookie.SecurePolicy = securePolicy;
        });

        services.AddAuthorizationBuilder()
            .AddPolicy(AdminOnlyPolicy, policy => policy.RequireRole(RoleNames.Admin));

        return services;
    }
}
