using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TimDoiBongDa.Api.Data;

namespace TimDoiBongDa.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ChatController : ControllerBase
{
    private readonly AppDbContext _context;

    public ChatController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("{roomType}/{roomId}")]
    public async Task<IActionResult> GetMessagesHistory(string roomType, long roomId)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString) || !long.TryParse(userIdString, out var userId))
            return Unauthorized();
            
        // Check quyền (Tương tự logic trong Hub để không bị leak tin báo)
        if (roomType == "TEAM")
        {
            var isManager = await _context.Teams.AnyAsync(t => t.Id == roomId && t.ManagerId == userId);
            var isMember = await _context.TeamUsers.AnyAsync(tu => tu.TeamId == roomId && tu.UserId == userId);
            if (!isManager && !isMember) return Forbid(); 
        }
        else if (roomType == "MATCH")
        {
            var match = await _context.Matches
                .Include(m => m.CreatorTeam)
                .Include(m => m.OpponentTeam)
                .FirstOrDefaultAsync(m => m.Id == roomId);

            if (match == null) return NotFound();

            var isCreatorManager = match.CreatorTeam?.ManagerId == userId;
            var isOpponentManager = match.OpponentTeam?.ManagerId == userId;
            
            var requestingTeamIds = await _context.MatchRequests
                .Where(r => r.MatchId == roomId)
                .Select(r => r.RequestingTeamId)
                .ToListAsync();
            
            var isRequestingManager = await _context.Teams
                .AnyAsync(t => requestingTeamIds.Contains(t.Id) && t.ManagerId == userId);

            if (!isCreatorManager && !isOpponentManager && !isRequestingManager)
                return Forbid();
        }
        else
        {
            return BadRequest(new { message = "Loại phòng không hợp lệ." });
        }

        var messages = await _context.ChatMessages
            .Include(m => m.Sender)
            .Where(m => m.RoomType == roomType && m.RoomId == roomId)
            .OrderBy(m => m.CreatedAt)
            .Select(m => new
            {
                id = m.Id,
                roomType = m.RoomType,
                roomId = m.RoomId,
                senderId = m.SenderId,
                senderName = m.Sender != null ? m.Sender.Name : "N/A",
                message = m.Message,
                createdAt = m.CreatedAt
            })
            .ToListAsync();

        return Ok(messages);
    }
}
