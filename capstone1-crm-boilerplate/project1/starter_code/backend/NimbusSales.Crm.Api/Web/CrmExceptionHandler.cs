using Microsoft.AspNetCore.Diagnostics;
using NimbusSales.Crm.Services;

namespace NimbusSales.Crm.Web;

/// <summary>
/// Errors from the contact and account endpoints.
///
/// <para>The import endpoint has its own handler - see <see cref="ImportExceptionHandler"/>.
/// Two small handlers split by area beat one that knows about everything. Anything this
/// one does not own it declines, and the next handler in the chain gets a look.</para>
/// </summary>
public class CrmExceptionHandler : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        if (exception is ContactNotFoundException contactNotFound)
        {
            await WriteAsync(httpContext, StatusCodes.Status404NotFound,
                "CONTACT_NOT_FOUND", contactNotFound.Message, cancellationToken);
            return true;
        }

        if (exception is AccountNotFoundException accountNotFound)
        {
            await WriteAsync(httpContext, StatusCodes.Status404NotFound,
                "ACCOUNT_NOT_FOUND", accountNotFound.Message, cancellationToken);
            return true;
        }

        return false;
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
