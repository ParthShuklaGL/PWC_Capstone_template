using NimbusSales.Crm.Domain;

namespace NimbusSales.Crm.Data;

/// <summary>
/// Demo accounts for the boilerplate. These passwords are published in the README so
/// participants can sign in; they are for local development only.
/// </summary>
public static class UserSeedData
{
    public const string AdminPassword = "Admin#2026";
    public const string RepPassword = "Rep#2026";

    public static void Seed(CrmDbContext db)
    {
        if (db.Users.Any())
        {
            return;
        }

        db.Users.AddRange(
            new AppUser("U-0001", "admin@nimbus.test", "Priya Raghavan",
                Auth.PasswordHasher.Hash(AdminPassword), UserRoles.Admin),
            new AppUser("U-0002", "aisha@nimbus.test", "Aisha Khan",
                Auth.PasswordHasher.Hash(RepPassword), UserRoles.User),
            new AppUser("U-0003", "ben@nimbus.test", "Ben Carter",
                Auth.PasswordHasher.Hash(RepPassword), UserRoles.User));
        db.SaveChanges();
    }

    /// <summary>Deals created before owners existed are shared out between the two reps.</summary>
    public static void AssignMissingOwners(CrmDbContext db)
    {
        var reps = db.Users.Where(u => u.Role == UserRoles.User).OrderBy(u => u.Id).ToList();
        if (reps.Count == 0)
        {
            return;
        }

        var orphans = db.Deals.Where(d => d.OwnerId == null).OrderBy(d => d.Id).ToList();
        for (var i = 0; i < orphans.Count; i++)
        {
            orphans[i].OwnerId = reps[i % reps.Count].Id;
        }

        if (orphans.Count > 0)
        {
            db.SaveChanges();
        }
    }
}
