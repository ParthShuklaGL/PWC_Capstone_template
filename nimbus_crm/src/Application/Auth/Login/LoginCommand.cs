using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;
using NimbusCrm.Application.Abstractions;
using NimbusCrm.Application.Common;

namespace NimbusCrm.Application.Auth.Login;

/// <summary>Checks a username and password. How the login is remembered is the API's business.</summary>
public sealed record LoginCommand(string Username, string Password) : ICommand<Result<UserDto>>;

public sealed class LoginCommandValidator : AbstractValidator<LoginCommand>
{
    public LoginCommandValidator()
    {
        RuleFor(command => command.Username).NotEmpty().MaximumLength(50);
        RuleFor(command => command.Password).NotEmpty().MaximumLength(100);
    }
}

public sealed class LoginCommandHandler(
    IApplicationDbContext db,
    IPasswordHasher hasher,
    LockoutPolicy lockout,
    TimeProvider clock) : ICommandHandler<LoginCommand, Result<UserDto>>
{
    public async ValueTask<Result<UserDto>> Handle(LoginCommand command, CancellationToken cancellationToken)
    {
        var username = command.Username.Trim();
        var now = clock.GetUtcNow().UtcDateTime;

        // Tracked on purpose: a wrong password, a lockout and a hash upgrade all write to this row.
        var user = await db.Users.FirstOrDefaultAsync(candidate => candidate.Username == username, cancellationToken);

        // Verify even when there is no such user, or the account is locked, so timing does not
        // reveal which usernames exist or which are locked.
        var check = hasher.Verify(user?.PasswordHash, command.Password);

        if (user is null || user.LockoutEndsAt > now)
        {
            return AuthErrors.InvalidCredentials;
        }

        if (check == PasswordCheck.Failed)
        {
            user.FailedLoginAttempts++;
            if (user.FailedLoginAttempts >= lockout.MaxFailedAttempts)
            {
                user.LockoutEndsAt = now + lockout.Duration;
                user.FailedLoginAttempts = 0;
            }

            await db.SaveChangesAsync(cancellationToken);
            return AuthErrors.InvalidCredentials;
        }

        if (!user.IsActive)
        {
            return AuthErrors.InvalidCredentials;
        }

        if (check == PasswordCheck.SuccessRehashNeeded
            || user.FailedLoginAttempts != 0
            || user.LockoutEndsAt is not null)
        {
            if (check == PasswordCheck.SuccessRehashNeeded)
            {
                user.PasswordHash = hasher.Hash(command.Password);
            }

            user.FailedLoginAttempts = 0;
            user.LockoutEndsAt = null;
            await db.SaveChangesAsync(cancellationToken);
        }

        return UserDto.From(user);
    }
}
