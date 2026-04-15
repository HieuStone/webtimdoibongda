using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TimDoiBongDa.Application.Interfaces;
using TimDoiBongDa.Application.Interfaces.Repositories;
using TimDoiBongDa.Domain.Entities;
using Microsoft.AspNetCore.SignalR;
using TimDoiBongDa.Api.Hubs;

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
    private readonly IAttendanceRepository _attendanceRepo;
    private readonly IGenericRepository<AttendanceVote> _voteRepo;
    private readonly ITeamUserRepository _teamUserRepo;
    private readonly IGenericRepository<Notification> _notificationRepo;
    private readonly IBaseServices _baseServices;
    private readonly IHubContext<NotificationHub> _hubContext;

    public AttendanceController(
        IAttendanceRepository attendanceRepo,
        IGenericRepository<AttendanceVote> voteRepo,
        ITeamUserRepository teamUserRepo,
        IGenericRepository<Notification> notificationRepo,
        IBaseServices baseServices,
        IHubContext<NotificationHub> hubContext)
    {
        _attendanceRepo = attendanceRepo;
        _voteRepo = voteRepo;
        _teamUserRepo = teamUserRepo;
        _notificationRepo = notificationRepo;
        _baseServices = baseServices;
        _hubContext = hubContext;
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

        await _attendanceRepo.AddAsync(session);
        await _attendanceRepo.SaveAsync();

        // Nổ thông báo cho tất cả thành viên trong đội
        var teamMembers = await _teamUserRepo.Find(tu => tu.TeamId == req.TeamId && tu.UserId != managerId)
            .Select(tu => tu.UserId)
            .ToListAsync();

        foreach (var memberId in teamMembers)
        {
            await _notificationRepo.AddAsync(new Notification
            {
                UserId = memberId,
                Message = $"Đội trưởng vừa tạo phiếu điểm danh: {session.Title}. Bạn vào báo Đi / Nghỉ nhé!",
                ActionLink = "/my-matches" // Route về đúng tab Lịch của tôi để xem lịch và vote
            });
        }

        if (teamMembers.Any())
        {
            await _notificationRepo.SaveAsync();
            foreach (var memberId in teamMembers)
            {
                await _hubContext.Clients.Group($"User_{memberId}").SendAsync("ReceiveNotification");
            }
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

        var sessions = await _attendanceRepo.GetMySessionsWithDetailsAsync(allTeamIds);
            
        var response = sessions.Select(s => new
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
        });

        return Ok(response);
    }

    [Authorize]
    [HttpPost("{sessionId}/vote")]
    public async Task<IActionResult> VoteAttendance(long sessionId, [FromBody] VoteAttendanceRequest req)
    {
        var userId = _baseServices.GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var session = await _attendanceRepo.GetByIdAsync(sessionId);
        if (session == null) return NotFound(new { message = "Lịch điểm danh không tồn tại." });

        var existingVote = await _voteRepo.Find(v => v.SessionId == sessionId && v.UserId == userId)
            .FirstOrDefaultAsync();

        if (existingVote != null)
        {
            existingVote.IsAttending = req.IsAttending;
            existingVote.Note = req.Note;
            existingVote.CreatedAt = DateTime.UtcNow; // refresh time
            _voteRepo.Update(existingVote);
        }
        else
        {
            await _voteRepo.AddAsync(new AttendanceVote
            {
                SessionId = sessionId,
                UserId = userId.Value,
                IsAttending = req.IsAttending,
                Note = req.Note,
                CreatedAt = DateTime.UtcNow
            });
        }

        await _voteRepo.SaveAsync();
        return Ok(new { message = "Xác nhận điểm danh thành công." });
    }
}
