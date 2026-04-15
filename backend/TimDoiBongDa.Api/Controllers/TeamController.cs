using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.RegularExpressions;
using TimDoiBongDa.Application.Interfaces;
using TimDoiBongDa.Application.DTOs.TeamDtos;
using TimDoiBongDa.Domain.Entities;
using TimDoiBongDa.Application.Interfaces.Repositories;
using TimDoiBongDa.Domain.Enums;
using Microsoft.AspNetCore.SignalR;
using TimDoiBongDa.Api.Hubs;

namespace TimDoiBongDa.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TeamController : ControllerBase
{
    private readonly ITeamRepository _teamRepo;
    private readonly ITeamUserRepository _teamUserRepo;
    private readonly IGenericRepository<Notification> _notificationRepo;
    private readonly IGenericRepository<User> _userRepo;
    private readonly IBaseServices _baseServices;
    private readonly IHubContext<NotificationHub> _hubContext;

    public TeamController(
        ITeamRepository teamRepo, 
        ITeamUserRepository teamUserRepo,
        IGenericRepository<Notification> notificationRepo,
        IGenericRepository<User> userRepo,
        IBaseServices baseServices,
        IHubContext<NotificationHub> hubContext)
    {
        _teamRepo = teamRepo;
        _teamUserRepo = teamUserRepo;
        _notificationRepo = notificationRepo;
        _userRepo = userRepo;
        _baseServices = baseServices;
        _hubContext = hubContext;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllTeams()
    {
        var teams = await _teamRepo.GetAllWithManagerAsync();
        
        var response = teams.Select(t => new TeamResponse
        {
            Id = t.Id,
            Name = t.Name,
            ShortName = t.ShortName,
            SkillLevel = t.SkillLevel,
            ManagerId = t.ManagerId,
            ManagerName = t.Manager != null ? t.Manager.Name : "Chưa xác định",
            AverageFairplayScore = t.AverageFairplayScore
        });

        return Ok(response);
    }

    [Authorize]
    [HttpGet("my-teams")]
    public async Task<IActionResult> GetMyTeams()
    {
        var userId = _baseServices.GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var teamIds = await _baseServices.GetUserTeamIdsAsync(userId.Value);
            
        var teams = await _teamRepo.GetMyTeamsAsync(userId.Value, teamIds);
            
        var response = teams.Select(t => new TeamResponse
        {
            Id = t.Id,
            Name = t.Name,
            ShortName = t.ShortName,
            SkillLevel = t.SkillLevel,
            ManagerId = t.ManagerId,
            ManagerName = t.Manager != null ? t.Manager.Name : "Chưa xác định",
            AverageFairplayScore = t.AverageFairplayScore
        });

        return Ok(response);
    }

    [Authorize]
    [HttpPost]
    public async Task<IActionResult> CreateTeam([FromBody] CreateTeamRequest request)
    {
        var userId = _baseServices.GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var team = new Team
        {
            Name = request.Name,
            ShortName = request.ShortName,
            AreaId = request.AreaId,
            SkillLevel = request.SkillLevel,
            ManagerId = userId.Value
        };

        await _teamRepo.AddAsync(team);
        await _teamRepo.SaveAsync();

        // Tự động gia nhập đội vừa tạo vào danh sách thành viên, set role là Captain
        var teamUser = new TeamUser
        {
            TeamId = team.Id,
            UserId = userId.Value,
            Status = "approved",
            TeamRole = TeamRole.Captain
        };
        await _teamUserRepo.AddAsync(teamUser);
        await _teamUserRepo.SaveAsync();

        return CreatedAtAction(nameof(GetAllTeams), new { id = team.Id }, new { message = "Lập đội bóng mới thành công!", teamId = team.Id });
    }

    [Authorize]
    [HttpPost("{id}/request-join")]
    public async Task<IActionResult> RequestJoinTeam(long id)
    {
        var userId = _baseServices.GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var team = await _teamRepo.GetByIdAsync(id);
        if (team == null) return NotFound(new { message = "Đội bóng không tồn tại." });

        if (team.ManagerId == userId)
            return BadRequest(new { message = "Lỗi: Bạn đang làm HLV / Trưởng khối của đội bóng này rồi." });

        var existingRequest = await _teamUserRepo.Find(tu => tu.TeamId == id && tu.UserId == userId)
            .FirstOrDefaultAsync();

        if (existingRequest != null)
        {
            if (existingRequest.Status == "approved")
                return BadRequest(new { message = "Bạn hiện đã là thành viên chính thức của đội bóng này." });
            else
                return BadRequest(new { message = "Bạn đã gửi yêu cầu xin gia nhập rồi! Vui lòng chờ đội trưởng duyệt." });
        }

        var teamUser = new TeamUser
        {
            TeamId = id,
            UserId = userId.Value,
            Status = "pending"
        };

        var user = await _userRepo.GetByIdAsync(userId.Value);
        await _notificationRepo.AddAsync(new Notification
        {
            UserId = team.ManagerId,
            Message = $"Cầu thủ {user?.Name} muốn tham gia đội bóng {team.Name}.",
            ActionLink = $"/teams/{team.Id}"
        });

        await _teamUserRepo.AddAsync(teamUser);
        await _teamUserRepo.SaveAsync();
        await _hubContext.Clients.Group($"User_{team.ManagerId}").SendAsync("ReceiveNotification");

        return Ok(new { message = "Đã gửi bản nháp yêu cầu xin tham gia đội! Vui lòng đợi quản lý phản hồi." });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetTeamById(long id)
    {
        var team = await _teamRepo.GetByIdWithManagerAsync(id);
            
        if (team == null) return NotFound(new { message = "Đội bóng không tồn tại" });

        return Ok(new TeamResponse
        {
            Id = team.Id,
            Name = team.Name,
            ShortName = team.ShortName,
            SkillLevel = team.SkillLevel,
            ManagerId = team.ManagerId,
            ManagerName = team.Manager != null ? team.Manager.Name : "Chưa xác định",
            AverageFairplayScore = team.AverageFairplayScore
        });
    }

    [HttpGet("{id}/members")]
    public async Task<IActionResult> GetTeamMembers(long id)
    {
        var members = await _teamUserRepo.GetMembersByTeamIdAsync(id);
        
        var response = members.Select(tu => new
        {
            UserId = tu.UserId,
            Name = tu.User?.Name,
            Email = tu.User?.Email,
            Role = tu.User?.Role,
            Status = tu.Status,
            TeamRole = tu.TeamRole
        });

        return Ok(response);
    }

    [Authorize]
    [HttpPost("{id}/approve-join/{userIdToApprove}")]
    public async Task<IActionResult> ApproveJoinTeam(long id, long userIdToApprove)
    {
        var managerId = _baseServices.GetCurrentUserId();
        if (managerId == null) return Unauthorized();

        var team = await _teamRepo.GetByIdAsync(id);
        if (team == null) return NotFound(new { message = "Đội bóng không tồn tại." });

        if (team.ManagerId != managerId)
            return Forbid(); // Chỉ manager mới đc duyệt

        var request = await _teamUserRepo.Find(tu => tu.TeamId == id && tu.UserId == userIdToApprove)
            .FirstOrDefaultAsync();

        if (request == null || request.Status != "pending")
            return BadRequest(new { message = "Cầu thủ này không tồn tại trong hàng đợi hoặc đã được duyệt." });

        request.Status = "approved";
        _teamUserRepo.Update(request);

        await _notificationRepo.AddAsync(new Notification
        {
            UserId = userIdToApprove,
            Message = $"Bạn đã là thành viên của {team.Name}.",
            ActionLink = $"/teams/{team.Id}"
        });

        await _teamUserRepo.SaveAsync();
        await _hubContext.Clients.Group($"User_{userIdToApprove}").SendAsync("ReceiveNotification");

        return Ok(new { message = "Ngon! Bạn đã duyệt cầu thủ tham gia Đội bóng." });
    }
    [Authorize]
    [HttpPost("{id}/reject-join/{userIdToReject}")]
    public async Task<IActionResult> RejectJoinTeam(long id, long userIdToReject)
    {
        var managerId = _baseServices.GetCurrentUserId();
        if (managerId == null) return Unauthorized();

        var team = await _teamRepo.GetByIdAsync(id);
        if (team == null) return NotFound(new { message = "Đội bóng không tồn tại." });

        if (team.ManagerId != managerId)
            return Forbid(); // Chỉ manager mới đc duyệt

        var request = await _teamUserRepo.Find(tu => tu.TeamId == id && tu.UserId == userIdToReject)
            .FirstOrDefaultAsync();

        if (request == null || request.Status != "pending")
            return BadRequest(new { message = "Cầu thủ này không tồn tại trong hàng đợi hoặc đã được duyệt." });

        _teamUserRepo.Remove(request);

        await _notificationRepo.AddAsync(new Notification
        {
            UserId = userIdToReject,
            Message = $"Đội {team.Name} đã từ chối lời mời xin gia nhập của bạn.",
            ActionLink = $"/teams/{team.Id}"
        });
        await _teamUserRepo.SaveAsync();
        await _hubContext.Clients.Group($"User_{userIdToReject}").SendAsync("ReceiveNotification");

        return Ok(new { message = "Bạn đã từ chối cầu thủ này" });
    }

    [Authorize]
    [HttpPost("{id}/roles/{userId}")]
    public async Task<IActionResult> AssignTeamRole(long id, long userId, [FromBody] UpdateRoleRequest req)
    {
        var managerId = _baseServices.GetCurrentUserId();
        if (managerId == null) return Unauthorized();

        var team = await _teamRepo.GetByIdAsync(id);
        if (team == null) return NotFound(new { message = "Đội bóng không tồn tại." });
        if (team.ManagerId != managerId) return Forbid();

        var userToUpdate = await _teamUserRepo.Find(tu => tu.TeamId == id && tu.UserId == userId)
            .FirstOrDefaultAsync();
        if (userToUpdate == null || userToUpdate.Status != "approved") 
            return BadRequest(new { message = "Thành viên không hợp lệ." });

        if (req.Role != TeamRole.Member && req.Role != TeamRole.ViceCaptain)
            return BadRequest(new { message = "Role không hợp lệ. Chỉ chấp nhận 'Member' (0) hoặc 'ViceCaptain' (1)." });

        userToUpdate.TeamRole = req.Role;
        _teamUserRepo.Update(userToUpdate);
        await _teamUserRepo.SaveAsync();

        return Ok(new { message = "Cập nhật chức vụ thành công." });
    }

    [Authorize]
    [HttpPost("{id}/leave")]
    public async Task<IActionResult> LeaveTeam(long id, [FromBody] LeaveTeamRequest? req)
    {
        var userId = _baseServices.GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var team = await _teamRepo.GetByIdAsync(id);
        if (team == null) return NotFound(new { message = "Đội bóng không tồn tại." });

        var teamUser = await _teamUserRepo.Find(tu => tu.TeamId == id && tu.UserId == userId)
            .FirstOrDefaultAsync();
        
        bool isManager = team.ManagerId == userId;

        if (!isManager && teamUser == null)
            return BadRequest(new { message = "Bạn không thuộc đội bóng này." });

        if (!isManager)
        {
            _teamUserRepo.Remove(teamUser!);
            await _teamUserRepo.SaveAsync();
            return Ok(new { message = "Đã rời đội thành công." });
        }

        // Nếu là Đội trưởng
        var otherMembers = await _teamUserRepo.Find(tu => tu.TeamId == id && tu.UserId != userId && tu.Status == "approved")
            .OrderBy(tu => tu.JoinedAt)
            .ToListAsync();

        if (!otherMembers.Any())
        {
            _teamRepo.Remove(team);
            await _teamRepo.SaveAsync();
            return Ok(new { message = "Bạn là người cuối cùng rời đội, đội bóng đã được giải tán." });
        }

        long newManagerId = 0;
        if (req != null && req.NewManagerId.HasValue && req.NewManagerId.Value > 0)
        {
            var targetMember = otherMembers.FirstOrDefault(m => m.UserId == req.NewManagerId.Value);
            if (targetMember == null) return BadRequest(new { message = "Người được chỉ định không phải thành viên hợp lệ." });
            newManagerId = targetMember.UserId;
        }
        else
        {
            var viceCaptain = otherMembers.FirstOrDefault(m => m.TeamRole == TeamRole.ViceCaptain);
            newManagerId = viceCaptain != null ? viceCaptain.UserId : otherMembers.First().UserId;
        }

        team.ManagerId = newManagerId;
        _teamRepo.Update(team);
        
        if (teamUser != null)
        {
            _teamUserRepo.Remove(teamUser);
        }

        await _teamRepo.SaveAsync();
        return Ok(new { message = "Bạn đã rời đội và nhường quyền Đội trưởng thành công." });
    }
}

public class UpdateRoleRequest
{
    public TeamRole Role { get; set; } = TeamRole.Member;
}

public class LeaveTeamRequest
{
    public long? NewManagerId { get; set; }
}
