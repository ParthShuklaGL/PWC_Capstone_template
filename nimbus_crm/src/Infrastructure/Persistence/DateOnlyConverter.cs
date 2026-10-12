using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace NimbusCrm.Infrastructure.Persistence;

/// <summary>
/// The MySql.EntityFrameworkCore provider writes a DateOnly to a date column but cannot read it back
/// (the driver hands over a DateTime and the cast fails). Going through DateTime on the way out makes
/// reads work; the column stays a plain "date".
/// </summary>
public sealed class DateOnlyConverter()
    : ValueConverter<DateOnly, DateTime>(
        value => value.ToDateTime(TimeOnly.MinValue),
        value => DateOnly.FromDateTime(value));
