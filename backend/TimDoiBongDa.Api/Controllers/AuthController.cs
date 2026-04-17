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
    private readonly IHttpClientFactory _httpClientFactory;

    public AuthController(IGenericRepository<User> userRepo, IConfiguration config, IHttpClientFactory httpClientFactory)
    {
        _userRepo = userRepo;
        _config = config;
        _httpClientFactory = httpClientFactory;
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

        await _userRepo.AddAsync(user);
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

    [HttpPost("facebook-login")]
    public async Task<IActionResult> FacebookLogin([FromBody] FacebookLoginRequest request)
    {
        //var facebookSettings = _config.GetSection("Facebook");
        //var appId = facebookSettings["AppId"];
        //var appSecret = facebookSettings["AppSecret"];

        if (string.IsNullOrEmpty(appId) || string.IsNullOrEmpty(appSecret))
        {
            return StatusCode(500, new { message = "Cấu hình Facebook chưa hoàn chỉnh trên server." });
        }

        var client = _httpClientFactory.CreateClient();
        
        // 1. Validate token với Facebook (Security check)
        // Link: https://developers.facebook.com/docs/facebook-login/guides/access-tokens/debugging/
        //var debugTokenUrl = $"https://graph.facebook.com/debug_token?input_token={request.AccessToken}&access_token={appId}|{appSecret}";
        //var debugResponse = await client.GetAsync(debugTokenUrl);
        
        //if (!debugResponse.IsSuccessStatusCode)
        //{
        //    return BadRequest(new { message = "Token Facebook không hợp lệ." });
        //}

        //var debugData = await debugResponse.Content.ReadFromJsonAsync<FacebookDebugTokenResponse>();
        //if (debugData?.Data == null || !debugData.Data.IsValid || debugData.Data.AppId != appId)
        //{
        //    return BadRequest(new { message = "Xác thực token Facebook thất bại." });
        //}

        // 2. Lấy thông tin user
        var fbResponse = await client.GetAsync($"https://graph.facebook.com/me?fields=id,name,email,picture&access_token={request.AccessToken}");

        if (!fbResponse.IsSuccessStatusCode)
        {
            return BadRequest(new { message = "Không thể lấy thông tin từ Facebook." });
        }

        var fbUser = await fbResponse.Content.ReadFromJsonAsync<FacebookUserData>();
        if (fbUser == null || string.IsNullOrEmpty(fbUser.Id))
        {
            return BadRequest(new { message = "Dữ liệu Facebook không hợp lệ." });
        }

        // Tìm user theo FacebookId hoặc Email
        var user = await _userRepo.Find(u => u.FacebookId == fbUser.Id || (fbUser.Email != null && u.Email == fbUser.Email))
            .FirstOrDefaultAsync();

        if (user == null)
        {
            // Nếu không tìm thấy, tạo user mới
            user = new User
            {
                Name = fbUser.Name,
                Email = fbUser.Email ?? $"{fbUser.Id}@facebook.com",
                FacebookId = fbUser.Id,
                Avatar = fbUser.Picture?.Data?.Url,
                Role = "player",
                Password = null
            };

            await _userRepo.AddAsync(user);
            await _userRepo.SaveAsync();
        }
        else if (string.IsNullOrEmpty(user.FacebookId))
        {
            // Nếu tìm thấy theo email nhưng chưa có FacebookId, thì liên kết tài khoản
            user.FacebookId = fbUser.Id;
            if (string.IsNullOrEmpty(user.Avatar))
            {
                user.Avatar = fbUser.Picture?.Data?.Url;
            }
            _userRepo.Update(user);
            await _userRepo.SaveAsync();
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

    private class FacebookDebugTokenResponse
    {
        public FacebookDebugTokenData? Data { get; set; }
    }

    private class FacebookDebugTokenData
    {
        [System.Text.Json.Serialization.JsonPropertyName("app_id")]
        public string? AppId { get; set; }
        
        [System.Text.Json.Serialization.JsonPropertyName("is_valid")]
        public bool IsValid { get; set; }
        
        [System.Text.Json.Serialization.JsonPropertyName("user_id")]
        public string? UserId { get; set; }
    }

    private class FacebookUserData
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Email { get; set; }
        public FacebookPicture? Picture { get; set; }
    }

    private class FacebookPicture
    {
        public FacebookPictureData? Data { get; set; }
    }

    private class FacebookPictureData
    {
        public string? Url { get; set; }
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
