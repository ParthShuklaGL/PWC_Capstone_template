namespace NimbusSales.Crm.Auditing;

/// <summary>
/// Every read and write of customer data goes through here.
///
/// <para>Service classes must not resolve their own logger - compliance asked for one
/// place where the audit trail is defined, and this is it.</para>
/// </summary>
public class CrmAuditLogger
{
    private readonly ILogger _log;

    public CrmAuditLogger(ILoggerFactory loggerFactory)
    {
        _log = loggerFactory.CreateLogger("CRM_AUDIT");
    }

    public void Listed(string entity, int count) =>
        _log.LogInformation("LIST entity={Entity} returned={Count}", entity, count);

    public void Viewed(string entity, string reference) =>
        _log.LogInformation("VIEW entity={Entity} ref={Reference}", entity, reference);

    public void Created(string entity, string reference) =>
        _log.LogInformation("CREATE entity={Entity} ref={Reference}", entity, reference);

    public void Updated(string entity, string reference) =>
        _log.LogInformation("UPDATE entity={Entity} ref={Reference}", entity, reference);

    public void Deleted(string entity, string reference) =>
        _log.LogInformation("DELETE entity={Entity} ref={Reference}", entity, reference);

    public void StageChanged(string reference, string from, string to) =>
        _log.LogInformation("STAGE entity=deal ref={Reference} from={From} to={To}",
            reference, from, to);

    public void Imported(int created, int skipped, int rejected) =>
        _log.LogInformation("IMPORT created={Created} skipped={Skipped} rejected={Rejected}",
            created, skipped, rejected);
}
