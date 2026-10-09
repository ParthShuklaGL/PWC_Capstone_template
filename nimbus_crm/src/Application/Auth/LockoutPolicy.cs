namespace NimbusCrm.Application.Auth;

/// <summary>After this many wrong passwords in a row an account refuses sign-ins for the lockout duration.</summary>
public sealed record LockoutPolicy(int MaxFailedAttempts, TimeSpan Duration);
