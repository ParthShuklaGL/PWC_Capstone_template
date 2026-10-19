using Microsoft.AspNetCore.Mvc;
using NimbusSales.Crm.Services;
using NimbusSales.Crm.Web.Dto;
using NimbusSales.Crm.Web.Mapping;

namespace NimbusSales.Crm.Web;

[ApiController]
[Route("api/accounts")]
[Tags("Accounts")]
public class AccountsController : ControllerBase
{
    private readonly IAccountService _accountService;
    private readonly IContactService _contactService;
    private readonly AccountMapper _accountMapper;
    private readonly ContactMapper _contactMapper;

    public AccountsController(IAccountService accountService,
                              IContactService contactService,
                              AccountMapper accountMapper,
                              ContactMapper contactMapper)
    {
        _accountService = accountService;
        _contactService = contactService;
        _accountMapper = accountMapper;
        _contactMapper = contactMapper;
    }

    [HttpGet]
    [EndpointSummary("Every account, by name")]
    [ProducesResponseType(typeof(IReadOnlyList<AccountResponse>), StatusCodes.Status200OK)]
    public async Task<IReadOnlyList<AccountResponse>> List(CancellationToken ct)
    {
        return _accountMapper.ToResponses(await _accountService.ListAsync(ct));
    }

    [HttpGet("{accountRef}")]
    [EndpointSummary("One account")]
    [ProducesResponseType(typeof(AccountResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<AccountResponse> Get(string accountRef, CancellationToken ct)
    {
        return _accountMapper.ToResponse(await _accountService.GetByRefAsync(accountRef, ct));
    }

    [HttpGet("{accountRef}/contacts")]
    [EndpointSummary("The people at this account")]
    [ProducesResponseType(typeof(IReadOnlyList<ContactSummaryResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IReadOnlyList<ContactSummaryResponse>> Contacts(
        string accountRef, CancellationToken ct)
    {
        return _contactMapper.ToSummaries(
            await _contactService.ListForAccountAsync(accountRef, ct));
    }
}
