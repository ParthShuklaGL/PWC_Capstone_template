using System.Text;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using NimbusSales.Crm.Domain;

namespace NimbusSales.Crm.Auth;

public class JwtOptions
{
    public const string Section = "Jwt";

    public string Issuer { get; set; } = "nimbus-crm";

    public string Audience { get; set; } = "nimbus-crm-clients";

    /// <summary>Signing key, at least 32 characters. Read from configuration, never hard-coded.</summary>
    public string Key { get; set; } = string.Empty;

    public int ExpiryMinutes { get; set; } = 480;

    public SymmetricSecurityKey SigningKey => new(Encoding.UTF8.GetBytes(Key));
}

public record IssuedToken(string Token, DateTimeOffset ExpiresAt);

public class TokenService
{
    private readonly JwtOptions _options;

    public TokenService(Microsoft.Extensions.Options.IOptions<JwtOptions> options)
    {
        _options = options.Value;
    }

    public IssuedToken Issue(AppUser user)
    {
        var expires = DateTimeOffset.UtcNow.AddMinutes(_options.ExpiryMinutes);
        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = _options.Issuer,
            Audience = _options.Audience,
            Expires = expires.UtcDateTime,
            SigningCredentials = new SigningCredentials(
                _options.SigningKey, SecurityAlgorithms.HmacSha256),
            Claims = new Dictionary<string, object>
            {
                [CurrentUser.UidClaim] = user.Id,
                [JwtRegisteredClaimNames.Sub] = user.UserRef,
                [JwtRegisteredClaimNames.Email] = user.Email,
                [CurrentUser.NameClaim] = user.DisplayName,
                [CurrentUser.RoleClaim] = user.Role
            }
        };

        return new IssuedToken(new JsonWebTokenHandler().CreateToken(descriptor), expires);
    }
}
