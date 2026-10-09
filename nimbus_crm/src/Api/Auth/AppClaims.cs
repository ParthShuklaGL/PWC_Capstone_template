using System.Security.Claims;
using NimbusCrm.Application.Auth;

namespace NimbusCrm.Api.Auth;

/// <summary>
/// The same four claims describe a signed-in user whichever way they proved it, so one
/// authorization rule works for JWT, cookie and session.
/// </summary>
public static class AppClaims
{
    public const string Subject = "sub";
    public const string Name = "name";
    public const string Role = "role";
    public const string TokenId = "jti";

    public static List<Claim> For(UserDto user, string tokenId) =>
    [
        new(Subject, user.Id.ToString()),
        new(Name, user.Username),
        new(Role, user.Role),
        new(TokenId, tokenId),
    ];

    public static ClaimsPrincipal Principal(IEnumerable<Claim> claims, string authenticationType) =>
        new(new ClaimsIdentity(claims, authenticationType, Name, Role));
}
