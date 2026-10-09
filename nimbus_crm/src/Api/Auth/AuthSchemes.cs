namespace NimbusCrm.Api.Auth;

public static class AuthSchemes
{
    /// <summary>The default scheme. It authenticates nothing itself; it forwards to one of the three below.</summary>
    public const string Smart = "Smart";

    public const string Bearer = "Bearer";
    public const string Cookies = "Cookies";
    public const string Session = "Session";

    public const string CookieName = "crm.auth";
    public const string SessionCookieName = "crm.session";

    /// <summary>
    /// Picks the scheme for a request from the credential it carries. A Bearer header wins over the
    /// auth cookie, which wins over the session cookie. With no credential at all, the configured
    /// default mode decides which scheme answers the 401.
    /// </summary>
    public static string Select(HttpContext context, AuthMode defaultMode)
    {
        var header = context.Request.Headers.Authorization.ToString();
        if (header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            return Bearer;
        }

        if (context.Request.Cookies.ContainsKey(CookieName))
        {
            return Cookies;
        }

        if (context.Request.Cookies.ContainsKey(SessionCookieName))
        {
            return Session;
        }

        return ForMode(defaultMode);
    }

    public static string ForMode(AuthMode mode) => mode switch
    {
        AuthMode.Cookie => Cookies,
        AuthMode.Session => Session,
        _ => Bearer,
    };
}
