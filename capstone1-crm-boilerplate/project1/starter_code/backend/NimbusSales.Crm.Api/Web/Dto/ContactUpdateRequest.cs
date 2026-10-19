using System.ComponentModel.DataAnnotations;

namespace NimbusSales.Crm.Web.Dto;

public class ContactUpdateRequest
{
    [Required(ErrorMessage = "firstName is required")]
    [StringLength(80, ErrorMessage = "firstName must be 80 characters or fewer")]
    public string? FirstName { get; set; }

    [Required(ErrorMessage = "lastName is required")]
    [StringLength(80, ErrorMessage = "lastName must be 80 characters or fewer")]
    public string? LastName { get; set; }

    [Required(ErrorMessage = "email is required")]
    [EmailAddress(ErrorMessage = "email must be a valid email address")]
    [StringLength(160, ErrorMessage = "email must be 160 characters or fewer")]
    public string? Email { get; set; }

    [StringLength(40, ErrorMessage = "phone must be 40 characters or fewer")]
    public string? Phone { get; set; }

    [StringLength(120, ErrorMessage = "jobTitle must be 120 characters or fewer")]
    public string? JobTitle { get; set; }

    /// <summary>PROSPECT, CUSTOMER or CHURNED. Left alone when omitted.</summary>
    public string? Status { get; set; }
}
