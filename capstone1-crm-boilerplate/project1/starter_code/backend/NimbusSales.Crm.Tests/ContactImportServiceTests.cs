using Microsoft.Extensions.Logging.Abstractions;
using NimbusSales.Crm.Auditing;
using NimbusSales.Crm.Domain;
using NimbusSales.Crm.Repositories;
using NimbusSales.Crm.Services;
using NSubstitute;

namespace NimbusSales.Crm.Tests;

public class ContactImportServiceTests
{
    private readonly IContactRepository _contacts = Substitute.For<IContactRepository>();
    private readonly IAccountRepository _accounts = Substitute.For<IAccountRepository>();
    private readonly ContactImportService _importService;

    public ContactImportServiceTests()
    {
        _importService = new ContactImportService(_contacts, _accounts,
            new CrmAuditLogger(NullLoggerFactory.Instance));
    }

    [Fact]
    public async Task ImportsOneContactPerRow()
    {
        var account = new Account("A-0001", "Halcyon Freight", "Logistics", "United Kingdom",
            "https://www.halcyonfreight.co.uk");
        _accounts.FindByRefAsync("A-0001", Arg.Any<CancellationToken>()).Returns(account);
        _contacts.FindByEmailAsync(Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(new List<Contact>());

        var csv = """
            account_ref,first_name,last_name,email
            A-0001,Ruth,Barlowe,ruth.barlowe@halcyonfreight.co.uk
            """;

        var report = await _importService.ImportCsvAsync(csv);

        Assert.Contains("Created: 1", report);
        await _contacts.Received(1).AddAsync(Arg.Any<Contact>(), Arg.Any<CancellationToken>());
    }
}
