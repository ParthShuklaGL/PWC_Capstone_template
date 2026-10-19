namespace NimbusSales.Crm.Services;

/// <summary>
/// A business rule on the input, as opposed to its shape. Answers in the same
/// <c>VALIDATION_FAILED</c> shape as a failed request body, keyed by property name.
/// </summary>
public class DealValidationException : Exception
{
    public DealValidationException(string field, string message)
        : base(message)
    {
        Fields = new Dictionary<string, string> { [field] = message };
    }

    public IReadOnlyDictionary<string, string> Fields { get; }
}
