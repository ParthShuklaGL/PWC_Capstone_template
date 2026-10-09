using System.Globalization;
using System.Text;

namespace NimbusCrm.Api.Endpoints;

/// <summary>
/// One CSV cell. Text is quoted and defused when it needs it; a number is written as is, so a
/// negative value stays a number instead of being mistaken for a formula.
/// </summary>
public readonly record struct CsvValue(string Text, bool IsNumber)
{
    public static implicit operator CsvValue(string text) => new(text, false);
}

/// <summary>RFC 4180 CSV: comma separated, CRLF line ends, quotes doubled, UTF-8.</summary>
public static class CsvWriter
{
    public const string ContentType = "text/csv; charset=utf-8";

    public static string Write(IReadOnlyList<string> headers, IEnumerable<IReadOnlyList<CsvValue>> rows)
    {
        var builder = new StringBuilder();
        AppendLine(builder, headers.Select(header => Cell(header)));
        foreach (var row in rows)
        {
            AppendLine(builder, row.Select(Render));
        }

        return builder.ToString();
    }

    /// <summary>Money and counts use the invariant culture, so the file reads the same on every machine.</summary>
    public static CsvValue Number(decimal value) => new(value.ToString("0.00", CultureInfo.InvariantCulture), true);

    public static CsvValue Number(int value) => new(value.ToString(CultureInfo.InvariantCulture), true);

    public static CsvValue Number(long value) => new(value.ToString(CultureInfo.InvariantCulture), true);

    /// <summary>
    /// Quotes a text cell when it needs it. Text that starts with = + - @ or a control character gets a
    /// leading apostrophe, so a spreadsheet shows it as text instead of running it as a formula.
    /// </summary>
    public static string Cell(string value)
    {
        var text = value;
        if (text.Length > 0 && text[0] is '=' or '+' or '-' or '@' or '\t' or '\r')
        {
            text = "'" + text;
        }

        var needsQuotes = text.AsSpan().IndexOfAny(",\"\r\n") >= 0 || text != value;
        return needsQuotes ? "\"" + text.Replace("\"", "\"\"", StringComparison.Ordinal) + "\"" : text;
    }

    private static string Render(CsvValue value) => value.IsNumber ? value.Text : Cell(value.Text);

    private static void AppendLine(StringBuilder builder, IEnumerable<string> cells)
    {
        builder.AppendJoin(',', cells);
        builder.Append("\r\n");
    }
}
