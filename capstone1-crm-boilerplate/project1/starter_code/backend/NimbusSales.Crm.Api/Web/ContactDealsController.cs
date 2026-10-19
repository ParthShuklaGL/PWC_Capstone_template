using Microsoft.AspNetCore.Mvc;
using NimbusSales.Crm.Services;
using NimbusSales.Crm.Web.Dto;
using NimbusSales.Crm.Web.Mapping;

namespace NimbusSales.Crm.Web;

[ApiController]
[Route("api/contacts/{contactRef}/deals")]
[Tags("Deals")]
public class ContactDealsController : ControllerBase
{
    private readonly IDealService _dealService;
    private readonly DealMapper _dealMapper;

    public ContactDealsController(IDealService dealService, DealMapper dealMapper)
    {
        _dealService = dealService;
        _dealMapper = dealMapper;
    }

    [HttpGet]
    [EndpointSummary("The deals this contact is driving")]
    [ProducesResponseType(typeof(IReadOnlyList<DealResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IReadOnlyList<DealResponse>> List(string contactRef, CancellationToken ct)
    {
        return _dealMapper.ToResponses(await _dealService.ListForContactAsync(contactRef, ct));
    }
}
