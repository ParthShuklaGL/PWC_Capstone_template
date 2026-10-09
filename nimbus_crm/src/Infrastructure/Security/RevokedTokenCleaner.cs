using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using NimbusCrm.Application.Abstractions;

namespace NimbusCrm.Infrastructure.Security;

/// <summary>Deletes revoked-credential rows that have expired; after expiry a credential is dead anyway.</summary>
public sealed class RevokedTokenCleaner(
    IServiceScopeFactory scopeFactory,
    TimeProvider clock,
    ILogger<RevokedTokenCleaner> logger) : BackgroundService
{
    public static readonly TimeSpan Interval = TimeSpan.FromHours(1);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(Interval);
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            await DeleteExpiredAsync(stoppingToken);
        }
    }

    /// <summary>Returns how many rows were deleted. A failure is logged and retried at the next tick, never fatal.</summary>
    public async Task<int> DeleteExpiredAsync(CancellationToken cancellationToken)
    {
        try
        {
            await using var scope = scopeFactory.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
            var now = clock.GetUtcNow().UtcDateTime;

            var deleted = await db.RevokedTokens
                .Where(token => token.ExpiresAt < now)
                .ExecuteDeleteAsync(cancellationToken);

            if (deleted > 0)
            {
                logger.LogInformation("Removed {Count} expired revoked-credential rows", deleted);
            }

            return deleted;
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            logger.LogWarning(exception, "Could not remove expired revoked-credential rows; will retry");
            return 0;
        }
    }
}
