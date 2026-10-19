namespace NimbusSales.Crm.Services;

public class DealNotFoundException : Exception
{
    public DealNotFoundException(string dealRef)
        : base($"No deal with reference {dealRef}")
    {
    }
}
