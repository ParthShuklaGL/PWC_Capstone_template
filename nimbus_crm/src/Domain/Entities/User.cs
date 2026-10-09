using NimbusCrm.Domain.Enums;

namespace NimbusCrm.Domain.Entities;

public class User
{
    public long Id { get; set; }

    public required string Username { get; set; }

    public required string Email { get; set; }

    public required string PasswordHash { get; set; }

    public UserRole Role { get; set; } = UserRole.User;

    public bool IsActive { get; set; } = true;

    /// <summary>Wrong passwords since the last good sign-in. Reset on success and when a lockout starts.</summary>
    public int FailedLoginAttempts { get; set; }

    /// <summary>While this is in the future the account refuses every sign-in, whatever the password.</summary>
    public DateTime? LockoutEndsAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
