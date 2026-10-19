namespace NimbusSales.Crm.Services;

/// <summary>The pipeline does not allow this move. Carries the reason, in words.</summary>
public class DealStageTransitionException : Exception
{
    public DealStageTransitionException(string message)
        : base(message)
    {
    }
}
