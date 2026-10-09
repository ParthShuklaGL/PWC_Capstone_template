using NimbusCrm.Domain.Enums;

namespace NimbusCrm.Domain.Entities;

/// <summary>A call, email, meeting or note a user logged against a contact.</summary>
public class Activity
{
    public long Id { get; set; }

    public long ContactId { get; set; }

    public Contact? Contact { get; set; }

    /// <summary>The user who logged it.</summary>
    public long UserId { get; set; }

    public User? User { get; set; }

    public ActivityType Type { get; set; }

    public required string Subject { get; set; }

    public string? Notes { get; set; }

    public DateTime OccurredAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
