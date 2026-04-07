using System.ComponentModel.DataAnnotations;

namespace MyApi.Models;

public class UserModel
{
    public int Id { get; set; }
    
    [Required(ErrorMessage = "Le nom d'utilisateur est requis")]
    [MaxLength(50)]
    public string Username { get; set; } = string.Empty;
    
    [Required(ErrorMessage = "L'email est requis")]
    [MaxLength(100)]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
    
    [Required(ErrorMessage = "Le mot de passe est requis")]
    public string PasswordHash { get; set; } = string.Empty;
    
    [Required(ErrorMessage = "Le rôle est requis")]
    [MaxLength(20)]
    public string Role { get; set; } = Roles.User;
    
    // Service name for Service role users
    [MaxLength(100)]
    public string? ServiceName { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
