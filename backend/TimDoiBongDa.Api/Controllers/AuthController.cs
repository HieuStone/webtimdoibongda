using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using TimDoiBongDa.Application.Interfaces.Repositories;
using TimDoiBongDa.Application.DTOs.AuthDtos;
using TimDoiBongDa.Domain.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using Microsoft.EntityFrameworkCore;

namespace TimDoiBongDa.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IGenericRepository<User> _userRepo;
    private readonly IConfiguration _config;

    public AuthController(IGenericRepository<User> userRepo, IConfiguration config)
    {
        _userRepo = userRepo;
        _config = config;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        if (await _userRepo.ExistsAsync(u => u.Email == request.Email))
        {
            return BadRequest(new { message = "Email đã được sử dụng!" });
        }

        var user = new User
        {
            Name = request.Name,
            Email = request.Email,
            Password = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Phone = request.Phone,
            Role = "player" // Tài khoản đăng ký mặc định là player
        };

        _userRepo.AddAsync(user);
        await _userRepo.SaveAsync();

        return Ok(new { message = "Đăng ký thành công!" });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var user = await _userRepo.Find(u => u.Email == request.Email).FirstOrDefaultAsync();

        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.Password))
        {
            return Unauthorized(new { message = "Email hoặc mật khẩu không chính xác." });
        }

        var token = GenerateJwtToken(user);

        return Ok(new AuthResponse
        {
            Token = token,
            UserId = user.Id,
            Name = user.Name,
            Role = user.Role
        });
    }

    [Authorize]
    [HttpGet("profile")]
    public async Task<IActionResult> GetProfile()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId) || !long.TryParse(userId, out var id))
        {
            return Unauthorized();
        }

        var user = await _userRepo.Find(u => u.Id == id)
            .Select(u => new { u.Id, u.Name, u.Email, u.Phone, u.Avatar, u.Role, u.PreferredPosition, u.StrongFoot })
            .FirstOrDefaultAsync();
            
        if (user == null) return NotFound();

        return Ok(user);
    }

    private string GenerateJwtToken(User user)
    {
        var jwtSettings = _config.GetSection("Jwt");
        var key = Encoding.UTF8.GetBytes(jwtSettings["Key"] ?? string.Empty);
        
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(ClaimTypes.Name, user.Name),
            new Claim(ClaimTypes.Role, user.Role),
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString())
        };

        var credentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256);

        var expireDays = Convert.ToInt32(jwtSettings["ExpireDays"] ?? "1");
        
        var token = new JwtSecurityToken(
            issuer: jwtSettings["Issuer"],
            audience: jwtSettings["Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddDays(expireDays),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
