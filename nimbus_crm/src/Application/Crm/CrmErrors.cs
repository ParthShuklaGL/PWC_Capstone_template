using NimbusCrm.Application.Common;

namespace NimbusCrm.Application.Crm;

public static class CrmErrors
{
    public static readonly Error AccountNotFound =
        new("ACCOUNT_NOT_FOUND", "That account does not exist.", ErrorType.NotFound);

    public static readonly Error ContactNotFound =
        new("CONTACT_NOT_FOUND", "That contact does not exist.", ErrorType.NotFound);

    public static readonly Error DealNotFound =
        new("DEAL_NOT_FOUND", "That deal does not exist.", ErrorType.NotFound);

    public static readonly Error AccountHasContacts =
        new("ACCOUNT_HAS_CONTACTS", "This account still has contacts. Move or delete them first.", ErrorType.Conflict);

    public static readonly Error ContactHasHistory =
        new("CONTACT_HAS_HISTORY", "This contact still has deals or logged activities, so it cannot be deleted.", ErrorType.Conflict);
}
