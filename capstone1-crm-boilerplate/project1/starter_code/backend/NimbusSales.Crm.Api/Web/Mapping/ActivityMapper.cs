using NimbusSales.Crm.Domain;
using NimbusSales.Crm.Web.Dto;

namespace NimbusSales.Crm.Web.Mapping;

public class ActivityMapper
{
    public ActivityResponse ToResponse(Activity activity)
    {
        return new ActivityResponse
        {
            Id = activity.Id,
            Type = ToWireType(activity.Type),
            Subject = activity.Subject,
            Notes = activity.Notes,
            OccurredAt = activity.OccurredAt
        };
    }

    public IReadOnlyList<ActivityResponse> ToResponses(IEnumerable<Activity> activities) =>
        activities.Select(ToResponse).ToList();

    public static string ToWireType(ActivityType type) => type switch
    {
        ActivityType.Call => "CALL",
        ActivityType.Email => "EMAIL",
        ActivityType.Meeting => "MEETING",
        ActivityType.Note => "NOTE",
        _ => type.ToString().ToUpperInvariant()
    };
}
