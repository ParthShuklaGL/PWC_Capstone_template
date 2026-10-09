using System.Globalization;
using System.Security.Claims;
using NimbusCrm.Application.Abstractions;

namespace NimbusCrm.Api.Auth;

/// <summary>
/// The one question all three modes ask after their own check has passed: is this credential still
/// good? (Its user exists, is active, still has the same role, and it was not signed out.)
/// </summary>
public static class CredentialCheck
{
    public static async ValueTask<bool> IsStillValidAsync(HttpContext http, ClaimsPrincipal? principal)
    {
        if (principal is null)
        {
            return false;
        }

        var subject = principal.FindFirstValue(AppClaims.Subject);
        var role = principal.FindFirstValue(AppClaims.Role);
        if (role is null || !long.TryParse(subject, NumberStyles.None, CultureInfo.InvariantCulture, out var userId))
        {
            return false;
        }

        var validator = http.RequestServices.GetRequiredService<ICredentialValidator>();
        return await validator.IsValidAsync(userId, role, principal.FindFirstValue(AppClaims.TokenId), http.RequestAborted);
    }
}
