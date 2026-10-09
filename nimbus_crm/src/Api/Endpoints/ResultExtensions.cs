using NimbusCrm.Application.Common;

namespace NimbusCrm.Api.Endpoints;

public static class ResultExtensions
{
    /// <summary>Turns an expected business failure into an RFC 9457 problem response.</summary>
    public static IResult ToProblem(this Error error) => Results.Problem(
        statusCode: error.Type switch
        {
            ErrorType.Validation => StatusCodes.Status400BadRequest,
            ErrorType.Unauthorized => StatusCodes.Status401Unauthorized,
            ErrorType.NotFound => StatusCodes.Status404NotFound,
            ErrorType.Conflict => StatusCodes.Status409Conflict,
            _ => StatusCodes.Status500InternalServerError,
        },
        detail: error.Message,
        extensions: new Dictionary<string, object?> { ["code"] = error.Code });
}
