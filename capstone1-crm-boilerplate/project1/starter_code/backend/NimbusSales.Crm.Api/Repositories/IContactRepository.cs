using NimbusSales.Crm.Domain;

namespace NimbusSales.Crm.Repositories;

public interface IContactRepository
{
    Task<PagedResult<Contact>> ListAsync(int page, int size, ContactStatus? status,
                                         CancellationToken ct = default);

    Task<IReadOnlyList<Contact>> SearchAsync(string q, CancellationToken ct = default);

    Task<Contact?> FindByRefAsync(string contactRef, CancellationToken ct = default);

    Task<IReadOnlyList<Contact>> ListByAccountAsync(long accountId, CancellationToken ct = default);

    Task<IReadOnlyList<Contact>> FindByEmailAsync(string email, CancellationToken ct = default);

    Task<bool> ExistsByRefAsync(string contactRef, CancellationToken ct = default);

    Task<int> CountAsync(CancellationToken ct = default);

    Task AddAsync(Contact contact, CancellationToken ct = default);

    Task SaveChangesAsync(CancellationToken ct = default);
}
