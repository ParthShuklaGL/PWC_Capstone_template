using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NimbusSales.Crm.Auth;
using NimbusSales.Crm.Domain;
using NimbusSales.Crm.Repositories;
using NimbusSales.Crm.Web.Dto;

namespace NimbusSales.Crm.Web;

[ApiController]
[Route("api/auth")]
[Tags("Auth")]
public class AuthController : ControllerBase
{
    private readonly IUserRepository _users;
    private readonly TokenService _tokens;
    private readonly ICurrentUser _current;

    public AuthController(IUserRepository users, TokenService tokens, ICurrentUser current)
    {
        _users = users;
        _tokens = tokens;
        _current = current;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    [EndpointSummary("Sign in with email and password; returns a bearer token")]
    [ProducesResponseType(typeof(LoginResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken ct)
    {
        var user = await _users.FindByEmailAsync(request.Email!, ct);

        // Same answer for an unknown email and a wrong password, so the API does not say
        // which addresses have accounts.
        if (user is null || !PasswordHasher.Verify(request.Password!, user.PasswordHash))
        {
            return Unauthorized(new Dictionary<string, object>
            {
                ["error"] = "INVALID_CREDENTIALS",
                ["message"] = "Email or password is incorrect."
            });
        }

        var issued = _tokens.Issue(user);
        return Ok(new LoginResponse
        {
            Token = issued.Token,
            ExpiresAt = issued.ExpiresAt,
            User = ToResponse(user)
        });
    }

    [HttpGet("me")]
    [EndpointSummary("Who the bearer token belongs to")]
    [ProducesResponseType(typeof(UserResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<UserResponse>> Me(CancellationToken ct)
    {
        var user = await _users.FindByRefAsync(_current.UserRef, ct);
        return user is null ? Unauthorized() : ToResponse(user);
    }

    internal static UserResponse ToResponse(AppUser user) => new()
    {
        UserRef = user.UserRef,
        DisplayName = user.DisplayName,
        Email = user.Email,
        Role = user.Role
    };
}

[ApiController]
[Route("api/users")]
[Tags("Auth")]
[Authorize(Roles = UserRoles.Admin)]
public class UsersController : ControllerBase
{
    private readonly IUserRepository _users;

    public UsersController(IUserRepository users)
    {
        _users = users;
    }

    [HttpGet]
    [EndpointSummary("Everyone who can sign in, for choosing a deal owner (ADMIN)")]
    [ProducesResponseType(typeof(IReadOnlyList<UserResponse>), StatusCodes.Status200OK)]
    public async Task<IReadOnlyList<UserResponse>> List(CancellationToken ct)
    {
        return (await _users.ListAsync(ct)).Select(AuthController.ToResponse).ToList();
    }
}
