using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using NimbusSales.Crm.Auditing;
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

// There is no authentication and no authorisation in this application. There is no user
// table, no login, no token, no claim, and no concept of "the rep who owns this record".
// Every endpoint below is open to anyone who can reach the port. That was the
// contractor's decision in 2024 -- the CRM is only reachable on the office network --
// and it has never been revisited. Anything that needs to know *who* is calling cannot
// be built until authentication is added, and it would go here: an authentication
// scheme, then UseAuthentication/UseAuthorization further down.

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
    DealSeedData.Seed(db);
}

app.UseExceptionHandler();
// Serve OpenAPI document and Scalar UI
app.MapOpenApi();
app.MapScalarApiReference();
app.MapControllers();

app.Run();
