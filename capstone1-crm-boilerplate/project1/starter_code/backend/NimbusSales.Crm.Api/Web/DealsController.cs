using Microsoft.AspNetCore.Mvc;
using NimbusSales.Crm.Domain;
using NimbusSales.Crm.Services;
using NimbusSales.Crm.Web.Dto;
using NimbusSales.Crm.Web.Mapping;

namespace NimbusSales.Crm.Web;

[ApiController]
[Route("api/deals")]
[Tags("Deals")]
public class DealsController : ControllerBase
{
    private readonly IDealService _dealService;
    private readonly DealMapper _dealMapper;

    public DealsController(IDealService dealService, DealMapper dealMapper)
    {
        _dealService = dealService;
        _dealMapper = dealMapper;
    }

    [HttpGet]
    [EndpointSummary("One page of deals, soonest expected close first")]
    [ProducesResponseType(typeof(PageResponse<DealResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<PageResponse<DealResponse>> List(
        [FromQuery(Name = "page")] int page = 0,
        [FromQuery(Name = "size")] int size = 20,
        [FromQuery(Name = "stage")] string? stage = null,
        CancellationToken ct = default)
    {
        var filter = ParseOptionalStage(stage);
        var found = await _dealService.ListAsync(page, size, filter, ct);
        return _dealMapper.ToPageResponse(found, page, size);
    }

    /// <summary>Declared before {dealRef} so "summary" is never read as a reference.</summary>
    [HttpGet("summary")]
    [EndpointSummary("What the pipeline is worth: count and value per stage, plus the open total")]
    [ProducesResponseType(typeof(DealSummaryResponse), StatusCodes.Status200OK)]
    public async Task<DealSummaryResponse> Summary(CancellationToken ct)
    {
        return _dealMapper.ToSummaryResponse(await _dealService.SummariseAsync(ct));
    }

    [HttpGet("{dealRef}")]
    [EndpointSummary("One deal")]
    [ProducesResponseType(typeof(DealResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<DealResponse> Get(string dealRef, CancellationToken ct)
    {
        return _dealMapper.ToResponse(await _dealService.GetByRefAsync(dealRef, ct));
    }

    [HttpPost]
    [EndpointSummary("Create a deal for an account and one of its contacts")]
    [ProducesResponseType(typeof(DealResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<DealResponse>> Create(
        [FromBody] DealCreateRequest request, CancellationToken ct)
    {
        var created = await _dealService.CreateAsync(
            request.Title!,
            request.AccountRef!,
            request.ContactRef!,
            request.Value!.Value,
            request.ExpectedCloseDate!.Value,
            ct);

        return StatusCode(StatusCodes.Status201Created, _dealMapper.ToResponse(created));
    }

    [HttpPut("{dealRef}")]
    [EndpointSummary("Edit a deal's title, value and expected close date")]
    [ProducesResponseType(typeof(DealResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<DealResponse> Update(
        string dealRef, [FromBody] DealUpdateRequest request, CancellationToken ct)
    {
        var updated = await _dealService.UpdateAsync(
            dealRef,
            request.Title!,
            request.Value!.Value,
            request.ExpectedCloseDate!.Value,
            ct);

        return _dealMapper.ToResponse(updated);
    }

    [HttpDelete("{dealRef}")]
    [EndpointSummary("Delete a deal. Only a PROSPECTING deal can be deleted")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Delete(string dealRef, CancellationToken ct)
    {
        await _dealService.DeleteAsync(dealRef, ct);
        return NoContent();
    }

    [HttpPost("{dealRef}/stage")]
    [EndpointSummary("Move a deal to another stage")]
    [ProducesResponseType(typeof(DealResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<DealResponse> MoveToStage(
        string dealRef, [FromBody] DealStageRequest request, CancellationToken ct)
    {
        var target = ParseStage(request.Stage);
        var moved = await _dealService.MoveToStageAsync(
            dealRef, target, request.CloseDate, request.LostReason, ct);

        return _dealMapper.ToResponse(moved);
    }

    [HttpGet("{dealRef}/history")]
    [EndpointSummary("Every move of this deal, oldest first")]
    [ProducesResponseType(typeof(IReadOnlyList<DealHistoryResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IReadOnlyList<DealHistoryResponse>> History(
        string dealRef, CancellationToken ct)
    {
        return _dealMapper.ToHistoryResponses(await _dealService.HistoryAsync(dealRef, ct));
    }

    private static DealStage? ParseOptionalStage(string? stage) =>
        string.IsNullOrWhiteSpace(stage) ? null : ParseStage(stage);

    /// <summary>
    /// A stage name nobody recognises is a bad request, not a 500: the service never sees
    /// it, and the answer names the property in the house shape.
    /// </summary>
    private static DealStage ParseStage(string? stage)
    {
        if (!DealStageRules.TryParse(stage, out var parsed))
        {
            throw new DealValidationException("stage",
                "stage must be one of PROSPECTING, QUALIFIED, PROPOSAL, NEGOTIATION, WON, LOST");
        }

        return parsed;
    }
}
