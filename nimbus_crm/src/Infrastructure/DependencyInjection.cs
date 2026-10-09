using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using NimbusCrm.Application.Abstractions;
using NimbusCrm.Infrastructure.Persistence;
using NimbusCrm.Infrastructure.Security;
using NimbusCrm.Infrastructure.Seeding;

namespace NimbusCrm.Infrastructure;

public static class DependencyInjection
{
    /// <param name="connectionString">Read from configuration by the caller; never defaulted here.</param>
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, string connectionString)
    {
        services.AddDbContext<CrmDbContext>(options => options.UseMySQL(connectionString));
        services.AddScoped<IApplicationDbContext>(provider => provider.GetRequiredService<CrmDbContext>());

        services.AddSingleton<IPasswordHasher>(new IdentityPasswordHasher());
        services.AddSingleton(TimeProvider.System);
        services.AddMemoryCache();
        services.AddSingleton<ITokenRevocationList, DatabaseTokenRevocationList>();
        services.AddSingleton<ICredentialValidator, CredentialValidator>();
        services.AddHostedService<RevokedTokenCleaner>();

        return services;
    }

    /// <summary>Call only in Development. Creates one ADMIN and one USER on an empty database.</summary>
    public static IServiceCollection AddDevelopmentSeeding(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<SeedOptions>().Bind(configuration.GetSection(SeedOptions.SectionName));
        services.AddHostedService<DevelopmentSeeder>();
        return services;
    }
}
