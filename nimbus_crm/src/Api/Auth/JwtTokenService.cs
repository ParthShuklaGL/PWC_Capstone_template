using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using NimbusCrm.Application.Abstractions;
using NimbusCrm.Application.Auth;

namespace NimbusCrm.Api.Auth;

public sealed class JwtTokenService : ITokenService
{
    private readonly JwtOptions _options;
    private readonly TimeProvider _clock;
    private readonly SigningCredentials _credentials;
    private readonly JsonWebTokenHandler _handler = new();

    public JwtTokenService(IOptions<JwtOptions> options, TimeProvider clock)
    {
        _options = options.Value;
        _clock = clock;
        _credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.SigningKey)),
            SecurityAlgorithms.HmacSha256);
    }

    public IssuedToken Issue(UserDto user)
    {
        var now = _clock.GetUtcNow();
        var expires = now.AddMinutes(_options.AccessTokenMinutes);

        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = _options.Issuer,
            Audience = _options.Audience,
            IssuedAt = now.UtcDateTime,
            NotBefore = now.UtcDateTime,
            Expires = expires.UtcDateTime,
            Subject = new System.Security.Claims.ClaimsIdentity(
                AppClaims.For(user, Guid.NewGuid().ToString("N"))),
            SigningCredentials = _credentials,
        };

        return new IssuedToken(_handler.CreateToken(descriptor), expires);
    }
}
