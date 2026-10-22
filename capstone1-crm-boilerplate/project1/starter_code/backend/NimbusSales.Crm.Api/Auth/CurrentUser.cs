using System.Security.Claims;
using NimbusSales.Crm.Domain;

namespace NimbusSales.Crm.Auth;

/// <summary>Who is calling, read from the validated token.</summary>
public interface ICurrentUser
{
    long Id { get; }

    string UserRef { get; }

    string Role { get; }

    bool IsAdmin { get; }
}

public class CurrentUser : ICurrentUser
{
    public const string UidClaim = "uid";
    public const string NameClaim = "name";
    public const string RoleClaim = "role";

    private readonly ClaimsPrincipal _principal;

    public CurrentUser(IHttpContextAccessor accessor)
    {
        _principal = accessor.HttpContext?.User ?? new ClaimsPrincipal();
    }

    public long Id => long.TryParse(_principal.FindFirstValue(UidClaim), out var id) ? id : 0;

    public string UserRef => _principal.FindFirstValue("sub") ?? string.Empty;

    public string Role => _principal.FindFirstValue(RoleClaim) ?? string.Empty;

    public bool IsAdmin => Role == UserRoles.Admin;
}
