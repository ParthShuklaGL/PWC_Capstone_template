using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using NimbusCrm.Application.Abstractions;
using NimbusCrm.Domain.Entities;

namespace NimbusCrm.Infrastructure.Security;

/// <summary>
/// Signed-out credential ids, kept in the <c>RevokedTokens</c> table so a restart or a second API
/// instance still knows about them. A small in-memory cache sits in front: a revocation is cached
/// for as long as the credential would live, and "not revoked" is cached for
/// <see cref="NotRevokedCacheSeconds"/>, so another instance's sign-out reaches this one within that time.
/// </summary>
public sealed class DatabaseTokenRevocationList(IServiceScopeFactory scopeFactory, IMemoryCache cache, TimeProvider clock)
    : ITokenRevocationList
{
    public const int NotRevokedCacheSeconds = 30;

    public async ValueTask RevokeAsync(string tokenId, DateTimeOffset expiresAt, CancellationToken cancellationToken)
    {
        if (expiresAt <= clock.GetUtcNow())
        {
            return;
        }

        await using var scope = scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();

        if (!await db.RevokedTokens.AnyAsync(token => token.TokenId == tokenId, cancellationToken))
        {
            db.RevokedTokens.Add(new RevokedToken { TokenId = tokenId, ExpiresAt = expiresAt.UtcDateTime });
            await db.SaveChangesAsync(cancellationToken);
        }

        cache.Set(Key(tokenId), true, expiresAt);
    }

    public async ValueTask<bool> IsRevokedAsync(string tokenId, CancellationToken cancellationToken)
    {
        if (cache.TryGetValue(Key(tokenId), out bool revoked))
        {
            return revoked;
        }

        await using var scope = scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();

        var expiresAt = await db.RevokedTokens
            .AsNoTracking()
            .Where(token => token.TokenId == tokenId)
            .Select(token => (DateTime?)token.ExpiresAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (expiresAt is { } until)
        {
            cache.Set(Key(tokenId), true, new DateTimeOffset(DateTime.SpecifyKind(until, DateTimeKind.Utc)));
            return true;
        }

        cache.Set(Key(tokenId), false, TimeSpan.FromSeconds(NotRevokedCacheSeconds));
        return false;
    }

    private static string Key(string tokenId) => "revoked:" + tokenId;
}
