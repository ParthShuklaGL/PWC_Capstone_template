using NimbusSales.Crm.Domain;
using NimbusSales.Crm.Web.Mapping;

namespace NimbusSales.Crm.Tests;

public class ContactMapperTests
{
    private readonly ContactMapper _mapper = new();

    [Fact]
    public void CopiesTheAccountNameOntoTheSummary()
    {
        var account = new Account("A-0024", "Bellhaven Hotels", "Hospitality", "United Kingdom",
            "https://www.bellhavenhotels.com");
        var contact = new Contact("C-00089", account.Id, "Nadia", "Fenwick",
            "nadia.fenwick@bellhavenhotels.com")
        {
            Account = account,
            JobTitle = "Chief Operating Officer"
        };

        var response = _mapper.ToSummary(contact);

        Assert.Equal("C-00089", response.ContactRef);
        Assert.Equal("Fenwick", response.LastName);
        Assert.Equal("Bellhaven Hotels", response.AccountName);
        Assert.Equal("PROSPECT", response.Status);
    }
}
