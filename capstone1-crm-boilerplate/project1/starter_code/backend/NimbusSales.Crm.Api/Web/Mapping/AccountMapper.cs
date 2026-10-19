using NimbusSales.Crm.Domain;
using NimbusSales.Crm.Web.Dto;

namespace NimbusSales.Crm.Web.Mapping;

public class AccountMapper
{
    public AccountResponse ToResponse(Account account)
    {
        return new AccountResponse
        {
            AccountRef = account.AccountRef,
            Name = account.Name,
            Industry = account.Industry,
            Country = account.Country,
            Website = account.Website
        };
    }

    public IReadOnlyList<AccountResponse> ToResponses(IEnumerable<Account> accounts) =>
        accounts.Select(ToResponse).ToList();
}
