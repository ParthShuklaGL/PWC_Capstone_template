using System.Globalization;
using System.Text;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using NimbusCrm.Api.Endpoints;

namespace NimbusCrm.IntegrationTests.Reports;

public class CsvExportTests
{
    [Fact]
    public void WriteProducesHeadersThenOneLinePerRowWithCrLfEndings()
    {
        var csv = CsvWriter.Write(
            ["Stage", "Deals", "TotalValueGbp"],
            [["PROSPECTING", "2", "3000.75"], ["WON", "1", "5000.00"]]);

        Assert.Equal("Stage,Deals,TotalValueGbp\r\nPROSPECTING,2,3000.75\r\nWON,1,5000.00\r\n", csv);
    }

    [Fact]
    public void CellQuotesCommasQuotesAndLineBreaksAndDoublesInnerQuotes()
    {
        Assert.Equal("\"Smith, Jane\"", CsvWriter.Cell("Smith, Jane"));
        Assert.Equal("\"say \"\"hi\"\"\"", CsvWriter.Cell("say \"hi\""));
        Assert.Equal("\"two\r\nlines\"", CsvWriter.Cell("two\r\nlines"));
        Assert.Equal("plain", CsvWriter.Cell("plain"));
        Assert.Equal(string.Empty, CsvWriter.Cell(string.Empty));
    }

    [Theory]
    [InlineData("=SUM(A1:A9)", "\"'=SUM(A1:A9)\"")]
    [InlineData("+1+1", "\"'+1+1\"")]
    [InlineData("-2+3", "\"'-2+3\"")]
    [InlineData("@cmd", "\"'@cmd\"")]
    public void CellDefusesTextThatASpreadsheetWouldRunAsAFormula(string input, string expected)
    {
        Assert.Equal(expected, CsvWriter.Cell(input));
    }

    [Fact]
    public void NumbersAlwaysUseADotAndTwoDecimalsWhateverTheMachineCulture()
    {
        var original = CultureInfo.CurrentCulture;
        try
        {
            CultureInfo.CurrentCulture = new CultureInfo("de-DE");

            Assert.Equal("1234.50", CsvWriter.Number(1234.5m).Text);
            Assert.Equal("1234567", CsvWriter.Number(1234567).Text);
        }
        finally
        {
            CultureInfo.CurrentCulture = original;
        }
    }

    [Fact]
    public async Task ToCsvFileSendsTheCsvBodyAsAnAttachmentWithTheRightHeaders()
    {
        var csv = CsvWriter.Write(["Role", "Users"], [["ADMIN", "1"], ["USER", "2"]]);
        var body = new MemoryStream();
        var http = new DefaultHttpContext
        {
            RequestServices = new ServiceCollection().AddLogging().BuildServiceProvider(),
            Response = { Body = body },
        };

        await ReportEndpoints.ToCsvFile(csv, "users-by-role-2026-10-08.csv").ExecuteAsync(http);

        Assert.Equal("text/csv; charset=utf-8", http.Response.ContentType);
        var disposition = http.Response.Headers.ContentDisposition.ToString();
        Assert.StartsWith("attachment;", disposition);
        Assert.Contains("filename=users-by-role-2026-10-08.csv", disposition);
        Assert.Equal(Encoding.UTF8.GetByteCount(csv), http.Response.ContentLength);
        Assert.Equal("Role,Users\r\nADMIN,1\r\nUSER,2\r\n", Encoding.UTF8.GetString(body.ToArray()));
    }

    [Fact]
    public void ANegativeNumberStaysANumberAndIsNotDefusedAsText()
    {
        var csv = CsvWriter.Write(["Change"], [[CsvWriter.Number(-5.5m)], [CsvWriter.Number(-3)]]);

        Assert.Equal("Change\r\n-5.50\r\n-3\r\n", csv);
    }

    [Fact]
    public void TheSameCharactersAsTextStillGetTheFormulaGuard()
    {
        var csv = CsvWriter.Write(["Name"], [["-5.50"]]);

        Assert.Equal("Name\r\n\"'-5.50\"\r\n", csv);
    }
}
