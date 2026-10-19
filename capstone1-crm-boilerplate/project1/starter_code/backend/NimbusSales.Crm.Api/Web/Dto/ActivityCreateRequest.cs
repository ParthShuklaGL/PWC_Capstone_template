using System.ComponentModel.DataAnnotations;

namespace NimbusSales.Crm.Web.Dto;

public class ActivityCreateRequest
{
    /// <summary>CALL, EMAIL, MEETING or NOTE.</summary>
    [Required(ErrorMessage = "type is required")]
    public string? Type { get; set; }

    [Required(ErrorMessage = "subject is required")]
    [StringLength(200, ErrorMessage = "subject must be 200 characters or fewer")]
    public string? Subject { get; set; }

    [StringLength(2000, ErrorMessage = "notes must be 2000 characters or fewer")]
    public string? Notes { get; set; }

    /// <summary>Defaults to now when omitted.</summary>
    public DateTimeOffset? OccurredAt { get; set; }
}
