namespace NimbusCrm.Api.Endpoints;

/// <summary>
/// Tells browsers and proxies never to keep a copy of the response. Used for everything that carries
/// a token, a cookie-setting login or business data (RFC 6749 requires it for token responses).
/// </summary>
public sealed class NoStoreEndpointFilter : IEndpointFilter
{
    public ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        context.HttpContext.Response.Headers.CacheControl = "no-store";
        return next(context);
    }
}
