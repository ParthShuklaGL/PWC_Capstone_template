using Mediator;
using NimbusCrm.Api.Auth;
using NimbusCrm.Application.Common;
using NimbusCrm.Application.Crm;
using NimbusCrm.Domain.Enums;

namespace NimbusCrm.Api.Endpoints;

public static class CrmEndpoints
{
    /// <summary>
    /// Accounts, contacts and deals: list, get, create, update, delete.
    ///   GET    /api/{resource}?page=0&amp;size=20&amp;search=...   one page, with the total
    ///   GET    /api/{resource}/{id}
    ///   POST   /api/{resource}                              201 and the new row
    ///   PUT    /api/{resource}/{id}                         the whole row again; 200 and the saved row
    ///   DELETE /api/{resource}/{id}                         204; ADMIN only
    /// Every route needs a signed-in caller. Changes made with a cookie or session also need the CSRF token.
    /// </summary>
    public static IEndpointRouteBuilder MapCrmEndpoints(this IEndpointRouteBuilder app)
    {
        var crm = app.MapGroup("/api")
            .RequireAuthorization()
            .AddEndpointFilter<NoStoreEndpointFilter>()
            .AddEndpointFilter<CsrfEndpointFilter>();

        var accounts = crm.MapGroup("/accounts");
        accounts.MapGet("/", async (ISender sender, CancellationToken ct, int page = 0, int size = 20, string? search = null) =>
            Results.Ok(await sender.Send(new ListAccountsQuery(page, size, search), ct)));
        accounts.MapGet("/{id:long}", async (long id, ISender sender, CancellationToken ct) =>
            Respond(await sender.Send(new GetAccountQuery(id), ct)));
        accounts.MapPost("/", async (AccountInput input, ISender sender, CancellationToken ct) =>
            Created("/api/accounts", await sender.Send(new CreateAccountCommand(input), ct), account => account.Id));
        accounts.MapPut("/{id:long}", async (long id, AccountInput input, ISender sender, CancellationToken ct) =>
            Respond(await sender.Send(new UpdateAccountCommand(id, input), ct)));
        accounts.MapDelete("/{id:long}", async (long id, ISender sender, CancellationToken ct) =>
            NoContent(await sender.Send(new DeleteAccountCommand(id), ct)))
            .RequireAuthorization(AuthenticationExtensions.AdminOnlyPolicy);

        var contacts = crm.MapGroup("/contacts");
        contacts.MapGet("/", async (ISender sender, CancellationToken ct,
                int page = 0, int size = 20, string? search = null, long? accountId = null, string? status = null) =>
            TryParseName<ContactStatus>(status, "status", out var parsedStatus, out var badStatus)
                ? Results.Ok(await sender.Send(new ListContactsQuery(page, size, search, accountId, parsedStatus), ct))
                : badStatus);
        contacts.MapGet("/{id:long}", async (long id, ISender sender, CancellationToken ct) =>
            Respond(await sender.Send(new GetContactQuery(id), ct)));
        contacts.MapPost("/", async (ContactInput input, ISender sender, CancellationToken ct) =>
            Created("/api/contacts", await sender.Send(new CreateContactCommand(input), ct), contact => contact.Id));
        contacts.MapPut("/{id:long}", async (long id, ContactInput input, ISender sender, CancellationToken ct) =>
            Respond(await sender.Send(new UpdateContactCommand(id, input), ct)));
        contacts.MapDelete("/{id:long}", async (long id, ISender sender, CancellationToken ct) =>
            NoContent(await sender.Send(new DeleteContactCommand(id), ct)))
            .RequireAuthorization(AuthenticationExtensions.AdminOnlyPolicy);

        var deals = crm.MapGroup("/deals");
        deals.MapGet("/", async (ISender sender, CancellationToken ct,
                int page = 0, int size = 20, string? search = null, string? stage = null, long? contactId = null, long? accountId = null) =>
            TryParseName<DealStage>(stage, "stage", out var parsedStage, out var badStage)
                ? Results.Ok(await sender.Send(new ListDealsQuery(page, size, search, parsedStage, contactId, accountId), ct))
                : badStage);
        deals.MapGet("/{id:long}", async (long id, ISender sender, CancellationToken ct) =>
            Respond(await sender.Send(new GetDealQuery(id), ct)));
        deals.MapPost("/", async (DealInput input, ISender sender, CancellationToken ct) =>
            Created("/api/deals", await sender.Send(new CreateDealCommand(input), ct), deal => deal.Id));
        deals.MapPut("/{id:long}", async (long id, DealInput input, ISender sender, CancellationToken ct) =>
            Respond(await sender.Send(new UpdateDealCommand(id, input), ct)));
        deals.MapDelete("/{id:long}", async (long id, ISender sender, CancellationToken ct) =>
            NoContent(await sender.Send(new DeleteDealCommand(id), ct)))
            .RequireAuthorization(AuthenticationExtensions.AdminOnlyPolicy);

        return app;
    }

    /// <summary>
    /// Reads a stage or status filter such as ?stage=WON. The framework's own binding is case-sensitive and would
    /// reject "WON", the very spelling the API returns, so the name is parsed here in any letter case. Numbers are
    /// refused, as they are in request bodies. Absent means no filter.
    /// </summary>
    private static bool TryParseName<TEnum>(string? raw, string field, out TEnum? value, out IResult? problem)
        where TEnum : struct, Enum
    {
        value = null;
        problem = null;
        if (string.IsNullOrWhiteSpace(raw))
        {
            return true;
        }

        if (raw.All(char.IsLetter) && Enum.TryParse<TEnum>(raw, ignoreCase: true, out var parsed))
        {
            value = parsed;
            return true;
        }

        var allowed = string.Join(", ", Enum.GetNames<TEnum>().Select(name => name.ToUpperInvariant()));
        problem = Results.ValidationProblem(
            new Dictionary<string, string[]> { [field] = [$"Must be one of: {allowed}."] });
        return false;
    }

    private static IResult Respond<T>(Result<T> result) =>
        result.IsSuccess ? Results.Ok(result.Value) : result.Error.ToProblem();

    private static IResult Created<T>(string basePath, Result<T> result, Func<T, long> id) =>
        result.IsSuccess ? Results.Created($"{basePath}/{id(result.Value)}", result.Value) : result.Error.ToProblem();

    private static IResult NoContent(Result<bool> result) =>
        result.IsSuccess ? Results.NoContent() : result.Error.ToProblem();
}
