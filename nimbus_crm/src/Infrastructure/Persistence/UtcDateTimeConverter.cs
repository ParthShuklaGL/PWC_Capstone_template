using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace NimbusCrm.Infrastructure.Persistence;

/// <summary>
/// MySQL's datetime has no time zone, so a value read back is "unspecified" and would serialize
/// without a trailing Z. Everything this app writes is UTC, so mark it UTC on the way out.
/// </summary>
public sealed class UtcDateTimeConverter()
    : ValueConverter<DateTime, DateTime>(value => value, value => DateTime.SpecifyKind(value, DateTimeKind.Utc));
