using NimbusCrm.Application.Auth;

namespace NimbusCrm.Api.Contracts;

public sealed record RegisterRequest(string Username, string Email, string Password);

/// <param name="Mode">Jwt, Cookie or Session. Omit it to use the mode set in configuration.</param>
public sealed record LoginRequest(string Username, string Password, string? Mode);

/// <summary>AccessToken is only present for the Jwt mode; the other modes hold the login in a cookie.</summary>
public sealed record LoginResponse(UserDto User, string Mode, string? AccessToken, DateTimeOffset? ExpiresAt);

public sealed record MeResponse(long Id, string Username, string Role, string AuthenticatedVia);

public sealed record CsrfResponse(string HeaderName, string Token);
