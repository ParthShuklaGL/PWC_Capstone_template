namespace NimbusSales.Crm.Services;

public class ContactNotFoundException : Exception
{
    public ContactNotFoundException(string contactRef)
        : base($"No contact with reference {contactRef}")
    {
    }
}
