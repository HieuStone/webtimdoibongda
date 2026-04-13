using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TimDoiBongDa.Api.Data;
using TimDoiBongDa.Api.Interfaces;
using TimDoiBongDa.Api.Models;

namespace TimDoiBongDa.Api.Controllers;

public class CreateAttendanceSessionRequest
{
    public long TeamId { get; set; }
    public DateTime TargetDate { get; set; }
    public long? MatchId { get; set; }
    public string? Title { get; set; }
}

public class VoteAttendanceRequest
{
    public bool IsAttending { get; set; }
    public string? Note { get; set; }
}

[ApiController]
[Route("api/[controller]")]
public class AttendanceController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IBaseServices _baseServices;

    public AttendanceController(AppDbContext context, IBaseServices baseServices)
    {
        _context = context;
        _baseServices = baseServices;
    }

    [Authorize]
    [HttpPost("session")]
    public async Task<IActionResult> CreateSession([FromBody] CreateAttendanceSessionRequest req)
    {
        var managerId = _baseServices.GetCurrentUserId();
        if (managerId == null) return Unauthorized();

        // Xác minh quyền là quản lý của đội
        var isManager = await _baseServices.IsTeamManagerAsync(req.TeamId, managerId.Value);
        if (!isManager) return Forbid();

        var session = new AttendanceSession
        {
            TeamId = req.TeamId,
            TargetDate = req.TargetDate,
            MatchId = req.MatchId,
            Title = req.Title ?? "Điểm danh nội bộ",
            CreatedAt = DateTime.UtcNow
        };

        _context.AttendanceSessions.Add(session);
        await _context.SaveChangesAsync();

        // Nổ thông báo cho tất cả thành viên trong đội
        var teamMembers = await _context.TeamUsers
            .Where(tu => tu.TeamId == req.TeamId && tu.UserId != managerId)
            .Select(tu => tu.UserId)
            .ToListAsync();

        foreach (var memberId in teamMembers)
        {
            _context.Notifications.Add(new Notification
            {
                UserId = memberId,
                Message = $"Đội trưởng vừa tạo phiếu điểm danh: {session.Title}. Bạn vào báo Đi / Nghỉ nhé!",
                ActionLink = "/my-matches" // Route về đúng tab Lịch của tôi để xem lịch và vote
            });
        }

        if (teamMembers.Any())
        {
            await _context.SaveChangesAsync();
        }

        return Ok(new { message = "Lịch điểm danh đã được tạo thành công", sessionId = session.Id });
    }

    /// Lấy tất cả lịch điểm danh CỦA TẤT CẢ CÁC ĐỘI mà User thuộc về để trộn chung vào MyMatchesPage
    [Authorize]
    [HttpGet("my-sessions")]
    public async Task<IActionResult> GetMySessions()
    {
        var userId = _baseServices.GetCurrentUserId();
        if (userId == null) return Unauthorized();

        // Lấy tất cả team mà user tham gia
        var myTeamIds = await _baseServices.GetUserTeamIdsAsync(userId.Value);
        var managedTeamIds = await _baseServices.GetManagedTeamIdsAsync(userId.Value);
        var allTeamIds = myTeamIds.Union(managedTeamIds).Distinct().ToList();

        var sessions = await _context.AttendanceSessions
            .Include(s => s.Team)
            .Include(s => s.Votes).ThenInclude(v => v.User)
            .Where(s => allTeamIds.Contains(s.TeamId))
            .OrderBy(s => s.TargetDate)
            .Select(s => new
            {
                Id = s.Id,
                TeamId = s.TeamId,
                TeamName = s.Team != null ? s.Team.Name : "N/A",
                TargetDate = s.TargetDate,
                MatchId = s.MatchId,
                Title = s.Title,
                Votes = s.Votes.Select(v => new
                {
                    UserId = v.UserId,
                    UserName = v.User != null ? v.User.Name : "N/A",
                    IsAttending = v.IsAttending,
                    Note = v.Note
                }),
                AttendingCount = s.Votes.Count(v => v.IsAttending),
                NotAttendingCount = s.Votes.Count(v => !v.IsAttending)
            })
            .ToListAsync();

        return Ok(sessions);
    }

    [Authorize]
    [HttpPost("{sessionId}/vote")]
    public async Task<IActionResult> VoteAttendance(long sessionId, [FromBody] VoteAttendanceRequest req)
    {
        var userId = _baseServices.GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var session = await _context.AttendanceSessions.FindAsync(sessionId);
        if (session == null) return NotFound(new { message = "Lịch điểm danh không tồn tại." });

        var existingVote = await _context.AttendanceVotes
            .FirstOrDefaultAsync(v => v.SessionId == sessionId && v.UserId == userId);

        if (existingVote != null)
        {
            existingVote.IsAttending = req.IsAttending;
            existingVote.Note = req.Note;
            existingVote.CreatedAt = DateTime.UtcNow; // refresh time
        }
        else
        {
            _context.AttendanceVotes.Add(new AttendanceVote
            {
                SessionId = sessionId,
                UserId = userId.HasValue ? userId.Value : 0,
                IsAttending = req.IsAttending,
                Note = req.Note,
                CreatedAt = DateTime.UtcNow
            });
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = "Xác nhận điểm danh thành công." });
    }
}
