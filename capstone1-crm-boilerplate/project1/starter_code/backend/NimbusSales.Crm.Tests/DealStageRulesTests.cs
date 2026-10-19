using NimbusSales.Crm.Domain;

namespace NimbusSales.Crm.Tests;

/// <summary>
/// The pipeline rules, on their own. Pure logic: no database, no substitutes.
/// </summary>
public class DealStageRulesTests
{
    [Theory]
    [InlineData(DealStage.Prospecting, DealStage.Qualified)]
    [InlineData(DealStage.Qualified, DealStage.Proposal)]
    [InlineData(DealStage.Proposal, DealStage.Negotiation)]
    [InlineData(DealStage.Negotiation, DealStage.Won)]
    [InlineData(DealStage.Qualified, DealStage.Prospecting)]
    [InlineData(DealStage.Proposal, DealStage.Qualified)]
    [InlineData(DealStage.Negotiation, DealStage.Proposal)]
    [InlineData(DealStage.Prospecting, DealStage.Lost)]
    [InlineData(DealStage.Negotiation, DealStage.Lost)]
    public void AllowsTheMovesThePipelineAllows(DealStage from, DealStage to)
    {
        Assert.True(DealStageRules.CanMove(from, to));
        Assert.Null(DealStageRules.Refusal(from, to));
    }

    [Theory]
    [InlineData(DealStage.Prospecting, DealStage.Proposal)]
    [InlineData(DealStage.Prospecting, DealStage.Negotiation)]
    [InlineData(DealStage.Qualified, DealStage.Negotiation)]
    [InlineData(DealStage.Negotiation, DealStage.Qualified)]
    [InlineData(DealStage.Negotiation, DealStage.Prospecting)]
    [InlineData(DealStage.Prospecting, DealStage.Won)]
    [InlineData(DealStage.Proposal, DealStage.Won)]
    public void RefusesAJumpOfMoreThanOneStage(DealStage from, DealStage to)
    {
        Assert.False(DealStageRules.CanMove(from, to));
        Assert.NotNull(DealStageRules.Refusal(from, to));
    }

    [Theory]
    [InlineData(DealStage.Won, DealStage.Negotiation)]
    [InlineData(DealStage.Won, DealStage.Lost)]
    [InlineData(DealStage.Lost, DealStage.Prospecting)]
    [InlineData(DealStage.Lost, DealStage.Won)]
    public void WonAndLostAreFinal(DealStage from, DealStage to)
    {
        Assert.False(DealStageRules.CanMove(from, to));
    }

    [Theory]
    [InlineData(DealStage.Prospecting)]
    [InlineData(DealStage.Won)]
    public void RefusesAMoveToTheSameStage(DealStage stage)
    {
        Assert.False(DealStageRules.CanMove(stage, stage));
    }

    [Theory]
    [InlineData("PROSPECTING", true)]
    [InlineData("negotiation", true)]
    [InlineData("WON", true)]
    [InlineData("CUSTOMERS", false)]
    [InlineData("3", false)]
    [InlineData("", false)]
    [InlineData(null, false)]
    public void ParsesStageNamesAndNothingElse(string? value, bool expected)
    {
        Assert.Equal(expected, DealStageRules.TryParse(value, out _));
    }

    [Fact]
    public void OnlyWonAndLostAreClosed()
    {
        Assert.True(DealStageRules.IsOpen(DealStage.Negotiation));
        Assert.True(DealStageRules.IsFinal(DealStage.Won));
        Assert.True(DealStageRules.IsFinal(DealStage.Lost));
    }
}
