using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;
using NimbusCrm.Application.Abstractions;
using NimbusCrm.Application.Common;
using NimbusCrm.Domain.Entities;
using NimbusCrm.Domain.Enums;

namespace NimbusCrm.Application.Auth.Register;

public sealed record RegisterCommand(string Username, string Email, string Password) : ICommand<Result<UserDto>>;

public sealed class RegisterCommandValidator : AbstractValidator<RegisterCommand>
{
    public RegisterCommandValidator()
    {
        RuleFor(command => command.Username)
            .NotEmpty()
            .Length(3, 50)
            .Matches("^[A-Za-z0-9_.-]+$").WithMessage("Username may contain letters, digits, '.', '_' and '-' only.");

        RuleFor(command => command.Email)
            .NotEmpty()
            .MaximumLength(160)
            .EmailAddress();

        RuleFor(command => command.Password)
            .NotEmpty()
            .MinimumLength(10).WithMessage("Password must be at least 10 characters.")
            .MaximumLength(100);
    }
}

public sealed class RegisterCommandHandler(IApplicationDbContext db, IPasswordHasher hasher)
    : ICommandHandler<RegisterCommand, Result<UserDto>>
{
    public async ValueTask<Result<UserDto>> Handle(RegisterCommand command, CancellationToken cancellationToken)
    {
        var username = command.Username.Trim();
        var email = command.Email.Trim();

        if (await db.Users.AnyAsync(user => user.Username == username, cancellationToken))
        {
            return AuthErrors.UsernameTaken;
        }

        if (await db.Users.AnyAsync(user => user.Email == email, cancellationToken))
        {
            return AuthErrors.EmailTaken;
        }

        // Self-registration always creates a plain USER. An admin is made by an admin.
        var user = new User
        {
            Username = username,
            Email = email,
            PasswordHash = hasher.Hash(command.Password),
            Role = UserRole.User,
        };

        db.Users.Add(user);
        await db.SaveChangesAsync(cancellationToken);

        return UserDto.From(user);
    }
}
