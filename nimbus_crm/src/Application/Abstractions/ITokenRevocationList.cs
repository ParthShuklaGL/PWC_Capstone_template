namespace NimbusCrm.Application.Abstractions;

/// <summary>
/// Credentials that were signed out before they expired. A JWT or an auth cookie is stateless, so
/// signing out means remembering its id until it would have expired anyway. Stored in the database,
/// so the memory survives a restart and is shared by every API instance.
/// </summary>
public interface ITokenRevocationList
{
    ValueTask RevokeAsync(string tokenId, DateTimeOffset expiresAt, CancellationToken cancellationToken);

    ValueTask<bool> IsRevokedAsync(string tokenId, CancellationToken cancellationToken);
}
