using System.ComponentModel.DataAnnotations;

namespace NimbusSales.Crm.Web.Dto;

public class AccountRequest
{
    [Required(ErrorMessage = "name is required")]
    [StringLength(200, ErrorMessage = "name must be 200 characters or fewer")]
    public string? Name { get; set; }

    [StringLength(80, ErrorMessage = "industry must be 80 characters or fewer")]
    public string? Industry { get; set; }

    [StringLength(80, ErrorMessage = "country must be 80 characters or fewer")]
    public string? Country { get; set; }

    [StringLength(200, ErrorMessage = "website must be 200 characters or fewer")]
    public string? Website { get; set; }
}

public class ContactCreateRequest
{
    [Required(ErrorMessage = "accountRef is required")]
    public string? AccountRef { get; set; }

    [Required(ErrorMessage = "firstName is required")]
    [StringLength(80, ErrorMessage = "firstName must be 80 characters or fewer")]
    public string? FirstName { get; set; }

    [Required(ErrorMessage = "lastName is required")]
    [StringLength(80, ErrorMessage = "lastName must be 80 characters or fewer")]
    public string? LastName { get; set; }

    [Required(ErrorMessage = "email is required")]
    [EmailAddress(ErrorMessage = "email must be a valid email address")]
    [StringLength(160, ErrorMessage = "email must be 160 characters or fewer")]
    public string? Email { get; set; }

    [StringLength(40, ErrorMessage = "phone must be 40 characters or fewer")]
    public string? Phone { get; set; }

    [StringLength(120, ErrorMessage = "jobTitle must be 120 characters or fewer")]
    public string? JobTitle { get; set; }
}

public class LoginRequest
{
    [Required(ErrorMessage = "email is required")]
    public string? Email { get; set; }

    [Required(ErrorMessage = "password is required")]
    public string? Password { get; set; }
}

public class UserResponse
{
    public string UserRef { get; set; } = string.Empty;

    public string DisplayName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    /// <summary>ADMIN or USER.</summary>
    public string Role { get; set; } = string.Empty;
}

public class LoginResponse
{
    public string Token { get; set; } = string.Empty;

    public DateTimeOffset ExpiresAt { get; set; }

    public UserResponse User { get; set; } = new();
}
