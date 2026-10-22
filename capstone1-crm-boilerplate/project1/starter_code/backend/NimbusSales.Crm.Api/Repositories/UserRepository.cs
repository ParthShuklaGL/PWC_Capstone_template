using Microsoft.EntityFrameworkCore;
using NimbusSales.Crm.Data;
using NimbusSales.Crm.Domain;

namespace NimbusSales.Crm.Repositories;

public interface IUserRepository
{
    Task<AppUser?> FindByEmailAsync(string email, CancellationToken ct = default);

    Task<AppUser?> FindByRefAsync(string userRef, CancellationToken ct = default);

    Task<IReadOnlyList<AppUser>> ListAsync(CancellationToken ct = default);
}

public class UserRepository : IUserRepository
{
    private readonly CrmDbContext _db;

    public UserRepository(CrmDbContext db)
    {
        _db = db;
    }

    public Task<AppUser?> FindByEmailAsync(string email, CancellationToken ct = default)
    {
        var lowered = email.Trim().ToLower();
        return _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Email.ToLower() == lowered, ct);
    }

    public Task<AppUser?> FindByRefAsync(string userRef, CancellationToken ct = default) =>
        _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.UserRef == userRef, ct);

    public async Task<IReadOnlyList<AppUser>> ListAsync(CancellationToken ct = default) =>
        await _db.Users.AsNoTracking().OrderBy(u => u.Id).ToListAsync(ct);
}
