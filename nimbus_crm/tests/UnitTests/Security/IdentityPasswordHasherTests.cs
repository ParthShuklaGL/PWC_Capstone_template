using NimbusCrm.Application.Abstractions;
using NimbusCrm.Infrastructure.Security;

namespace NimbusCrm.UnitTests.Security;

public class IdentityPasswordHasherTests
{
    private const string Password = "Correct-Horse-2026!";

    private readonly IdentityPasswordHasher _hasher = new();

    [Fact]
    public void HashDoesNotContainThePassword()
    {
        var hash = _hasher.Hash(Password);

        Assert.DoesNotContain(Password, hash);
    }

    [Fact]
    public void HashGivesADifferentValueEachTimeBecauseOfTheSalt()
    {
        Assert.NotEqual(_hasher.Hash(Password), _hasher.Hash(Password));
    }

    [Fact]
    public void VerifyAcceptsTheRightPassword()
    {
        Assert.Equal(PasswordCheck.Success, _hasher.Verify(_hasher.Hash(Password), Password));
    }

    [Fact]
    public void VerifyRejectsTheWrongPassword()
    {
        Assert.Equal(PasswordCheck.Failed, _hasher.Verify(_hasher.Hash(Password), "Wrong-Password-2026!"));
    }

    [Fact]
    public void VerifyRejectsAMissingHashWithoutThrowing()
    {
        Assert.Equal(PasswordCheck.Failed, _hasher.Verify(null, Password));
    }

    [Fact]
    public void HashUsesTheConfiguredWorkFactorAndSaysSoInItsHeader()
    {
        var bytes = Convert.FromBase64String(_hasher.Hash(Password));

        // ASP.NET Core Identity v3 format: 1 byte version, 4 bytes PRF, 4 bytes iteration count (big endian).
        Assert.Equal(1, bytes[0]);
        Assert.Equal(220_000, (bytes[5] << 24) | (bytes[6] << 16) | (bytes[7] << 8) | bytes[8]);
        Assert.Equal(IdentityPasswordHasher.IterationCount, 220_000);
    }

    [Fact]
    public void VerifyAcceptsAnOlderWeakerHashAndAsksForItToBeReplaced()
    {
        var weakHash = new IdentityPasswordHasher(10_000).Hash(Password);

        Assert.Equal(PasswordCheck.SuccessRehashNeeded, _hasher.Verify(weakHash, Password));
        Assert.Equal(PasswordCheck.Failed, _hasher.Verify(weakHash, "Wrong-Password-2026!"));
    }
}
