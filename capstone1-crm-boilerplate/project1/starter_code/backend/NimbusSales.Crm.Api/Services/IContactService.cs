using NimbusSales.Crm.Domain;
using NimbusSales.Crm.Repositories;

namespace NimbusSales.Crm.Services;

public interface IContactService
{
    Task<PagedResult<Contact>> ListAsync(int page, int size, ContactStatus? status,
                                         CancellationToken ct = default);

    Task<IReadOnlyList<Contact>> SearchAsync(string q, CancellationToken ct = default);

    Task<Contact> GetByRefAsync(string contactRef, CancellationToken ct = default);

    Task<IReadOnlyList<Contact>> ListForAccountAsync(string accountRef,
                                                     CancellationToken ct = default);

    Task<Contact> UpdateAsync(string contactRef, string firstName, string lastName, string email,
                              string? phone, string? jobTitle, ContactStatus? status,
                              CancellationToken ct = default);
}
