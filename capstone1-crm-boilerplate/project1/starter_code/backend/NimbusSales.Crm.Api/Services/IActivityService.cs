using NimbusSales.Crm.Domain;

namespace NimbusSales.Crm.Services;

public interface IActivityService
{
    Task<IReadOnlyList<Activity>> ListForContactAsync(string contactRef,
                                                      CancellationToken ct = default);

    Task<Activity> LogAsync(string contactRef, ActivityType type, string subject, string? notes,
                            DateTimeOffset? occurredAt, CancellationToken ct = default);
}
