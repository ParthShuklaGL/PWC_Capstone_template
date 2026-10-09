using NimbusCrm.Domain.Entities;
using NimbusCrm.Domain.Enums;

namespace NimbusCrm.Application.Auth;

/// <summary>What the API shows about a user. There is deliberately no password field.</summary>
public sealed record UserDto(long Id, string Username, string Email, string Role, bool IsActive, DateTime CreatedAt)
{
    public static UserDto From(User user) =>
        new(user.Id, user.Username, user.Email, RoleNames.For(user.Role), user.IsActive, user.CreatedAt);
}

public static class RoleNames
{
    public const string User = "USER";
    public const string Admin = "ADMIN";

    public static string For(UserRole role) => role switch
    {
        UserRole.Admin => Admin,
        _ => User,
    };
}
