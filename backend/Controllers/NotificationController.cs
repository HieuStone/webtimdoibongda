using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TimDoiBongDa.Api.Data;
using TimDoiBongDa.Api.Interfaces;
using TimDoiBongDa.Api.Models;

namespace TimDoiBongDa.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IBaseServices _baseServices;

    public NotificationController(AppDbContext context, IBaseServices baseServices)
    {
        _context = context;
        _baseServices = baseServices;
    }

    [HttpGet]
    public async Task<IActionResult> GetMyNotifications()
    {
        var userId = _baseServices.GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var notifications = await _context.Notifications
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .Select(n => new
            {
                n.Id,
                n.Message,
                n.ActionLink,
                n.IsRead,
                n.CreatedAt
            })
            .ToListAsync();

        return Ok(notifications);
    }

    [HttpPost("{id}/read")]
    public async Task<IActionResult> MarkAsRead(long id)
    {
        var userId = _baseServices.GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var notif = await _context.Notifications.FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);
        if (notif == null) return NotFound(new { message = "Thông báo không tồn tại." });

        notif.IsRead = true;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Đã đánh dấu đọc." });
    }

    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllAsRead()
    {
        var userId = _baseServices.GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var unreadNotifs = await _context.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .ToListAsync();

        foreach (var n in unreadNotifs)
        {
            n.IsRead = true;
        }

        if (unreadNotifs.Any())
        {
            await _context.SaveChangesAsync();
        }

        return Ok(new { message = "Đã đọc tất cả." });
    }
}
