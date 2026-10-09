using Microsoft.AspNetCore.Antiforgery;
using Microsoft.Extensions.Options;

namespace NimbusCrm.Api.Auth;

/// <summary>
/// CSRF protection for credentials a browser sends on its own: the auth cookie and the session
/// cookie. A state-changing request that was authenticated by either must carry the anti-forgery
/// token in the X-CSRF-TOKEN header (get one from GET /api/auth/csrf). A Bearer request needs no
/// token: a forged cross-site request cannot set an Authorization header.
/// </summary>
public sealed class CsrfEndpointFilter(IAntiforgery antiforgery, IOptions<AuthOptions> options) : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        var http = context.HttpContext;

        if (!IsSafeMethod(http.Request.Method) && http.User.Identity?.IsAuthenticated == true)
        {
            var scheme = AuthSchemes.Select(http, options.Value.DefaultMode);
            if (scheme is AuthSchemes.Cookies or AuthSchemes.Session
                && !await antiforgery.IsRequestValidAsync(http))
            {
                return Results.Problem(
                    statusCode: StatusCodes.Status403Forbidden,
                    title: "Invalid or missing CSRF token.",
                    detail: "Fetch a token from GET /api/auth/csrf and send it in the X-CSRF-TOKEN header.",
                    extensions: new Dictionary<string, object?> { ["code"] = "CSRF_TOKEN_INVALID" });
            }
        }

        return await next(context);
    }

    private static bool IsSafeMethod(string method) =>
        HttpMethods.IsGet(method) || HttpMethods.IsHead(method)
        || HttpMethods.IsOptions(method) || HttpMethods.IsTrace(method);
}
