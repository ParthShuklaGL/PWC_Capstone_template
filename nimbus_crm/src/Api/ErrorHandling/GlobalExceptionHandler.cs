using FluentValidation;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using NimbusCrm.Infrastructure.Persistence;

namespace NimbusCrm.Api.ErrorHandling;

/// <summary>
/// Turns every exception that reaches the pipeline into an RFC 9457 problem document.
/// Validation failures become a 400 with field-level errors, a duplicate-key failure from the
/// database (two requests racing to create the same username, say) becomes a 409, and anything
/// else becomes a 500 that says nothing about the cause; the cause goes to the log, not the client.
/// </summary>
public sealed class GlobalExceptionHandler(
    IProblemDetailsService problemDetailsService,
    ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        ProblemDetails problem;

        if (exception is ValidationException validation)
        {
            var errors = validation.Errors
                .GroupBy(failure => failure.PropertyName)
                .ToDictionary(
                    group => group.Key,
                    group => group.Select(failure => failure.ErrorMessage).Distinct().ToArray());

            httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            problem = new HttpValidationProblemDetails(errors)
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "One or more validation errors occurred.",
            };
        }
        else if (DuplicateKey.Matches(exception))
        {
            httpContext.Response.StatusCode = StatusCodes.Status409Conflict;
            problem = new ProblemDetails
            {
                Status = StatusCodes.Status409Conflict,
                Title = "That value already exists.",
                Extensions = { ["code"] = "DUPLICATE_VALUE" },
            };
        }
        else
        {
            logger.LogError(exception, "Unhandled exception for {Method} {Path}",
                httpContext.Request.Method, httpContext.Request.Path);

            httpContext.Response.StatusCode = StatusCodes.Status500InternalServerError;
            problem = new ProblemDetails
            {
                Status = StatusCodes.Status500InternalServerError,
                Title = "An unexpected error occurred.",
            };
        }

        return await problemDetailsService.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            Exception = exception,
            ProblemDetails = problem,
        });
    }
}
