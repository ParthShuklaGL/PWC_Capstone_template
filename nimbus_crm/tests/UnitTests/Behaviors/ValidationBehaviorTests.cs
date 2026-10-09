using FluentValidation;
using Mediator;
using NimbusCrm.Application.Behaviors;

namespace NimbusCrm.UnitTests.Behaviors;

public class ValidationBehaviorTests
{
    private sealed record SampleCommand(string Name, int Quantity) : IRequest<string>;

    private sealed class SampleCommandValidator : AbstractValidator<SampleCommand>
    {
        public SampleCommandValidator()
        {
            RuleFor(command => command.Name).NotEmpty().WithMessage("Name is required.");
            RuleFor(command => command.Quantity).GreaterThan(0).WithMessage("Quantity must be positive.");
        }
    }

    private static ValueTask<string> Handler(SampleCommand command, CancellationToken cancellationToken) =>
        ValueTask.FromResult("handled");

    [Fact]
    public async Task HandleCallsTheHandlerWhenTheMessageIsValid()
    {
        var behavior = new ValidationBehavior<SampleCommand, string>([new SampleCommandValidator()]);

        var response = await behavior.Handle(
            new SampleCommand("Widget", 2), Handler, CancellationToken.None);

        Assert.Equal("handled", response);
    }

    [Fact]
    public async Task HandleThrowsWithOneFailurePerInvalidField()
    {
        var behavior = new ValidationBehavior<SampleCommand, string>([new SampleCommandValidator()]);

        var thrown = await Assert.ThrowsAsync<ValidationException>(() => behavior.Handle(
            new SampleCommand("", 0), Handler, CancellationToken.None).AsTask());

        Assert.Equal(
            ["Name", "Quantity"],
            thrown.Errors.Select(failure => failure.PropertyName).Order());
    }

    [Fact]
    public async Task HandleDoesNotCallTheHandlerWhenTheMessageIsInvalid()
    {
        var behavior = new ValidationBehavior<SampleCommand, string>([new SampleCommandValidator()]);
        var called = false;

        await Assert.ThrowsAsync<ValidationException>(() => behavior.Handle(
            new SampleCommand("", 1),
            (command, token) => { called = true; return ValueTask.FromResult("handled"); },
            CancellationToken.None).AsTask());

        Assert.False(called);
    }

    [Fact]
    public async Task HandlePassesThroughWhenNoValidatorIsRegistered()
    {
        var behavior = new ValidationBehavior<SampleCommand, string>([]);

        var response = await behavior.Handle(
            new SampleCommand("", 0), Handler, CancellationToken.None);

        Assert.Equal("handled", response);
    }
}
