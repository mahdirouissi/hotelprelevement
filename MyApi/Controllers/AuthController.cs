using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using MyApi.Data;
using MyApi.Models;

namespace MyApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IConfiguration _configuration;
    private readonly ApplicationDbContext _context;

    public AuthController(IConfiguration configuration, ApplicationDbContext context)
    {
        _configuration = configuration;
        _context = context;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<TokenResponse>> Login([FromBody] LoginModel model)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == model.Email);

        if (user == null || !VerifyPassword(model.Password, user.PasswordHash))
        {
            return Unauthorized(new { message = "Email ou mot de passe incorrect" });
        }

        var token = GenerateJwtToken(user);
        var expiration = DateTime.UtcNow.AddMinutes(
            Convert.ToDouble(_configuration["Jwt:ExpirationInMinutes"] ?? "60"));

        return Ok(new TokenResponse
        {
            Token = token,
            Expiration = expiration,
            Email = user.Email,
            Username = user.Username,
            Role = user.Role
        });
    }

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<ActionResult<TokenResponse>> Register([FromBody] RegisterModel model)
    {
        if (await _context.Users.AnyAsync(u => u.Username == model.Username))
        {
            return BadRequest(new { message = "Ce nom d'utilisateur est déjà utilisé" });
        }

        if (await _context.Users.AnyAsync(u => u.Email == model.Email))
        {
            return BadRequest(new { message = "Cet email est déjà utilisé" });
        }

        var user = new UserModel
        {
            Username = model.Username,
            Email = model.Email,
            PasswordHash = HashPassword(model.Password),
            Role = model.Role,
            CreatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var token = GenerateJwtToken(user);
        var expiration = DateTime.UtcNow.AddMinutes(
            Convert.ToDouble(_configuration["Jwt:ExpirationInMinutes"] ?? "60"));

        return CreatedAtAction(nameof(Login), new TokenResponse
        {
            Token = token,
            Expiration = expiration,
            Email = user.Email,
            Role = user.Role
        });
    }

    [HttpGet("users")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<IEnumerable<object>>> GetUsers()
    {
        var users = await _context.Users.Select(u => new
        {
            u.Id,
            u.Username,
            u.Email,
            u.Role,
            u.CreatedAt
        }).ToListAsync();

        return Ok(users);
    }

    private string GenerateJwtToken(UserModel user)
    {
        var jwtSettings = _configuration.GetSection("Jwt");
        var key = Encoding.ASCII.GetBytes(jwtSettings["Key"] ?? "YourSuperSecretKeyHere12345678901234567890");

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role)
        };

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddMinutes(
                Convert.ToDouble(jwtSettings["ExpirationInMinutes"] ?? "60")),
            Issuer = jwtSettings["Issuer"] ?? "MyApi",
            Audience = jwtSettings["Audience"] ?? "MyApiUsers",
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(key),
                SecurityAlgorithms.HmacSha256Signature)
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }

    private string HashPassword(string password)
    {
        return BCrypt.Net.BCrypt.HashPassword(password);
    }

    private bool VerifyPassword(string password, string hash)
    {
        return BCrypt.Net.BCrypt.Verify(password, hash);
    }
}
