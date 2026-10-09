using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using NimbusCrm.Application.Abstractions;
using NimbusCrm.Application.Auth;

namespace NimbusCrm.Infrastructure.Security;

/// <summary>
/// Looks up the user behind a credential and refuses it if the user is gone, deactivated or now has a
/// different role, or if the credential was signed out. The user lookup is cached for
/// <see cref="UserCacheSeconds"/>, so a deactivation or role change takes effect within that time
/// without a database query on every request.
/// </summary>
public sealed class CredentialValidator(
    IServiceScopeFactory scopeFactory,
    IMemoryCache cache,
    ITokenRevocationList revocations) : ICredentialValidator
{
    public const int UserCacheSeconds = 30;

    private sealed record UserState(bool IsActive, string Role);

    public async ValueTask<bool> IsValidAsync(
        long userId, string role, string? tokenId, CancellationToken cancellationToken)
    {
        if (tokenId is not null && await revocations.IsRevokedAsync(tokenId, cancellationToken))
        {
            return false;
        }

        var state = await GetStateAsync(userId, cancellationToken);
        return state is { IsActive: true } && state.Role == role;
    }

    private async ValueTask<UserState?> GetStateAsync(long userId, CancellationToken cancellationToken)
    {
        var key = "user-state:" + userId;
        if (cache.TryGetValue(key, out UserState? cached))
        {
            return cached;
        }

        await using var scope = scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();

        var found = await db.Users
            .AsNoTracking()
            .Where(user => user.Id == userId)
            .Select(user => new { user.IsActive, user.Role })
            .FirstOrDefaultAsync(cancellationToken);

        var state = found is null ? null : new UserState(found.IsActive, RoleNames.For(found.Role));
        cache.Set(key, state, TimeSpan.FromSeconds(UserCacheSeconds));
        return state;
    }
}
