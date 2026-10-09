using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using NimbusCrm.Api.Auth;

namespace NimbusCrm.IntegrationTests.Reports;

/// <summary>
/// The users-by-role report is mapped with the AdminOnly policy. These tests ask the real policy,
/// built by the same AddAuthModes the API uses, who it lets through.
/// </summary>
public class ReportAuthorizationTests
{
    private readonly IAuthorizationService _authorization;

    public ReportAuthorizationTests()
    {
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Jwt:Issuer"] = "test",
            ["Jwt:Audience"] = "test",
            ["Jwt:SigningKey"] = "a-test-only-signing-key-of-at-least-32-characters",
        }).Build();

        var services = new ServiceCollection().AddLogging();
        services.AddAuthModes(configuration, new TestEnvironment());
        _authorization = services.BuildServiceProvider().GetRequiredService<IAuthorizationService>();
    }

    [Fact]
    public async Task AdminOnlyPolicyAcceptsAnAdmin()
    {
        var result = await _authorization.AuthorizeAsync(User("ADMIN"), AuthenticationExtensions.AdminOnlyPolicy);

        Assert.True(result.Succeeded);
    }

    [Fact]
    public async Task AdminOnlyPolicyRejectsAPlainUserAndSaysWhichRequirementFailed()
    {
        var result = await _authorization.AuthorizeAsync(User("USER"), AuthenticationExtensions.AdminOnlyPolicy);

        Assert.False(result.Succeeded);
        Assert.Contains(result.Failure!.FailedRequirements, requirement => requirement is Microsoft.AspNetCore.Authorization.Infrastructure.RolesAuthorizationRequirement);
    }

    [Fact]
    public async Task AdminOnlyPolicyRejectsAnAnonymousCaller()
    {
        var result = await _authorization.AuthorizeAsync(new ClaimsPrincipal(new ClaimsIdentity()), AuthenticationExtensions.AdminOnlyPolicy);

        Assert.False(result.Succeeded);
    }

    private static ClaimsPrincipal User(string role) =>
        AppClaims.Principal([new Claim(AppClaims.Subject, "1"), new Claim(AppClaims.Name, "test"), new Claim(AppClaims.Role, role)], "test");

    private sealed class TestEnvironment : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = Environments.Development;

        public string ApplicationName { get; set; } = "tests";

        public string ContentRootPath { get; set; } = AppContext.BaseDirectory;

        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
