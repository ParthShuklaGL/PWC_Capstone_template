using System.Net;
using Mediator;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.HttpOverrides;
using NimbusCrm.Api.Auth;
using NimbusCrm.Api.Endpoints;
using NimbusCrm.Api.ErrorHandling;
using NimbusCrm.Application;
using NimbusCrm.Application.Behaviors;
using NimbusCrm.Infrastructure;
using Scalar.AspNetCore;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((context, services, configuration) => configuration
    .ReadFrom.Configuration(context.Configuration)
    .ReadFrom.Services(services)
    .Enrich.FromLogContext());

builder.Services.AddOpenApi();
builder.Services.AddHealthChecks();
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddApplication();
builder.Services.AddInfrastructure(
    builder.Configuration.GetConnectionString("Crm")
    ?? throw new InvalidOperationException(
        "ConnectionStrings:Crm is not configured. Set it with user-secrets or the ConnectionStrings__Crm environment variable."));
builder.Services.AddAuthModes(builder.Configuration, builder.Environment);
builder.Services.AddRateLimiter(options => options.AddLoginRateLimiter(
    builder.Configuration.GetValue($"{AuthOptions.SectionName}:{nameof(AuthOptions.LoginRateLimitPerMinute)}", 10)));
builder.Services.AddMediator(options =>
{
    options.ServiceLifetime = ServiceLifetime.Scoped;
    options.PipelineBehaviors = [typeof(ValidationBehavior<,>)];
});

// Behind a reverse proxy the caller's address and scheme arrive in X-Forwarded-* headers. Only proxies
// listed in Network:TrustedProxies (plus loopback) are believed; from anyone else the headers are ignored.
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    foreach (var proxy in builder.Configuration.GetSection("Network:TrustedProxies").Get<string[]>() ?? [])
    {
        options.KnownProxies.Add(IPAddress.Parse(proxy));
    }
});

// Auth cookies, session cookies and anti-forgery tokens are all protected with these keys. Without a
// persistent, shared key ring every restart (or a second instance) invalidates all of them.
var dataProtection = builder.Services.AddDataProtection().SetApplicationName("nimbus-crm");
var keysPath = builder.Configuration["DataProtection:KeysPath"];
if (!string.IsNullOrWhiteSpace(keysPath))
{
    dataProtection.PersistKeysToFileSystem(new DirectoryInfo(keysPath));
}

if (builder.Environment.IsDevelopment() && builder.Configuration.GetValue<bool>("Seed:Enabled"))
{
    builder.Services.AddDevelopmentSeeding(builder.Configuration);
}

var app = builder.Build();

if (!app.Environment.IsDevelopment() && string.IsNullOrWhiteSpace(keysPath))
{
    app.Logger.LogWarning(
        "DataProtection:KeysPath is not set. Keys use the host's default location and may not survive a restart or be shared between instances.");
}

app.UseForwardedHeaders();

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}

if (app.Configuration.GetValue<bool>("Security:RequireHttps"))
{
    app.UseHttpsRedirection();
}

app.UseSerilogRequestLogging();
app.UseExceptionHandler();

// ASP.NET Core has built-in middleware for HSTS and HTTPS redirection but none for these two headers.
app.Use(async (context, next) =>
{
    context.Response.OnStarting(() =>
    {
        context.Response.Headers["X-Content-Type-Options"] = "nosniff";
        context.Response.Headers["Referrer-Policy"] = "no-referrer";
        return Task.CompletedTask;
    });
    await next(context);
});

app.UseRateLimiter();
app.UseSession();
app.UseAuthentication();
app.UseAuthorization();
app.UseAntiforgery();

// The API description and its browsable UI reveal every route, so they are off outside Development
// unless Docs:Enabled is set on purpose.
if (app.Environment.IsDevelopment() || app.Configuration.GetValue<bool>("Docs:Enabled"))
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.MapHealthChecks("/health");
app.MapAuthEndpoints();
app.MapReportEndpoints();

app.Run();
