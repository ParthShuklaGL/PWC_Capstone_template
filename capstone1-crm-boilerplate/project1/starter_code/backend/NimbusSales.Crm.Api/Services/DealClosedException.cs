namespace NimbusSales.Crm.Services;

/// <summary>A Won or Lost deal cannot be edited.</summary>
public class DealClosedException : Exception
{
    public DealClosedException(string dealRef)
        : base($"Deal {dealRef} is closed and cannot be changed")
    {
    }
}
