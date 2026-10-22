using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using NimbusSales.Crm.Auditing;
using NimbusSales.Crm.Auth;
using NimbusSales.Crm.Data;
using NimbusSales.Crm.Repositories;
using NimbusSales.Crm.Services;
using NimbusSales.Crm.Web;
using NimbusSales.Crm.Web.Mapping;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// The CRM runs against MySQL 8. The connection string in appsettings.json points at a
// MySQL server on this machine, at localhost:3306 -- create the database and the
// crm_app user first with db-setup/01-create-database.mysql.sql.
//
// The schema is owned by the migrations in Migrations/, applied by Migrate() below on
// every start. To change the schema, change the model and add a migration; the model on
// its own does nothing until a migration describes the change. To start over, run
// db-setup/02-reset-schema.mysql.sql -- do not drop the database, crm_app cannot create it
// again.
builder.Services.AddDbContext<CrmDbContext>(options =>
    options.UseMySQL(builder.Configuration.GetConnectionString("Crm")!));

builder.Services.AddScoped<IAccountRepository, AccountRepository>();
builder.Services.AddScoped<IAccountService, AccountService>();
builder.Services.AddScoped<IContactRepository, ContactRepository>();
builder.Services.AddScoped<IContactService, ContactService>();
builder.Services.AddScoped<IActivityRepository, ActivityRepository>();
builder.Services.AddScoped<IActivityService, ActivityService>();
builder.Services.AddScoped<IContactImportService, ContactImportService>();
builder.Services.AddScoped<IDealRepository, DealRepository>();
builder.Services.AddScoped<IDealService, DealService>();
builder.Services.AddSingleton<ContactMapper>();
builder.Services.AddSingleton<AccountMapper>();
builder.Services.AddSingleton<ActivityMapper>();
builder.Services.AddSingleton<DealMapper>();
builder.Services.AddSingleton<CrmAuditLogger>();

// Authentication: every endpoint needs a bearer token except POST /api/auth/login, the
// OpenAPI document and the Scalar UI. Two roles exist -- ADMIN manages data, USER is a sales
// rep -- and a USER sees only the deals they own. The server is the authority: the UI
// hiding a button is a convenience, never the protection.
builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.Section));
var jwt = builder.Configuration.GetSection(JwtOptions.Section).Get<JwtOptions>() ?? new JwtOptions();
if (jwt.Key.Length < 32)
{
    throw new InvalidOperationException(
        "Jwt:Key must be at least 32 characters. Set it in appsettings or the Jwt__Key environment variable.");
}

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUser, CurrentUser>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddSingleton<TokenService>();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidIssuer = jwt.Issuer,
            ValidAudience = jwt.Audience,
            IssuerSigningKey = jwt.SigningKey,
            NameClaimType = CurrentUser.NameClaim,
            RoleClaimType = CurrentUser.RoleClaim,
            ClockSkew = TimeSpan.FromSeconds(30)
        };
        options.Events = new JwtBearerEvents
        {
            OnChallenge = async context =>
            {
                context.HandleResponse();
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                await context.Response.WriteAsJsonAsync(new Dictionary<string, object>
                {
                    ["error"] = "UNAUTHENTICATED",
                    ["message"] = "Sign in to continue."
                });
            },
            OnForbidden = async context =>
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                await context.Response.WriteAsJsonAsync(new Dictionary<string, object>
                {
                    ["error"] = "FORBIDDEN",
                    ["message"] = "Your role does not allow this action."
                });
            }
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();
});

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Enums travel as their screaming-snake names, not as ordinals, so what the API
        // emits matches what the front end switches on.
        options.JsonSerializerOptions.Converters.Add(
            new JsonStringEnumConverter(JsonNamingPolicy.SnakeCaseUpper));
    })
    .ConfigureApiBehaviorOptions(options =>
    {
        // A failed request body answers in the house shape, not the framework's
        // ProblemDetails. See Web/CrmValidationResponse.
        options.InvalidModelStateResponseFactory = CrmValidationResponse.From;
    });
// OpenAPI and browsable UI (Scalar)
builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();

// Three handlers, split by area, tried in the order they are registered. Each declines
// what it does not own.
builder.Services.AddExceptionHandler<CrmExceptionHandler>();
builder.Services.AddExceptionHandler<ImportExceptionHandler>();
builder.Services.AddExceptionHandler<DealsExceptionHandler>();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<CrmDbContext>();
    db.Database.Migrate();
    AccountSeedData.Seed(db);
    ContactSeedData.Seed(db);
    ActivitySeedData.Seed(db);
    UserSeedData.Seed(db);
    DealSeedData.Seed(db);
    UserSeedData.AssignMissingOwners(db);
}

app.UseExceptionHandler();
app.UseAuthentication();
app.UseAuthorization();
// Serve OpenAPI document and Scalar UI
app.MapOpenApi().AllowAnonymous();
app.MapScalarApiReference().AllowAnonymous();
app.MapControllers();

app.Run();
