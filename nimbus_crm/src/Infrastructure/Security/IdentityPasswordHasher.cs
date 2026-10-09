using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using NimbusCrm.Application.Abstractions;
using NimbusCrm.Domain.Entities;

namespace NimbusCrm.Infrastructure.Security;

/// <summary>
/// Password hashing by ASP.NET Core Identity's <see cref="PasswordHasher{TUser}"/>: PBKDF2-HMAC-SHA512
/// with a per-password salt. The work factor is <see cref="IterationCount"/>; a hash made with fewer
/// iterations still verifies, and is reported as needing a rehash so the login can upgrade it.
/// Nothing here is a custom algorithm.
/// </summary>
public sealed class IdentityPasswordHasher : IPasswordHasher
{
    /// <summary>OWASP's Password Storage Cheat Sheet gives 220,000 for PBKDF2-HMAC-SHA512 (checked 2026-10-08).</summary>
    public const int IterationCount = 220_000;

    // The hasher never reads the user; it only needs an instance to satisfy its signature.
    private static readonly User Anonymous = new()
    {
        Username = string.Empty,
        Email = string.Empty,
        PasswordHash = string.Empty,
    };

    private readonly PasswordHasher<User> _hasher;
    private readonly string _decoyHash;

    public IdentityPasswordHasher()
        : this(IterationCount)
    {
    }

    /// <summary>For tests that need a deliberately weaker hash. Production uses the default.</summary>
    public IdentityPasswordHasher(int iterationCount)
    {
        _hasher = new PasswordHasher<User>(Options.Create(new PasswordHasherOptions { IterationCount = iterationCount }));
        _decoyHash = _hasher.HashPassword(Anonymous, Guid.NewGuid().ToString("N"));
    }

    public string Hash(string password) => _hasher.HashPassword(Anonymous, password);

    public PasswordCheck Verify(string? hash, string password)
    {
        var result = _hasher.VerifyHashedPassword(Anonymous, hash ?? _decoyHash, password);
        if (hash is null)
        {
            return PasswordCheck.Failed;
        }

        return result switch
        {
            PasswordVerificationResult.Success => PasswordCheck.Success,
            PasswordVerificationResult.SuccessRehashNeeded => PasswordCheck.SuccessRehashNeeded,
            _ => PasswordCheck.Failed,
        };
    }
}
