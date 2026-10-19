using System.ComponentModel.DataAnnotations;

namespace NimbusSales.Crm.Web.Dto;

public class DealUpdateRequest
{
    [Required(ErrorMessage = "title is required")]
    [StringLength(200, ErrorMessage = "title must be 200 characters or fewer")]
    public string? Title { get; set; }

    [Required(ErrorMessage = "value is required")]
    [Range(typeof(decimal), "0.01", "1000000000", ErrorMessage = "value must be greater than zero",
        ParseLimitsInInvariantCulture = true, ConvertValueInInvariantCulture = true)]
    public decimal? Value { get; set; }

    [Required(ErrorMessage = "expectedCloseDate is required")]
    public DateOnly? ExpectedCloseDate { get; set; }
}
