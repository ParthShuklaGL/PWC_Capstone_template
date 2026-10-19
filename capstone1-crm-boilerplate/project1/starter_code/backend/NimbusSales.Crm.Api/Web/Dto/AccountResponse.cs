namespace NimbusSales.Crm.Web.Dto;

public class AccountResponse
{
    public string AccountRef { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string? Industry { get; set; }

    public string? Country { get; set; }

    public string? Website { get; set; }
}
