using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace NimbusCrm.Api.Auth;

/// <summary>
/// Authenticates from the server-side session. The login wrote the user's id, name and role into
/// the session store; the browser only holds the session id, so signing out destroys the login
/// on the server and a copied cookie stops working. Each request also re-checks the user, so a
/// deactivated user or a changed role ends the session.
/// </summary>
public sealed class SessionAuthenticationHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder) : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string UserIdKey = "uid";
    public const string UserNameKey = "uname";
    public const string RoleKey = "urole";

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        await Context.Session.LoadAsync(Context.RequestAborted);

        var id = Context.Session.GetString(UserIdKey);
        var name = Context.Session.GetString(UserNameKey);
        var role = Context.Session.GetString(RoleKey);

        if (id is null || name is null || role is null)
        {
            return AuthenticateResult.NoResult();
        }

        var principal = AppClaims.Principal(
        [
            new(AppClaims.Subject, id),
            new(AppClaims.Name, name),
            new(AppClaims.Role, role),
        ], Scheme.Name);

        if (!await CredentialCheck.IsStillValidAsync(Context, principal))
        {
            Context.Session.Clear();
            return AuthenticateResult.Fail("This session is no longer valid.");
        }

        return AuthenticateResult.Success(new AuthenticationTicket(principal, Scheme.Name));
    }

    protected override Task HandleChallengeAsync(AuthenticationProperties properties)
    {
        Response.StatusCode = StatusCodes.Status401Unauthorized;
        return Task.CompletedTask;
    }

    protected override Task HandleForbiddenAsync(AuthenticationProperties properties)
    {
        Response.StatusCode = StatusCodes.Status403Forbidden;
        return Task.CompletedTask;
    }
}
