namespace NimbusSales.Crm.Domain;

public static class UserRoles
{
    public const string Admin = "ADMIN";
    public const string User = "USER";
}

/// <summary>A person who can sign in. ADMIN manages data; USER is a sales rep.</summary>
public class AppUser
{
    private AppUser() { }

    public AppUser(string userRef, string email, string displayName, string passwordHash, string role)
    {
        UserRef = userRef;
        Email = email;
        DisplayName = displayName;
        PasswordHash = passwordHash;
        Role = role;
        CreatedAt = DateTimeOffset.UtcNow;
    }

    public long Id { get; private set; }

    public string UserRef { get; private set; } = string.Empty;

    public string Email { get; private set; } = string.Empty;

    public string DisplayName { get; private set; } = string.Empty;

    public string PasswordHash { get; private set; } = string.Empty;

    public string Role { get; private set; } = UserRoles.User;

    public DateTimeOffset CreatedAt { get; private set; }
}
