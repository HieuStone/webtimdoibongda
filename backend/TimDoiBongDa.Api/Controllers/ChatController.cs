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
public class ChatController : ControllerBase
{
    private readonly IGenericRepository<ChatMessage> _chatRepo;
    private readonly ITeamUserRepository _teamUserRepo;
    private readonly IMatchRepository _matchRepo;
    private readonly IMatchRequestRepository _matchRequestRepo;
    private readonly ITeamRepository _teamRepo;
    private readonly IBaseServices _baseServices;

    public ChatController(
        IGenericRepository<ChatMessage> chatRepo,
        ITeamUserRepository teamUserRepo,
        IMatchRepository matchRepo,
        IMatchRequestRepository matchRequestRepo,
        ITeamRepository teamRepo,
        IBaseServices baseServices)
    {
        _chatRepo = chatRepo;
        _teamUserRepo = teamUserRepo;
        _matchRepo = matchRepo;
        _matchRequestRepo = matchRequestRepo;
        _teamRepo = teamRepo;
        _baseServices = baseServices;
    }

    [HttpGet("{roomType}/{roomId}")]
    public async Task<IActionResult> GetMessagesHistory(string roomType, long roomId)
    {
        var userId = _baseServices.GetCurrentUserId();
        if (userId == null) return Unauthorized();
            
        // Check quyền (Tương tự logic trong Hub để không bị leak tin báo)
        if (roomType == "TEAM")
        {
            var isManager = await _baseServices.IsTeamManagerAsync(roomId, userId.Value);
            var isMember = await _teamUserRepo.ExistsAsync(tu => tu.TeamId == roomId && tu.UserId == userId);
            if (!isManager && !isMember) return Forbid(); 
        }
        else if (roomType == "MATCH")
        {
            var match = await _matchRepo.GetByIdWithTeamsAsync(roomId);

            if (match == null) return NotFound();

            var isCreatorManager = match.CreatorTeam?.ManagerId == userId;
            var isOpponentManager = match.OpponentTeam?.ManagerId == userId;
            
            var requestingTeamIds = await _matchRequestRepo.Find(r => r.MatchId == roomId)
                .Select(r => r.RequestingTeamId)
                .ToListAsync();
            
            var isRequestingManager = await _teamRepo.ExistsAsync(t => requestingTeamIds.Contains(t.Id) && t.ManagerId == userId);

            if (!isCreatorManager && !isOpponentManager && !isRequestingManager)
                return Forbid();
        }
        else
        {
            return BadRequest(new { message = "Loại phòng không hợp lệ." });
        }

        var messages = await _chatRepo.Find(m => m.RoomType == roomType && m.RoomId == roomId)
            .Include(m => m.Sender)
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
