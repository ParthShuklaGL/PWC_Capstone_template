namespace NimbusCrm.Api.Auth;

public static class AuthModeParser
{
    /// <summary>
    /// Accepts the names Jwt, Cookie and Session, in any case. <c>Enum.TryParse</c> on its own also
    /// accepts numbers, including ones that name no mode ("99"), so those are refused here.
    /// </summary>
    public static bool TryParse(string? text, out AuthMode mode)
    {
        mode = default;
        var trimmed = text?.Trim();

        if (string.IsNullOrEmpty(trimmed) || trimmed.Any(character => !char.IsLetter(character)))
        {
            return false;
        }

        return Enum.TryParse(trimmed, ignoreCase: true, out mode) && Enum.IsDefined(mode);
    }
}
