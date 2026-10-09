namespace NimbusCrm.Application.Abstractions;

/// <summary>
/// The check every JWT, auth cookie and session passes on every request, after its signature or
/// ticket has been accepted. A credential stays useful only while its user exists, is active, still
/// has the role it was issued with, and the credential itself has not been signed out.
/// </summary>
public interface ICredentialValidator
{
    /// <param name="tokenId">The credential's id, or null for a session (which is destroyed on sign-out instead).</param>
    ValueTask<bool> IsValidAsync(long userId, string role, string? tokenId, CancellationToken cancellationToken);
}
