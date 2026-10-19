using Microsoft.AspNetCore.Mvc;
using NimbusSales.Crm.Domain;
using NimbusSales.Crm.Services;
using NimbusSales.Crm.Web.Dto;
using NimbusSales.Crm.Web.Mapping;

namespace NimbusSales.Crm.Web;

[ApiController]
[Route("api/contacts")]
[Tags("Contacts")]
public class ContactsController : ControllerBase
{
    private readonly IContactService _contactService;
    private readonly IContactImportService _contactImportService;
    private readonly ContactMapper _contactMapper;

    public ContactsController(IContactService contactService,
                              IContactImportService contactImportService,
                              ContactMapper contactMapper)
    {
        _contactService = contactService;
        _contactImportService = contactImportService;
        _contactMapper = contactMapper;
    }

    [HttpGet]
    [EndpointSummary("One page of contacts, in surname order")]
    [ProducesResponseType(typeof(PageResponse<ContactSummaryResponse>), StatusCodes.Status200OK)]
    public async Task<PageResponse<ContactSummaryResponse>> List(
        [FromQuery(Name = "page")] int page = 0,
        [FromQuery(Name = "size")] int size = 20,
        [FromQuery(Name = "status")] string? status = null,
        CancellationToken ct = default)
    {
        ContactStatus? filter = string.IsNullOrWhiteSpace(status)
            ? null
            : Enum.Parse<ContactStatus>(status, ignoreCase: true);

        var found = await _contactService.ListAsync(page, size, filter, ct);
        return _contactMapper.ToPageResponse(found, page, size);
    }

    [HttpGet("search")]
    [EndpointSummary("Find contacts by name or email")]
    [ProducesResponseType(typeof(IReadOnlyList<ContactSummaryResponse>), StatusCodes.Status200OK)]
    public async Task<IReadOnlyList<ContactSummaryResponse>> Search(
        [FromQuery(Name = "q")] string q,
        CancellationToken ct)
    {
        return _contactMapper.ToSummaries(await _contactService.SearchAsync(q, ct));
    }

    [HttpGet("{contactRef}")]
    [EndpointSummary("One contact")]
    [ProducesResponseType(typeof(Contact), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<Contact> Get(string contactRef, CancellationToken ct)
    {
        return await _contactService.GetByRefAsync(contactRef, ct);
    }

    [HttpPut("{contactRef}")]
    [EndpointSummary("Update a contact")]
    [ProducesResponseType(typeof(ContactSummaryResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ContactSummaryResponse> Update(
        string contactRef,
        [FromBody] ContactUpdateRequest request,
        CancellationToken ct)
    {
        ContactStatus? status = string.IsNullOrWhiteSpace(request.Status)
            ? null
            : Enum.Parse<ContactStatus>(request.Status, ignoreCase: true);

        var updated = await _contactService.UpdateAsync(
            contactRef,
            request.FirstName!,
            request.LastName!,
            request.Email!,
            request.Phone,
            request.JobTitle,
            status,
            ct);

        return _contactMapper.ToSummary(updated);
    }

    [HttpPost("import")]
    [Consumes("text/csv")]
    [Produces("text/plain")]
    [EndpointSummary("Bulk import leads from the agency's monthly CSV")]
    [ProducesResponseType(typeof(string), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<string> ImportCsv(CancellationToken ct)
    {
        using var reader = new StreamReader(Request.Body);
        var csv = await reader.ReadToEndAsync(ct);
        return await _contactImportService.ImportCsvAsync(csv, ct);
    }
}
