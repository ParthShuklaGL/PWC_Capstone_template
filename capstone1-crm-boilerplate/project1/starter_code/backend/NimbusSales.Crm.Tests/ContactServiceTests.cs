using Microsoft.Extensions.Logging.Abstractions;
using NimbusSales.Crm.Auditing;
using NimbusSales.Crm.Domain;
using NimbusSales.Crm.Repositories;
using NimbusSales.Crm.Services;
using NSubstitute;

namespace NimbusSales.Crm.Tests;

public class ContactServiceTests
{
    private readonly IContactRepository _contacts = Substitute.For<IContactRepository>();
    private readonly IAccountRepository _accounts = Substitute.For<IAccountRepository>();
    private readonly ContactService _service;

    private readonly Account _account = new(
        "A-0001", "Halcyon Freight", "Logistics", "United Kingdom",
        "https://www.halcyonfreight.co.uk");

    public ContactServiceTests()
    {
        _service = new ContactService(_contacts, _accounts,
            new CrmAuditLogger(NullLoggerFactory.Instance));
    }

    [Fact]
    public async Task ListReturnsSortedContacts()
    {
        var fromDatabase = new List<Contact>
        {
            Contact("C-00001", "Grace", "Yardley"),
            Contact("C-00002", "Idris", "Achebe"),
            Contact("C-00003", "Dermot", "Marchetti")
        };

        _contacts.ListAsync(0, 20, null, Arg.Any<CancellationToken>())
            .Returns(new PagedResult<Contact>(fromDatabase, 3));

        var result = await _service.ListAsync(0, 20, null);

        Assert.Equal(
            new[] { "Achebe", "Marchetti", "Yardley" },
            result.Items.Select(c => c.LastName).ToArray());
    }

    [Fact]
    public async Task ListReportsTheTotalFromTheDatabase()
    {
        _contacts.ListAsync(0, 20, null, Arg.Any<CancellationToken>())
            .Returns(new PagedResult<Contact>(
                new List<Contact> { Contact("C-00001", "Grace", "Yardley") }, 150));

        var result = await _service.ListAsync(0, 20, null);

        Assert.Equal(150, result.TotalElements);
    }

    [Fact]
    public async Task GetByRefReturnsTheContact()
    {
        _contacts.FindByRefAsync("C-00089", Arg.Any<CancellationToken>())
            .Returns(Contact("C-00089", "Nadia", "Fenwick"));

        var found = await _service.GetByRefAsync("C-00089");

        Assert.Equal("Fenwick", found.LastName);
    }

    [Fact]
    public async Task GetByRefRejectsAnUnknownReference()
    {
        _contacts.FindByRefAsync("C-99999", Arg.Any<CancellationToken>())
            .Returns((Contact?)null);

        var thrown = await Assert.ThrowsAsync<ContactNotFoundException>(
            () => _service.GetByRefAsync("C-99999"));

        Assert.Contains("C-99999", thrown.Message);
    }

    private Contact Contact(string reference, string firstName, string lastName)
    {
        return new Contact(reference, _account.Id, firstName, lastName,
            firstName.ToLowerInvariant() + "." + lastName.ToLowerInvariant()
                + "@halcyonfreight.co.uk")
        {
            Account = _account
        };
    }
}
