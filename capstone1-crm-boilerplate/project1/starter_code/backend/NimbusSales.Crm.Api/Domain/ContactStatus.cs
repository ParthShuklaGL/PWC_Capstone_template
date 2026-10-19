namespace NimbusSales.Crm.Domain;

/// <summary>Where a contact sits in the relationship, as far as Inside Sales is concerned.</summary>
public enum ContactStatus
{
    /// <summary>Not bought anything yet.</summary>
    Prospect,

    /// <summary>Currently paying us.</summary>
    Customer,

    /// <summary>Was a customer, is not any more.</summary>
    Churned
}
