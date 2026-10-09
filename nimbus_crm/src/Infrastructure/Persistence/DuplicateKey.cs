using Microsoft.EntityFrameworkCore;
using MySql.Data.MySqlClient;

namespace NimbusCrm.Infrastructure.Persistence;

/// <summary>Recognises MySQL's "duplicate entry" failure (error 1062) so the API can answer 409, not 500.</summary>
public static class DuplicateKey
{
    private const int MySqlDuplicateEntry = 1062;

    public static bool Matches(Exception exception) =>
        exception is DbUpdateException { InnerException: MySqlException { Number: MySqlDuplicateEntry } };
}
