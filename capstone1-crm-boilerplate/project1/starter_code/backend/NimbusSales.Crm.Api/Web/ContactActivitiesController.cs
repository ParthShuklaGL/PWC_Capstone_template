using Microsoft.AspNetCore.Mvc;
using NimbusSales.Crm.Domain;
using NimbusSales.Crm.Services;
using NimbusSales.Crm.Web.Dto;
using NimbusSales.Crm.Web.Mapping;

namespace NimbusSales.Crm.Web;

[ApiController]
[Route("api/contacts/{contactRef}/activities")]
[Tags("Activities")]
public class ContactActivitiesController : ControllerBase
{
    private readonly IActivityService _activityService;
    private readonly ActivityMapper _activityMapper;

    public ContactActivitiesController(IActivityService activityService,
                                       ActivityMapper activityMapper)
    {
        _activityService = activityService;
        _activityMapper = activityMapper;
    }

    [HttpGet]
    [EndpointSummary("Everything logged against this contact, newest first")]
    [ProducesResponseType(typeof(IReadOnlyList<ActivityResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IReadOnlyList<ActivityResponse>> List(string contactRef, CancellationToken ct)
    {
        return _activityMapper.ToResponses(
            await _activityService.ListForContactAsync(contactRef, ct));
    }

    [HttpPost]
    [EndpointSummary("Log an interaction")]
    [ProducesResponseType(typeof(ActivityResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ActivityResponse>> Log(
        string contactRef,
        [FromBody] ActivityCreateRequest request,
        CancellationToken ct)
    {
        var logged = await _activityService.LogAsync(
            contactRef,
            Enum.Parse<ActivityType>(request.Type!, ignoreCase: true),
            request.Subject!,
            request.Notes,
            request.OccurredAt,
            ct);

        return StatusCode(StatusCodes.Status201Created, _activityMapper.ToResponse(logged));
    }
}
