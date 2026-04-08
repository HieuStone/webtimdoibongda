using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using TimDoiBongDa.Api.Data;
using TimDoiBongDa.Api.Models;

namespace TimDoiBongDa.Api.Hubs;

[Authorize]
public class ChatHub : Hub
{
    private readonly AppDbContext _context;

    public ChatHub(AppDbContext context)
    {
        _context = context;
    }

    public async Task JoinRoom(string roomType, long roomId)
    {
        var groupName = $"{roomType}_{roomId}";
        await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
    }

    public async Task LeaveRoom(string roomType, long roomId)
    {
        var groupName = $"{roomType}_{roomId}";
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);
    }

    public async Task SendMessage(string roomType, long roomId, string message)
    {
        var userIdString = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString) || !long.TryParse(userIdString, out var userId))
            return;

        // Tải thông tin User để trả về tên
        var senderUser = await _context.Users.FindAsync(userId);
        if (senderUser == null) return;

        // Phân quyền: Cực kỳ quan trọng
        // Nếu roomType = TEAM, user phải là thành viên hoặc quản lý của TEAM đó
        if (roomType == "TEAM")
        {
            var isManager = await _context.Teams.AnyAsync(t => t.Id == roomId && t.ManagerId == userId);
            var isMember = await _context.TeamUsers.AnyAsync(tu => tu.TeamId == roomId && tu.UserId == userId);
            if (!isManager && !isMember) return; // Không có quyền
        }
        else if (roomType == "MATCH")
        {
            // Tạm thời đơn giản: Chỉ cần check nếu là Manager của các đội trong trận đấu mới được chat
            var match = await _context.Matches
                .Include(m => m.CreatorTeam)
                .Include(m => m.OpponentTeam)
                .FirstOrDefaultAsync(m => m.Id == roomId);

            if (match == null) return;

            // Ai được chat trong kèo? Đội trưởng Creator, Đội trưởng Opponent, và các đội trưởng đang chờ duyệt.
            // Để đơn giản về tính khả thi MVP: Mình sẽ cho phép những người liên quan ở trang chi tiết đó gửi tin nhắn.
            // Validate: 
            var isCreatorManager = match.CreatorTeam?.ManagerId == userId;
            var isOpponentManager = match.OpponentTeam?.ManagerId == userId;
            
            var requestingTeamIds = await _context.MatchRequests
                .Where(r => r.MatchId == roomId)
                .Select(r => r.RequestingTeamId)
                .ToListAsync();
            
            var isRequestingManager = await _context.Teams
                .AnyAsync(t => requestingTeamIds.Contains(t.Id) && t.ManagerId == userId);

            if (!isCreatorManager && !isOpponentManager && !isRequestingManager)
                return; // Không liên quan không cho chat
        }
        else
        {
            return; // Invalid room type
        }

        var chatMessage = new ChatMessage
        {
            RoomType = roomType,
            RoomId = roomId,
            SenderId = userId,
            Message = message,
            CreatedAt = DateTime.UtcNow
        };

        _context.ChatMessages.Add(chatMessage);
        await _context.SaveChangesAsync();

        var groupName = $"{roomType}_{roomId}";
        
        // Gửi Event tới nhóm
        await Clients.Group(groupName).SendAsync("ReceiveMessage", new
        {
            id = chatMessage.Id,
            roomType = chatMessage.RoomType,
            roomId = chatMessage.RoomId,
            senderId = chatMessage.SenderId,
            senderName = senderUser.Name,
            message = chatMessage.Message,
            createdAt = chatMessage.CreatedAt
        });
    }
}
