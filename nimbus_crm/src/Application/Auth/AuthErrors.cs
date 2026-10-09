using NimbusCrm.Application.Common;

namespace NimbusCrm.Application.Auth;

public static class AuthErrors
{
    public static readonly Error UsernameTaken =
        new("USERNAME_TAKEN", "That username is already taken.", ErrorType.Conflict);

    public static readonly Error EmailTaken =
        new("EMAIL_TAKEN", "That email is already registered.", ErrorType.Conflict);

    /// <summary>One message for every login failure, so it cannot be used to find usernames.</summary>
    public static readonly Error InvalidCredentials =
        new("INVALID_CREDENTIALS", "Invalid username or password.", ErrorType.Unauthorized);
}
