using System.ComponentModel.DataAnnotations;
using Microsoft.Extensions.Options;

namespace NimbusCrm.Api.Auth;

public enum AuthMode
{
    Jwt,
    Cookie,
    Session,
}

public sealed class AuthOptions
{
    public const string SectionName = "Auth";

    /// <summary>The mode a login uses when the request does not ask for one.</summary>
    public AuthMode DefaultMode { get; set; } = AuthMode.Jwt;

    [Range(1, 24 * 60)]
    public int CookieMinutes { get; set; } = 60;

    [Range(1, 24 * 60)]
    public int SessionIdleMinutes { get; set; } = 30;

    /// <summary>Login and register attempts allowed per client address per minute.</summary>
    [Range(1, 10_000)]
    public int LoginRateLimitPerMinute { get; set; } = 10;

    /// <summary>Wrong passwords in a row before the account is locked.</summary>
    [Range(1, 100)]
    public int MaxFailedLogins { get; set; } = 5;

    /// <summary>How long a locked account refuses every sign-in, whatever the password.</summary>
    [Range(1, 24 * 60)]
    public int LockoutMinutes { get; set; } = 15;
}

public sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    [Required]
    public string Issuer { get; set; } = string.Empty;

    [Required]
    public string Audience { get; set; } = string.Empty;

    [Range(1, 24 * 60)]
    public int AccessTokenMinutes { get; set; } = 15;

    /// <summary>
    /// The HMAC signing key. It is never in a committed file: set it with user-secrets
    /// (<c>Jwt:SigningKey</c>) or the <c>Jwt__SigningKey</c> environment variable.
    /// </summary>
    [Required]
    public string SigningKey { get; set; } = string.Empty;

    /// <summary>
    /// Keys that still verify tokens but never sign new ones. To rotate: put the new key in
    /// <see cref="SigningKey"/> and the old one here; remove it once the longest-lived token has expired
    /// (<see cref="AccessTokenMinutes"/>).
    /// </summary>
    public string[] PreviousSigningKeys { get; set; } = [];
}

/// <summary>Rejects a signing key that is short or obviously not random, at startup.</summary>
public sealed class JwtOptionsValidator : IValidateOptions<JwtOptions>
{
    public const int MinimumLength = 32;
    public const int MinimumDistinctCharacters = 12;

    public ValidateOptionsResult Validate(string? name, JwtOptions options)
    {
        var failures = new List<string>();

        var current = Check(options.SigningKey);
        if (current is not null)
        {
            failures.Add($"Jwt:SigningKey {current}");
        }

        for (var i = 0; i < options.PreviousSigningKeys.Length; i++)
        {
            var previous = Check(options.PreviousSigningKeys[i]);
            if (previous is not null)
            {
                failures.Add($"Jwt:PreviousSigningKeys[{i}] {previous}");
            }
        }

        return failures.Count == 0 ? ValidateOptionsResult.Success : ValidateOptionsResult.Fail(failures);
    }

    /// <summary>Null when the key is acceptable, otherwise why it is not.</summary>
    public static string? Check(string? key)
    {
        if (string.IsNullOrEmpty(key) || key.Length < MinimumLength)
        {
            return $"must be at least {MinimumLength} characters.";
        }

        return key.Distinct().Count() < MinimumDistinctCharacters
            ? $"is too repetitive: it needs at least {MinimumDistinctCharacters} different characters. Use a random value."
            : null;
    }
}
