using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace NimbusSales.Crm.Web;

/// <summary>
/// The house shape for a failed request body: an "error" code plus a "fields" map of the
/// offending property to the message a user could act on.
///
/// <para>Model validation never reaches an <c>IExceptionHandler</c> - the framework
/// short-circuits before the action runs - so this is wired in as the
/// InvalidModelStateResponseFactory in Program.cs rather than living with the two
/// exception handlers.</para>
/// </summary>
public static class CrmValidationResponse
{
    public static IActionResult From(ActionContext context)
    {
        var fields = new Dictionary<string, string>();

        foreach (var entry in context.ModelState)
        {
            if (entry.Value.ValidationState != ModelValidationState.Invalid)
            {
                continue;
            }

            var message = entry.Value.Errors.FirstOrDefault()?.ErrorMessage;
            if (string.IsNullOrEmpty(message))
            {
                continue;
            }

            var name = WireName(entry.Key);
            if (!fields.ContainsKey(name))
            {
                fields[name] = message;
            }
        }

        return new BadRequestObjectResult(new Dictionary<string, object>
        {
            ["error"] = "VALIDATION_FAILED",
            ["fields"] = fields
        });
    }

    /// <summary>
    /// Model state keys arrive as the CLR property name, and sometimes with a JSON path
    /// prefix. The client sees camelCase property names, so that is what it is told about.
    /// </summary>
    private static string WireName(string key)
    {
        var name = key.StartsWith("$.") ? key[2..] : key;
        if (name.Length == 0)
        {
            return name;
        }
        return char.ToLowerInvariant(name[0]) + name[1..];
    }
}
