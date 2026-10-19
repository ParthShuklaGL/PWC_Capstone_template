using System.ComponentModel.DataAnnotations;

namespace NimbusSales.Crm.Web.Dto;

public class DealStageRequest
{
    /// <summary>PROSPECTING, QUALIFIED, PROPOSAL, NEGOTIATION, WON or LOST.</summary>
    [Required(ErrorMessage = "stage is required")]
    public string? Stage { get; set; }

    /// <summary>Required when the deal is won. A calendar date, yyyy-MM-dd.</summary>
    public DateOnly? CloseDate { get; set; }

    /// <summary>Required when the deal is lost.</summary>
    [StringLength(500, ErrorMessage = "lostReason must be 500 characters or fewer")]
    public string? LostReason { get; set; }
}
