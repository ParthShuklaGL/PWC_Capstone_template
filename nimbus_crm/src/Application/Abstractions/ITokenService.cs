using NimbusCrm.Application.Auth;

namespace NimbusCrm.Application.Abstractions;

public sealed record IssuedToken(string Token, DateTimeOffset ExpiresAt);

public interface ITokenService
{
    IssuedToken Issue(UserDto user);
}
