using System.Text;
using NimbusSales.Crm.Auditing;
using NimbusSales.Crm.Domain;
using NimbusSales.Crm.Repositories;

namespace NimbusSales.Crm.Services;

/// <summary>
/// Bulk import of leads from the CSV files the marketing agency sends over every month.
///
/// <para>Written in a hurry before a trade show and not touched since.</para>
/// </summary>
public class ContactImportService : IContactImportService
{
    private readonly IContactRepository _contacts;
    private readonly IAccountRepository _accounts;
    private readonly CrmAuditLogger _audit;

    public ContactImportService(IContactRepository contacts,
                                IAccountRepository accounts,
                                CrmAuditLogger audit)
    {
        _contacts = contacts;
        _accounts = accounts;
        _audit = audit;
    }

    public async Task<string> ImportCsvAsync(string csv, CancellationToken ct = default)
    {
        var created = 0;
        var skipped = 0;
        var rejected = 0;
        var problems = new List<string>();
        var seenInThisFile = new HashSet<string>();

        if (string.IsNullOrWhiteSpace(csv))
        {
            throw new ImportFormatException("The uploaded file was empty");
        }

        var lines = csv.Replace("\r\n", "\n").Replace("\r", "\n").Split('\n');
        if (lines.Length < 2)
        {
            throw new ImportFormatException("The file has a header row but no data rows");
        }

        var header = lines[0].Split(',');
        var accountCol = -1;
        var firstCol = -1;
        var lastCol = -1;
        var emailCol = -1;
        var phoneCol = -1;
        var titleCol = -1;
        for (var h = 0; h < header.Length; h++)
        {
            var columnName = header[h].Trim().ToLowerInvariant();
            if (columnName == "account_ref")
            {
                accountCol = h;
            }
            else if (columnName == "first_name")
            {
                firstCol = h;
            }
            else if (columnName == "last_name")
            {
                lastCol = h;
            }
            else if (columnName == "email")
            {
                emailCol = h;
            }
            else if (columnName == "phone")
            {
                phoneCol = h;
            }
            else if (columnName == "job_title")
            {
                titleCol = h;
            }
        }
        if (accountCol < 0 || firstCol < 0 || lastCol < 0 || emailCol < 0)
        {
            throw new ImportFormatException(
                "The file must have account_ref, first_name, last_name and email columns");
        }

        for (var i = 1; i < lines.Length; i++)
        {
            var line = lines[i];
            if (!string.IsNullOrWhiteSpace(line))
            {
                var cells = line.Split(',');
                if (cells.Length > accountCol && cells.Length > firstCol
                        && cells.Length > lastCol && cells.Length > emailCol)
                {
                    var rawEmail = cells[emailCol];
                    if (!string.IsNullOrWhiteSpace(rawEmail))
                    {
                        if (rawEmail.Contains('@'))
                        {
                            var dedupeKey = rawEmail.Trim().ToLowerInvariant();
                            if (!seenInThisFile.Contains(dedupeKey))
                            {
                                var alreadyHere =
                                    await _contacts.FindByEmailAsync(rawEmail.ToLowerInvariant(), ct);
                                if (alreadyHere.Count == 0)
                                {
                                    var accountRef = cells[accountCol].Trim();
                                    var account = await _accounts.FindByRefAsync(accountRef, ct);
                                    if (account is not null)
                                    {
                                        try
                                        {
                                            var first = cells[firstCol].Trim();
                                            var last = cells[lastCol].Trim();
                                            if (first.Length > 0 && last.Length > 0)
                                            {
                                                var contact = new Contact(
                                                    await NextContactRefAsync(ct),
                                                    account.Id,
                                                    first,
                                                    last,
                                                    rawEmail.Trim().ToLowerInvariant());
                                                if (phoneCol >= 0 && cells.Length > phoneCol)
                                                {
                                                    contact.Phone = cells[phoneCol].Trim();
                                                }
                                                if (titleCol >= 0 && cells.Length > titleCol)
                                                {
                                                    contact.JobTitle = cells[titleCol].Trim();
                                                }
                                                contact.Status = ContactStatus.Prospect;
                                                await _contacts.AddAsync(contact, ct);
                                                await _contacts.SaveChangesAsync(ct);
                                                seenInThisFile.Add(dedupeKey);
                                                created = created + 1;
                                            }
                                            else
                                            {
                                                rejected = rejected + 1;
                                                problems.Add("Row " + (i + 1)
                                                    + ": first_name and last_name are both required");
                                            }
                                        }
                                        catch (Exception)
                                        {
                                            // The agency sends us some very strange files.
                                            // Keep going rather than losing the whole batch.
                                        }
                                    }
                                    else
                                    {
                                        rejected = rejected + 1;
                                        problems.Add("Row " + (i + 1) + ": no account called "
                                            + accountRef);
                                    }
                                }
                                else
                                {
                                    skipped = skipped + 1;
                                }
                            }
                            else
                            {
                                skipped = skipped + 1;
                            }
                        }
                        else
                        {
                            rejected = rejected + 1;
                            problems.Add("Row " + (i + 1) + ": " + rawEmail.Trim()
                                + " is not an email address");
                        }
                    }
                    else
                    {
                        rejected = rejected + 1;
                        problems.Add("Row " + (i + 1) + ": email is required");
                    }
                }
                else
                {
                    rejected = rejected + 1;
                    problems.Add("Row " + (i + 1) + ": not enough columns");
                }
            }
        }

        var report = new StringBuilder();
        report.Append("Import complete.\n");
        report.Append("Created: ").Append(created).Append('\n');
        report.Append("Skipped as already present: ").Append(skipped).Append('\n');
        report.Append("Rejected: ").Append(rejected).Append('\n');
        if (problems.Count > 0)
        {
            report.Append("\nProblems:\n");
            for (var p = 0; p < problems.Count; p++)
            {
                report.Append("  - ").Append(problems[p]).Append('\n');
            }
        }

        _audit.Imported(created, skipped, rejected);
        return report.ToString();
    }

    private async Task<string> NextContactRefAsync(CancellationToken ct)
    {
        var candidate = await _contacts.CountAsync(ct) + 1;
        while (await _contacts.ExistsByRefAsync($"C-{candidate:D5}", ct))
        {
            candidate = candidate + 1;
        }
        return $"C-{candidate:D5}";
    }
}
