using Microsoft.AspNetCore.Diagnostics;
using NimbusSales.Crm.Services;

namespace NimbusSales.Crm.Web;

/// <summary>Errors raised while reading an uploaded lead file.</summary>
public class ImportExceptionHandler : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        if (exception is ImportFormatException importFormat)
        {
            httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            await httpContext.Response.WriteAsJsonAsync(
                new Dictionary<string, object>
                {
                    ["error"] = "IMPORT_FORMAT_INVALID",
                    ["message"] = importFormat.Message
                },
                cancellationToken);
            return true;
        }

        return false;
    }
}
