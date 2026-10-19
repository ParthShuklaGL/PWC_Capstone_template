using NimbusSales.Crm.Domain;
using NimbusSales.Crm.Repositories;
using NimbusSales.Crm.Services;
using NimbusSales.Crm.Web;
using NimbusSales.Crm.Web.Mapping;
using NSubstitute;

namespace NimbusSales.Crm.Tests;

public class ContactsControllerTests
{
    private readonly IContactService _contactService = Substitute.For<IContactService>();
    private readonly IContactImportService _importService =
        Substitute.For<IContactImportService>();
    private readonly ContactsController _controller;

    public ContactsControllerTests()
    {
        _controller = new ContactsController(_contactService, _importService, new ContactMapper());
    }

    [Fact]
    public async Task ListReturnsAPageOfContacts()
    {
        var account = new Account("A-0024", "Bellhaven Hotels", "Hospitality", "United Kingdom",
            "https://www.bellhavenhotels.com");
        var contact = new Contact("C-00089", account.Id, "Nadia", "Fenwick",
            "nadia.fenwick@bellhavenhotels.com")
        {
            Account = account
        };

        _contactService.ListAsync(0, 20, null, Arg.Any<CancellationToken>())
            .Returns(new PagedResult<Contact>(new List<Contact> { contact }, 150));

        var response = await _controller.List(0, 20, null, CancellationToken.None);

        Assert.Equal(150, response.TotalElements);
        Assert.Equal(8, response.TotalPages);
        Assert.Equal("Fenwick", response.Items[0].LastName);
        Assert.Equal("Bellhaven Hotels", response.Items[0].AccountName);
    }

    [Fact]
    public async Task UnknownContactReferenceThrowsNotFound()
    {
        _contactService.GetByRefAsync("C-99999", Arg.Any<CancellationToken>())
            .Returns<Contact>(_ => throw new ContactNotFoundException("C-99999"));

        var thrown = await Assert.ThrowsAsync<ContactNotFoundException>(
            () => _controller.Get("C-99999", CancellationToken.None));

        Assert.Contains("C-99999", thrown.Message);
    }
}
