using System.ComponentModel.DataAnnotations;

namespace NimbusSales.Crm.Web.Dto;

public class DealCreateRequest
{
    [Required(ErrorMessage = "title is required")]
    [StringLength(200, ErrorMessage = "title must be 200 characters or fewer")]
    public string? Title { get; set; }

    [Required(ErrorMessage = "accountRef is required")]
    public string? AccountRef { get; set; }

    /// <summary>The person at the account who is driving the deal.</summary>
    [Required(ErrorMessage = "contactRef is required")]
    public string? ContactRef { get; set; }

    /// <summary>GBP.</summary>
    [Required(ErrorMessage = "value is required")]
    [Range(typeof(decimal), "0.01", "1000000000", ErrorMessage = "value must be greater than zero",
        ParseLimitsInInvariantCulture = true, ConvertValueInInvariantCulture = true)]
    public decimal? Value { get; set; }

    /// <summary>A calendar date, yyyy-MM-dd. Not in the past.</summary>
    [Required(ErrorMessage = "expectedCloseDate is required")]
    public DateOnly? ExpectedCloseDate { get; set; }
}
