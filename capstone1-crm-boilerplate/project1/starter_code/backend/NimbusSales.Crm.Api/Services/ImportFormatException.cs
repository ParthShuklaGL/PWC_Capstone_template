namespace NimbusSales.Crm.Services;

public class ImportFormatException : Exception
{
    public ImportFormatException(string message)
        : base(message)
    {
    }
}
