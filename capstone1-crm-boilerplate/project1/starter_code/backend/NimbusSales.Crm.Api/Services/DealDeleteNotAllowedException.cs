namespace NimbusSales.Crm.Services;

/// <summary>Only a deal that has not got anywhere yet can be deleted.</summary>
public class DealDeleteNotAllowedException : Exception
{
    public DealDeleteNotAllowedException(string dealRef, string stage)
        : base($"Deal {dealRef} is in {stage} and cannot be deleted. Only PROSPECTING deals can be deleted; move it to LOST instead")
    {
    }
}
