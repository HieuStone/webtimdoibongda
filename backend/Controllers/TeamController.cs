using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.RegularExpressions;
using TimDoiBongDa.Api.Data;
using TimDoiBongDa.Api.DTOs;
using TimDoiBongDa.Api.Models;

namespace TimDoiBongDa.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TeamController : ControllerBase
{
    private readonly AppDbContext _context;

    public TeamController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllTeams()
    {
        var teams = await _context.Teams
            .Include(t => t.Manager)
            .Select(t => new TeamResponse
            {
                Id = t.Id,
                Name = t.Name,
                ShortName = t.ShortName,
                SkillLevel = t.SkillLevel,
                ManagerId = t.ManagerId,
                ManagerName = t.Manager != null ? t.Manager.Name : "Chưa xác định"
            })
            .ToListAsync();

        return Ok(teams);
    }

    [Authorize]
    [HttpGet("my-teams")]
    public async Task<IActionResult> GetMyTeams()
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString) || !long.TryParse(userIdString, out var userId))
            return Unauthorized();

        var teamIds = await _context.TeamUsers
            .Where(tu => tu.UserId == userId)
            .Select(tu => tu.TeamId)
            .ToListAsync();
            
        var teams = await _context.Teams
            .Include(t => t.Manager)
            .Where(t => t.ManagerId == userId || teamIds.Contains(t.Id))
            .Select(t => new TeamResponse
            {
                Id = t.Id,
                Name = t.Name,
                ShortName = t.ShortName,
                SkillLevel = t.SkillLevel,
                ManagerId = t.ManagerId,
                ManagerName = t.Manager != null ? t.Manager.Name : "Chưa xác định"
            })
            .Distinct()
            .ToListAsync();

        return Ok(teams);
    }

    [Authorize]
    [HttpPost]
    public async Task<IActionResult> CreateTeam([FromBody] CreateTeamRequest request)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString) || !long.TryParse(userIdString, out var userId))
            return Unauthorized();

        var team = new Team
        {
            Name = request.Name,
            ShortName = request.ShortName,
            AreaId = request.AreaId,
            SkillLevel = request.SkillLevel,
            ManagerId = userId
        };

        _context.Teams.Add(team);
        await _context.SaveChangesAsync();

        // Tự động gia nhập đội vừa tạo vào danh sách thành viên
        var teamUser = new TeamUser
        {
            TeamId = team.Id,
            UserId = userId,
            Status = "approved"
        };
        _context.TeamUsers.Add(teamUser);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetAllTeams), new { id = team.Id }, new { message = "Lập đội bóng mới thành công!", teamId = team.Id });
    }

    [Authorize]
    [HttpPost("{id}/request-join")]
    public async Task<IActionResult> RequestJoinTeam(long id)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString) || !long.TryParse(userIdString, out var userId))
            return Unauthorized();

        var team = await _context.Teams.FindAsync(id);
        if (team == null) return NotFound(new { message = "Đội bóng không tồn tại." });

        if (team.ManagerId == userId)
            return BadRequest(new { message = "Lỗi: Bạn đang làm HLV / Trưởng khối của đội bóng này rồi." });

        var existingRequest = await _context.TeamUsers
            .FirstOrDefaultAsync(tu => tu.TeamId == id && tu.UserId == userId);

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
            UserId = userId,
            Status = "pending"
        };

        _context.Notifications.Add(new Notification
        {
            UserId = team.ManagerId,
            Message = $"Cầu thủ {(await _context.Users.FindAsync(userId)).Name} muốn tham gia đội bóng {team.Name}.",
            ActionLink = $"/teams/{team.Id}"
        });

        _context.TeamUsers.Add(teamUser);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Đã gửi bản nháp yêu cầu xin tham gia đội! Vui lòng đợi quản lý phản hồi." });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetTeamById(long id)
    {
        var team = await _context.Teams
            .Include(t => t.Manager)
            .FirstOrDefaultAsync(t => t.Id == id);
            
        if (team == null) return NotFound(new { message = "Đội bóng không tồn tại" });

        return Ok(new TeamResponse
        {
            Id = team.Id,
            Name = team.Name,
            ShortName = team.ShortName,
            SkillLevel = team.SkillLevel,
            ManagerId = team.ManagerId,
            ManagerName = team.Manager != null ? team.Manager.Name : "Chưa xác định"
        });
    }

    [HttpGet("{id}/members")]
    public async Task<IActionResult> GetTeamMembers(long id)
    {
        var members = await _context.TeamUsers
            .Include(tu => tu.User)
            .Where(tu => tu.TeamId == id)
            .Select(tu => new
            {
                UserId = tu.UserId,
                Name = tu.User.Name,
                Email = tu.User.Email,
                Role = tu.User.Role,
                Status = tu.Status,
                TeamRole = tu.TeamRole
            })
            .ToListAsync();

        return Ok(members);
    }

    [Authorize]
    [HttpPost("{id}/approve-join/{userIdToApprove}")]
    public async Task<IActionResult> ApproveJoinTeam(long id, long userIdToApprove)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString) || !long.TryParse(userIdString, out var managerId))
            return Unauthorized();

        var team = await _context.Teams.FindAsync(id);
        if (team == null) return NotFound(new { message = "Đội bóng không tồn tại." });

        if (team.ManagerId != managerId)
            return Forbid(); // Chỉ manager mới đc duyệt

        var request = await _context.TeamUsers
            .FirstOrDefaultAsync(tu => tu.TeamId == id && tu.UserId == userIdToApprove);

        if (request == null || request.Status != "pending")
            return BadRequest(new { message = "Cầu thủ này không tồn tại trong hàng đợi hoặc đã được duyệt." });

        request.Status = "approved";

        _context.Notifications.Add(new Notification
        {
            UserId = userIdToApprove,
            Message = $"Bạn đã là thành viên của {team.Name}.",
            ActionLink = $"/teams/{team.Id}"
        });

        await _context.SaveChangesAsync();

        return Ok(new { message = "Ngon! Bạn đã duyệt cầu thủ tham gia Đội bóng." });
    }
    [Authorize]
    [HttpPost("{id}/reject-join/{userIdToReject}")]
    public async Task<IActionResult> RejectJoinTeam(long id, long userIdToReject)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString) || !long.TryParse(userIdString, out var managerId))
            return Unauthorized();

        var team = await _context.Teams.FindAsync(id);
        if (team == null) return NotFound(new { message = "Đội bóng không tồn tại." });

        if (team.ManagerId != managerId)
            return Forbid(); // Chỉ manager mới đc duyệtƯ

        var request = await _context.TeamUsers
            .FirstOrDefaultAsync(tu => tu.TeamId == id && tu.UserId == userIdToReject);

        if (request == null || request.Status != "pending")
            return BadRequest(new { message = "Cầu thủ này không tồn tại trong hàng đợi hoặc đã được duyệt." });

        _context.TeamUsers.Remove(request);

        _context.Notifications.Add(new Notification
        {
            UserId = userIdToReject,
            Message = $"Đội {team.Name} đã từ chối lời mời xin gia nhập của bạn.",
            ActionLink = $"/teams/{team.Id}"
        });
        await _context.SaveChangesAsync();

        return Ok(new { message = "Bạn đã từ chối cầu thủ này" });
    }

    [Authorize]
    [HttpPost("{id}/roles/{userId}")]
    public async Task<IActionResult> AssignTeamRole(long id, long userId, [FromBody] UpdateRoleRequest req)
    {
        var currentUserIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(currentUserIdString) || !long.TryParse(currentUserIdString, out var managerId))
            return Unauthorized();

        var team = await _context.Teams.FindAsync(id);
        if (team == null) return NotFound(new { message = "Đội bóng không tồn tại." });
        if (team.ManagerId != managerId) return Forbid();

        var userToUpdate = await _context.TeamUsers.FirstOrDefaultAsync(tu => tu.TeamId == id && tu.UserId == userId);
        if (userToUpdate == null || userToUpdate.Status != "approved") 
            return BadRequest(new { message = "Thành viên không hợp lệ." });

        if (req.Role != "member" && req.Role != "vice_captain")
            return BadRequest(new { message = "Role không hợp lệ. Chỉ chấp nhận 'member' hoặc 'vice_captain'." });

        userToUpdate.TeamRole = req.Role;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Cập nhật chức vụ thành công." });
    }

    [Authorize]
    [HttpPost("{id}/leave")]
    public async Task<IActionResult> LeaveTeam(long id, [FromBody] LeaveTeamRequest? req)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString) || !long.TryParse(userIdString, out var userId))
            return Unauthorized();

        var team = await _context.Teams.FindAsync(id);
        if (team == null) return NotFound(new { message = "Đội bóng không tồn tại." });

        var teamUser = await _context.TeamUsers.FirstOrDefaultAsync(tu => tu.TeamId == id && tu.UserId == userId);
        
        bool isManager = team.ManagerId == userId;

        if (!isManager && teamUser == null)
            return BadRequest(new { message = "Bạn không thuộc đội bóng này." });

        if (!isManager)
        {
            _context.TeamUsers.Remove(teamUser!);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Đã rời đội thành công." });
        }

        // Nếu là Đội trưởng
        var otherMembers = await _context.TeamUsers
            .Where(tu => tu.TeamId == id && tu.UserId != userId && tu.Status == "approved")
            .OrderBy(tu => tu.JoinedAt)
            .ToListAsync();

        if (!otherMembers.Any())
        {
            _context.Teams.Remove(team);
            await _context.SaveChangesAsync();
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
            var viceCaptain = otherMembers.FirstOrDefault(m => m.TeamRole == "vice_captain");
            newManagerId = viceCaptain != null ? viceCaptain.UserId : otherMembers.First().UserId;
        }

        team.ManagerId = newManagerId;
        
        if (teamUser != null)
        {
            _context.TeamUsers.Remove(teamUser);
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = "Bạn đã rời đội và nhường quyền Đội trưởng thành công." });
    }
}

public class UpdateRoleRequest
{
    public string Role { get; set; } = "member";
}

public class LeaveTeamRequest
{
    public long? NewManagerId { get; set; }
}
