using NimbusCrm.Api.Auth;
using NimbusCrm.Application.Users;

namespace NimbusCrm.IntegrationTests.Auth;

public class AuthLogicTests
{
    [Theory]
    [InlineData("Jwt", AuthMode.Jwt)]
    [InlineData("cookie", AuthMode.Cookie)]
    [InlineData("SESSION", AuthMode.Session)]
    [InlineData("  Cookie  ", AuthMode.Cookie)]
    public void AuthModeParserAcceptsTheThreeNamesInAnyCase(string text, AuthMode expected)
    {
        Assert.True(AuthModeParser.TryParse(text, out var mode));
        Assert.Equal(expected, mode);
    }

    [Theory]
    [InlineData("1")]
    [InlineData("2")]
    [InlineData("99")]
    [InlineData("-5")]
    [InlineData(" 1 ")]
    [InlineData("Cookie,Jwt")]
    [InlineData("Carrier-pigeon")]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public void AuthModeParserRefusesNumbersListsAndUnknownNames(string? text)
    {
        Assert.False(AuthModeParser.TryParse(text, out _));
    }

    [Fact]
    public void ARandomLookingSigningKeyIsAccepted()
    {
        var key = Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(48));

        Assert.Null(JwtOptionsValidator.Check(key));
    }

    [Theory]
    [InlineData("short")]
    [InlineData("")]
    [InlineData("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")]
    [InlineData("abababababababababababababababababababab")]
    [InlineData("0123456789012345678901234567890123456789")]
    public void ATooShortOrRepetitiveSigningKeyIsRejectedWithAReason(string key)
    {
        Assert.NotNull(JwtOptionsValidator.Check(key));
    }

    [Fact]
    public void TheValidatorNamesTheSettingThatIsWrongIncludingPreviousKeys()
    {
        var good = Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(48));
        var options = new JwtOptions { Issuer = "i", Audience = "a", SigningKey = good, PreviousSigningKeys = ["weak"] };

        var result = new JwtOptionsValidator().Validate(null, options);

        Assert.True(result.Failed);
        Assert.Contains("Jwt:PreviousSigningKeys[0]", Assert.Single(result.Failures!));
    }

    [Theory]
    [InlineData(0, 20, true)]
    [InlineData(10_000, 100, true)]
    [InlineData(10_001, 20, false)]
    [InlineData(int.MaxValue, 100, false)]
    [InlineData(-1, 20, false)]
    [InlineData(0, 0, false)]
    [InlineData(0, 101, false)]
    public void ListUsersPagingIsBoundedSoPageTimesSizeCannotOverflow(int page, int size, bool valid)
    {
        var result = new ListUsersQueryValidator().Validate(new ListUsersQuery(page, size));

        Assert.Equal(valid, result.IsValid);
    }
}
