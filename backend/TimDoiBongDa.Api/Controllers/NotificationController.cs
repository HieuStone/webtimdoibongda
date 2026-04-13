using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TimDoiBongDa.Application.Interfaces;
using TimDoiBongDa.Application.Interfaces.Repositories;
using TimDoiBongDa.Domain.Entities;

namespace TimDoiBongDa.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationController : ControllerBase
{
    private readonly IGenericRepository<Notification> _notificationRepo;
    private readonly IBaseServices _baseServices;

    public NotificationController(IGenericRepository<Notification> notificationRepo, IBaseServices baseServices)
    {
        _notificationRepo = notificationRepo;
        _baseServices = baseServices;
    }

    [HttpGet]
    public async Task<IActionResult> GetMyNotifications()
    {
        var userId = _baseServices.GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var notifications = await _notificationRepo.Find(n => n.UserId == userId)
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

        var notif = await _notificationRepo.Find(n => n.Id == id && n.UserId == userId).FirstOrDefaultAsync();
        if (notif == null) return NotFound(new { message = "Thông báo không tồn tại." });

        notif.IsRead = true;
        _notificationRepo.Update(notif);
        await _notificationRepo.SaveAsync();

        return Ok(new { message = "Đã đánh dấu đọc." });
    }

    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllAsRead()
    {
        var userId = _baseServices.GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var unreadNotifs = await _notificationRepo.Find(n => n.UserId == userId && !n.IsRead)
            .ToListAsync();

        foreach (var n in unreadNotifs)
        {
            n.IsRead = true;
            _notificationRepo.Update(n);
        }

        if (unreadNotifs.Any())
        {
            await _notificationRepo.SaveAsync();
        }

        return Ok(new { message = "Đã đọc tất cả." });
    }
}
