using NimbusSales.Crm.Auditing;
using NimbusSales.Crm.Domain;
using NimbusSales.Crm.Repositories;

namespace NimbusSales.Crm.Services;

public class ActivityService : IActivityService
{
    private readonly IActivityRepository _activities;
    private readonly IContactRepository _contacts;
    private readonly CrmAuditLogger _audit;

    public ActivityService(IActivityRepository activities,
                           IContactRepository contacts,
                           CrmAuditLogger audit)
    {
        _activities = activities;
        _contacts = contacts;
        _audit = audit;
    }

    public async Task<IReadOnlyList<Activity>> ListForContactAsync(
        string contactRef, CancellationToken ct = default)
    {
        var contact = await _contacts.FindByRefAsync(contactRef, ct)
            ?? throw new ContactNotFoundException(contactRef);

        var activities = await _activities.ListByContactAsync(contact.Id, ct);
        _audit.Listed("activity", activities.Count);
        return activities;
    }

    public async Task<Activity> LogAsync(string contactRef, ActivityType type, string subject,
                                         string? notes, DateTimeOffset? occurredAt,
                                         CancellationToken ct = default)
    {
        var contact = await _contacts.FindByRefAsync(contactRef, ct)
            ?? throw new ContactNotFoundException(contactRef);

        var when = occurredAt ?? DateTimeOffset.UtcNow;
        var activity = new Activity(contact.Id, type, subject, notes, when);
        await _activities.AddAsync(activity, ct);
        await _activities.SaveChangesAsync(ct);

        contact.LastContactedAt = when;
        await _contacts.SaveChangesAsync(ct);

        _audit.Created("activity", contactRef);
        return activity;
    }
}
