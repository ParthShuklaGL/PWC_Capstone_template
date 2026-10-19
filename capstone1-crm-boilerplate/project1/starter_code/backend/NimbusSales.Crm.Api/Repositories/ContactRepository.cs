using Microsoft.EntityFrameworkCore;
using NimbusSales.Crm.Data;
using NimbusSales.Crm.Domain;

namespace NimbusSales.Crm.Repositories;

public class ContactRepository : IContactRepository
{
    private readonly CrmDbContext _db;

    public ContactRepository(CrmDbContext db)
    {
        _db = db;
    }

    public async Task<PagedResult<Contact>> ListAsync(int page, int size, ContactStatus? status,
                                                      CancellationToken ct = default)
    {
        var safePage = Math.Max(0, page);
        var safeSize = Math.Clamp(size, 1, 100);

        // The account is loaded with the contact: the list screen shows the account name
        // against every row, and there is no lazy loading here.
        var query = _db.Contacts
            .AsNoTracking()
            .Include(c => c.Account)
            .AsQueryable();

        if (status is not null)
        {
            query = query.Where(c => c.Status == status.Value);
        }

        var total = await query.LongCountAsync(ct);
        var items = await query
            .Skip(safePage * safeSize)
            .Take(safeSize)
            .ToListAsync(ct);

        return new PagedResult<Contact>(items, total);
    }

    public async Task<IReadOnlyList<Contact>> SearchAsync(string q, CancellationToken ct = default)
    {
        var term = (q ?? string.Empty).Trim().ToLower();

        return await _db.Contacts
            .AsNoTracking()
            .Include(c => c.Account)
            .Where(c => c.FirstName.ToLower().Contains(term)
                     || c.LastName.ToLower().Contains(term)
                     || c.Email.ToLower().Contains(term))
            .OrderBy(c => c.LastName)
            .ThenBy(c => c.FirstName)
            .ToListAsync(ct);
    }

    /// <summary>
    /// The account is fetched with the contact. Lazy-loading proxies are not enabled, so
    /// an association nobody asked for would arrive null and the mapper would fall over.
    /// </summary>
    public Task<Contact?> FindByRefAsync(string contactRef, CancellationToken ct = default)
    {
        return _db.Contacts
            .Include(c => c.Account)
            .FirstOrDefaultAsync(c => c.ContactRef == contactRef, ct);
    }

    public async Task<IReadOnlyList<Contact>> ListByAccountAsync(
        long accountId, CancellationToken ct = default)
    {
        return await _db.Contacts
            .AsNoTracking()
            .Include(c => c.Account)
            .Where(c => c.AccountId == accountId)
            .OrderBy(c => c.LastName)
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<Contact>> FindByEmailAsync(
        string email, CancellationToken ct = default)
    {
        return await _db.Contacts
            .AsNoTracking()
            .Where(c => c.Email.ToLower() == email.ToLower())
            .ToListAsync(ct);
    }

    public Task<bool> ExistsByRefAsync(string contactRef, CancellationToken ct = default) =>
        _db.Contacts.AnyAsync(c => c.ContactRef == contactRef, ct);

    public Task<int> CountAsync(CancellationToken ct = default) => _db.Contacts.CountAsync(ct);

    public async Task AddAsync(Contact contact, CancellationToken ct = default) =>
        await _db.Contacts.AddAsync(contact, ct);

    public Task SaveChangesAsync(CancellationToken ct = default) => _db.SaveChangesAsync(ct);
}
