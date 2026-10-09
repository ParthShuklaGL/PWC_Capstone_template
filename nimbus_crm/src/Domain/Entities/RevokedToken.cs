namespace NimbusCrm.Domain.Entities;

/// <summary>
/// A JWT or auth cookie that was signed out before it expired. Kept in the database, not in memory,
/// so a restart or a second API instance does not bring a signed-out credential back to life. A row
/// is only useful until <see cref="ExpiresAt"/>, after which a background job deletes it.
/// </summary>
public class RevokedToken
{
    /// <summary>The credential's <c>jti</c> claim.</summary>
    public required string TokenId { get; set; }

    public DateTime ExpiresAt { get; set; }
}
