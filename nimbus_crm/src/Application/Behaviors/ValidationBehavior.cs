using FluentValidation;
using Mediator;

namespace NimbusCrm.Application.Behaviors;

/// <summary>
/// Runs every FluentValidation validator registered for the message before its handler.
/// A failure throws <see cref="ValidationException"/>; the API's exception handler turns
/// that into a 400 problem document. Messages with no validator pass straight through.
/// </summary>
public sealed class ValidationBehavior<TMessage, TResponse>(IEnumerable<IValidator<TMessage>> validators)
    : IPipelineBehavior<TMessage, TResponse>
    where TMessage : IMessage
{
    public async ValueTask<TResponse> Handle(
        TMessage message,
        MessageHandlerDelegate<TMessage, TResponse> next,
        CancellationToken cancellationToken)
    {
        var validatorList = validators.ToList();
        if (validatorList.Count == 0)
        {
            return await next(message, cancellationToken);
        }

        var context = new ValidationContext<TMessage>(message);
        var results = await Task.WhenAll(
            validatorList.Select(validator => validator.ValidateAsync(context, cancellationToken)));

        var failures = results.SelectMany(result => result.Errors).ToList();
        if (failures.Count > 0)
        {
            throw new ValidationException(failures);
        }

        return await next(message, cancellationToken);
    }
}
