namespace NimbusCrm.Application.Common;

public enum ErrorType
{
    Validation,
    Unauthorized,
    Conflict,
    NotFound,
}

/// <summary>A business failure the caller is expected to handle. Not an exception.</summary>
public sealed record Error(string Code, string Message, ErrorType Type);

public sealed class Result<T>
{
    private readonly T? _value;
    private readonly Error? _error;

    private Result(T value)
    {
        _value = value;
        IsSuccess = true;
    }

    private Result(Error error) => _error = error;

    public bool IsSuccess { get; }

    public T Value => IsSuccess
        ? _value!
        : throw new InvalidOperationException("A failed result has no value.");

    public Error Error => !IsSuccess
        ? _error!
        : throw new InvalidOperationException("A successful result has no error.");

    public static Result<T> Success(T value) => new(value);

    public static Result<T> Failure(Error error) => new(error);

    public static implicit operator Result<T>(T value) => Success(value);

    public static implicit operator Result<T>(Error error) => Failure(error);
}
