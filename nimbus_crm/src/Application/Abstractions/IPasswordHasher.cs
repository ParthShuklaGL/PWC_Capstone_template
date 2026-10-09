namespace NimbusCrm.Application.Abstractions;

public enum PasswordCheck
{
    Failed,
    Success,

    /// <summary>The password is right but the stored hash is weaker than today's setting; store a new one.</summary>
    SuccessRehashNeeded,
}

public interface IPasswordHasher
{
    string Hash(string password);

    /// <summary>
    /// Checks a password against a stored hash. When <paramref name="hash"/> is null (no such
    /// user) it still does the same amount of work, so response time does not reveal whether
    /// a username exists.
    /// </summary>
    PasswordCheck Verify(string? hash, string password);
}
