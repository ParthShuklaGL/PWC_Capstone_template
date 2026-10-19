using Microsoft.AspNetCore.Diagnostics;
using NimbusSales.Crm.Services;

namespace NimbusSales.Crm.Web;

/// <summary>
/// Errors from the deals area. A third handler, split by area like the other two, rather
/// than more branches inside <see cref="CrmExceptionHandler"/>. A missing contact or account
/// met while creating a deal is still answered by that handler.
/// </summary>
public class DealsExceptionHandler : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        switch (exception)
        {
            case DealNotFoundException notFound:
                await WriteAsync(httpContext, StatusCodes.Status404NotFound,
                    "DEAL_NOT_FOUND", notFound.Message, cancellationToken);
                return true;

            case DealStageTransitionException transition:
                await WriteAsync(httpContext, StatusCodes.Status409Conflict,
                    "DEAL_STAGE_TRANSITION_INVALID", transition.Message, cancellationToken);
                return true;

            case DealClosedException closed:
                await WriteAsync(httpContext, StatusCodes.Status409Conflict,
                    "DEAL_CLOSED", closed.Message, cancellationToken);
                return true;

            case DealDeleteNotAllowedException deleteRefused:
                await WriteAsync(httpContext, StatusCodes.Status409Conflict,
                    "DEAL_DELETE_NOT_ALLOWED", deleteRefused.Message, cancellationToken);
                return true;

            case DealValidationException validation:
                httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
                await httpContext.Response.WriteAsJsonAsync(
                    new Dictionary<string, object>
                    {
                        ["error"] = "VALIDATION_FAILED",
                        ["fields"] = validation.Fields
                    },
                    cancellationToken);
                return true;

            default:
                return false;
        }
    }

    private static async Task WriteAsync(HttpContext httpContext, int statusCode, string error,
                                         string message, CancellationToken cancellationToken)
    {
        httpContext.Response.StatusCode = statusCode;
        await httpContext.Response.WriteAsJsonAsync(
            new Dictionary<string, object>
            {
                ["error"] = error,
                ["message"] = message
            },
            cancellationToken);
    }
}
