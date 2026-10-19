namespace NimbusSales.Crm.Services;

public class AccountNotFoundException : Exception
{
    public AccountNotFoundException(string accountRef)
        : base($"No account with reference {accountRef}")
    {
    }
}
