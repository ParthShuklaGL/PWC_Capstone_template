namespace NimbusSales.Crm.Services;

public interface IContactImportService
{
    Task<string> ImportCsvAsync(string csv, CancellationToken ct = default);
}
