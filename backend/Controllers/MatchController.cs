using System.Linq.Expressions;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TimDoiBongDa.Api.Data;
using TimDoiBongDa.Api.DTOs;
using TimDoiBongDa.Api.DTOs.MatchDtos;
using TimDoiBongDa.Api.Interfaces;
using TimDoiBongDa.Api.Models;

namespace TimDoiBongDa.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MatchController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IBaseServices _baseServices;

    public MatchController(AppDbContext context, IBaseServices baseServices)
    {
        _context = context;
        _baseServices = baseServices;
    }

    [HttpGet]
    public async Task<IActionResult> GetAvailableMatches()
    {
        // Lấy userId nếu đã đăng nhập (không bắt buộc - khách vãng lai vẫn xem được)
        long? currentUserId = _baseServices.GetCurrentUserId();

        // Tìm các đội mà user đang là Đội Trưởng
        List<long> myTeamIds = new();
        if (currentUserId.HasValue)
        {
            myTeamIds = await _baseServices.GetManagedTeamIdsAsync(currentUserId.Value);
        }

        var matches = await _context.Matches
            .Include(m => m.CreatorTeam)
            .Include(m => m.OpponentTeam)
            .Where(m => (m.Status == "finding" || m.Status == "waiting_approval")
                     && (myTeamIds.Count == 0 || !myTeamIds.Contains(m.CreatorTeamId))
                     && m.MatchTime >= DateTime.Now)
            .Select(m => new MatchResponse
            {
                Id = m.Id,
                CreatorTeamId = m.CreatorTeamId,
                CreatorTeamName = m.CreatorTeam != null ? m.CreatorTeam.Name : "N/A",
                OpponentTeamName = m.OpponentTeam != null ? m.OpponentTeam.Name : null,
                StadiumName = m.StadiumName,
                MatchTime = m.MatchTime,
                MatchType = m.MatchType,
                SkillRequirement = m.SkillRequirement,
                PaymentType = m.PaymentType,
                Status = m.Status,
                Note = m.Note
            })
            .OrderBy(m => m.MatchTime)
            .ToListAsync();

        return Ok(matches);
    }

    [Authorize]
    [HttpPost]
    public async Task<IActionResult> CreateMatch([FromBody] CreateMatchRequest request)
    {
        var userId = _baseServices.GetCurrentUserId();
        if (userId == null)
            return Unauthorized();

        // Chỉ cho phép Đội trưởng (Manager) của đội mới có quyền Cáp Kèo
        var team = await _context.Teams.FirstOrDefaultAsync(t => t.Id == request.CreatorTeamId && t.ManagerId == userId);
        if (team == null)
            return Forbid(); // Trả về 403 Forbidden nếu không đủ thẩm quyền thay mặt đội.

        var newMatch = new Match
        {
            CreatorTeamId = request.CreatorTeamId,
            StadiumName = request.StadiumName,
            AreaId = request.AreaId,
            MatchTime = request.MatchTime,
            MatchType = request.MatchType,
            SkillRequirement = request.SkillRequirement,
            PaymentType = request.PaymentType,
            Status = "finding",
            Note = request.Note
        };

        _context.Matches.Add(newMatch);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetAvailableMatches), new { id = newMatch.Id }, new { message = "Tìm đối thành công! Trận đấu đã được đăng lên sảnh.", matchId = newMatch.Id });
    }
    
    [Authorize]
    [HttpPost("{id}/request-join")]
    public async Task<IActionResult> RequestToJoinMatch(long id, [FromBody] long requestingTeamId)
    {
        var userId = _baseServices.GetCurrentUserId();
        if (userId == null)
            return Unauthorized();

        // Kiểm tra quyền (phải là đội trưởng của team đi gửi yêu cầu cáp kèo)
        var team = await _context.Teams.FirstOrDefaultAsync(t => t.Id == requestingTeamId && t.ManagerId == userId);
        if (team == null)
            return Forbid();

        var match = await _context.Matches.FindAsync(id);
        if (match == null || match.Status != "finding")
            return BadRequest(new { message = "Kèo này không còn ở trạng thái tìm đối nữa." });

        // Kiểm tra: Đội đã có kèo được chốt (là creator hoặc opponent) trong ngày đó chưa?
        var matchDate = match.MatchTime.Date;
        var alreadyHasConfirmedMatch = await _context.Matches
            .AnyAsync(m => (m.CreatorTeamId == requestingTeamId || m.OpponentTeamId == requestingTeamId)
                        && m.MatchTime.Date == matchDate
                        && m.Id != id
                        && m.Status != "cancelled");

        // Kiểm tra: Đội đang có request PENDING cho một kèo KHÁC cùng ngày không?
        var pendingMatchIds = await _context.MatchRequests
            .Where(r => r.RequestingTeamId == requestingTeamId && r.Status == "pending" && r.MatchId != id)
            .Select(r => r.MatchId)
            .ToListAsync();
        var alreadyPendingOtherMatchThatDay = await _context.Matches
            .AnyAsync(m => pendingMatchIds.Contains(m.Id) && m.MatchTime.Date == matchDate);

        var alreadyRequested = await _context.MatchRequests
            .AnyAsync(r => r.MatchId == id && r.RequestingTeamId == requestingTeamId && r.Status == "pending");

        if (alreadyRequested)
            return BadRequest(new { message = "Đội của bạn đã gửi yêu cầu cho kèo này rồi." });

        if (alreadyHasConfirmedMatch)
            return BadRequest(new { message = $"Đội {team.Name} đã có kèo được chốt vào ngày {matchDate:dd/MM/yyyy}. Mỗi đội chỉ được 1 kèo/ngày!" });

        var req = new MatchRequest
        {
            MatchId = id,
            RequestingTeamId = requestingTeamId,
            Status = "pending",
            Message = "Chúng tôi muốn nhận kèo sân này."
        };

        _context.MatchRequests.Add(req);
        // Kèo vẫn giữ status "finding" để nhiều đội được phép xin cùng lúc
        
        var creatorTeam = await _context.Teams.FindAsync(match.CreatorTeamId);
        if (creatorTeam != null && creatorTeam.ManagerId > 0)
        {
            _context.Notifications.Add(new Notification
            {
                UserId = creatorTeam.ManagerId,
                Message = $"Đội {team.Name} muốn nhận kèo ngày {match.MatchTime.ToString("dd/MM/yyyy")} của bạn trên sân {match.StadiumName}.",
                ActionLink = $"/matches/{match.Id}"
            });
        }

        await _context.SaveChangesAsync();

        return Ok(new { message = "Tuyệt vời, bạn đã gửi yêu cầu nhận kèo. Hãy chờ đối thủ xác nhận!" });
    }

    /// <summary>
    /// Trả về danh sách đội mà user làm Đội Trưởng + chưa có kèo vào ngày chỉ định.
    /// Dùng cho dropdown tạo kèo và dropdown xin kèo.
    /// </summary>
    [Authorize]
    [HttpGet("my-available-teams")]
    public async Task<IActionResult> GetMyAvailableTeams([FromQuery] string date)
    {
        var userId = _baseServices.GetCurrentUserId();
        if (userId == null) return Unauthorized();

        if (!DateTime.TryParse(date, out var targetDate))
            return BadRequest(new { message = "Ngày không hợp lệ." });

        // Lấy tất cả đội mình làm đội trưởng
        var myTeams = await _context.Teams
            .Where(t => t.ManagerId == userId)
            .Select(t => new { t.Id, t.Name, t.SkillLevel })
            .ToListAsync();

        // Lấy các đội đã có kèo được chốt (creator hoặc opponent) trong ngày đó
        var busyTeamIds = await _context.Matches
            .Where(m => m.MatchTime.Date == targetDate && m.Status != "cancelled")
            .Select(m => new[] { m.CreatorTeamId, m.OpponentTeamId ?? 0 })
            .ToListAsync();

        var busySet = busyTeamIds.SelectMany(x => x).Where(x => x != 0).ToHashSet();

        var availableTeams = myTeams.Where(t => !busySet.Contains(t.Id)).ToList();

        return Ok(availableTeams);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetMatchById(long id)
    {
        var match = await _context.Matches
            .Include(m => m.CreatorTeam)
            .Include(m => m.OpponentTeam)
            .FirstOrDefaultAsync(m => m.Id == id);
            
        if (match == null) return NotFound(new { message = "Kèo không tồn tại" });

        return Ok(new MatchResponse
        {
            Id = match.Id,
            CreatorTeamId = match.CreatorTeamId,
            CreatorTeamName = match.CreatorTeam?.Name ?? "N/A",
            OpponentTeamName = match.OpponentTeam?.Name,
            StadiumName = match.StadiumName,
            MatchTime = match.MatchTime,
            MatchType = match.MatchType,
            SkillRequirement = match.SkillRequirement,
            PaymentType = match.PaymentType ?? "",
            Status = match.Status ?? "",
            Note = match.Note
        });
    }

    [HttpGet("{id}/requests")]
    public async Task<IActionResult> GetMatchRequests(long id)
    {
        var requests = await _context.MatchRequests
            .Include(r => r.RequestingTeam)
            .Where(r => r.MatchId == id)
            .ToListAsync();

        var skillLabels = new Dictionary<int, string>
        {
            { 1, "Kém" }, { 2, "Yếu" }, { 3, "Trung Bình" }, { 4, "Khá" }, { 5, "Bán Chuyên" }
        };

        var teamIds = requests.Select(r => r.RequestingTeamId).Distinct().ToList();

        // Tính điểm Fairplay Trung Bình cho từng đội
        var avgRatings = await _context.MatchRatings
            .Where(mr => teamIds.Contains(mr.TargetTeamId))
            .GroupBy(mr => mr.TargetTeamId)
            .Select(g => new { TeamId = g.Key, AvgRating = g.Average(x => x.FairplayRating) })
            .ToListAsync();

        var ratingDict = avgRatings.ToDictionary(x => x.TeamId, x => Math.Round(x.AvgRating, 1));

        var result = requests.Select(r => new
        {
            Id = r.Id,
            TeamId = r.RequestingTeamId,
            TeamName = r.RequestingTeam != null ? r.RequestingTeam.Name : "N/A",
            SkillLevel = r.RequestingTeam != null ? r.RequestingTeam.SkillLevel : 0,
            SkillLevelText = r.RequestingTeam != null && skillLabels.ContainsKey(r.RequestingTeam.SkillLevel)
                ? skillLabels[r.RequestingTeam.SkillLevel] : "Chưa rõ",
            AvgRating = ratingDict.ContainsKey(r.RequestingTeamId) ? ratingDict[r.RequestingTeamId] : (double?)null,
            Status = r.Status,
            Message = r.Message
        });

        return Ok(result);
    }

    [Authorize]
    [HttpPost("{id}/reject/{requestId}")]
    public async Task<IActionResult> RejectMatchRequest(long id, long requestId)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString) || !long.TryParse(userIdString, out var managerId))
            return Unauthorized();

        var match = await _context.Matches
            .Include(m => m.CreatorTeam)
            .FirstOrDefaultAsync(m => m.Id == id);

        if (match == null) return NotFound(new { message = "Kèo không tồn tại." });
        if (match.CreatorTeam == null || match.CreatorTeam.ManagerId != managerId)
            return Forbid();

        var request = await _context.MatchRequests
            .FirstOrDefaultAsync(r => r.Id == requestId && r.MatchId == id);

        if (request == null || request.Status != "pending")
            return BadRequest(new { message = "Yêu cầu không hợp lệ hoặc đã xử lý." });

        request.Status = "rejected";

        var requestingTeam = await _context.Teams.FindAsync(request.RequestingTeamId);
        if (requestingTeam != null && requestingTeam.ManagerId > 0)
        {
            _context.Notifications.Add(new Notification
            {
                UserId = requestingTeam.ManagerId,
                Message = $"Rất tiếc, đội {match.CreatorTeam?.Name} đã từ chối yêu cầu nhận kèo của bạn.",
                ActionLink = $"/matches/{match.Id}"
            });
        }

        // Nếu không còn pending nào, reset về "finding"
        var stillPending = await _context.MatchRequests
            .AnyAsync(r => r.MatchId == id && r.Id != requestId && r.Status == "pending");
        if (!stillPending)
            match.Status = "finding";

        await _context.SaveChangesAsync();
        return Ok(new { message = "Từ chối yêu cầu nhận kèo thành công." });
    }

    [Authorize]
    [HttpPost("{id}/approve/{requestId}")]
    public async Task<IActionResult> ApproveMatchRequest(long id, long requestId)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString) || !long.TryParse(userIdString, out var managerId))
            return Unauthorized();

        var match = await _context.Matches
            .Include(m => m.CreatorTeam)
            .FirstOrDefaultAsync(m => m.Id == id);

        if (match == null) return NotFound(new { message = "Kèo không tồn tại." });
        if (match.CreatorTeam == null || match.CreatorTeam.ManagerId != managerId)
            return Forbid();

        if (match.Status != "finding" && match.Status != "waiting_approval")
            return BadRequest(new { message = "Kèo này đã chốt đối thủ hoặc đã hủy." });

        var request = await _context.MatchRequests
            .FirstOrDefaultAsync(r => r.Id == requestId && r.MatchId == id);

        if (request == null || request.Status != "pending")
            return BadRequest(new { message = "Yêu cầu không hợp lệ hoặc đã duyệt." });

        // Phê duyệt yêu cầu này thành đối thủ
        request.Status = "approved";
        match.OpponentTeamId = request.RequestingTeamId;
        match.Status = "scheduled";

        var requestingTeam = await _context.Teams.FindAsync(request.RequestingTeamId);
        if (requestingTeam != null && requestingTeam.ManagerId > 0)
        {
            _context.Notifications.Add(new Notification
            {
                UserId = requestingTeam.ManagerId,
                Message = $"Chúc mừng! Đội {match.CreatorTeam?.Name} đã chốt bạn làm đối thủ. Xem chi tiết chốt kèo.",
                ActionLink = $"/matches/{match.Id}"
            });
        }

        // Từ chối tự động tất cả các đơn xin kèo khác của CHÍNH TRẬN ĐẤU NÀY
        var otherRequestsToThisMatch = await _context.MatchRequests
            .Where(r => r.MatchId == id && r.Id != requestId && r.Status == "pending")
            .ToListAsync();
            
        foreach (var r in otherRequestsToThisMatch)
        {
            r.Status = "rejected";
        }

        // TỰ ĐỘNG HỦY các đơn xin kèo khác của 2 đội (Creator & Requestor) trong cùng ngày đó
        var matchDate = match.MatchTime.Date;
        
        // 1. Đội đi xin (RequestingTeamId) đang xin các kèo khác cùng ngày -> Hủy
        var otherRequestsFromRequestingTeam = await _context.MatchRequests
            .Include(r => r.Match)
            .Where(r => r.RequestingTeamId == request.RequestingTeamId 
                     && r.Id != requestId 
                     && r.Status == "pending")
            .ToListAsync();
            
        foreach (var r in otherRequestsFromRequestingTeam)
        {
            if (r.Match != null && r.Match.MatchTime.Date == matchDate)
            {
                r.Status = "rejected"; // Hoặc có thể dùng status "cancelled" nếu muốn phân biệt
            }
        }

        // 2. Đội chủ nhà (CreatorTeamId) cũng có thể đang đi xin các kèo khác cùng ngày -> Hủy
        var otherRequestsFromCreatorTeam = await _context.MatchRequests
            .Include(r => r.Match)
            .Where(r => r.RequestingTeamId == match.CreatorTeamId 
                     && r.Status == "pending")
            .ToListAsync();

        foreach (var r in otherRequestsFromCreatorTeam)
        {
            if (r.Match != null && r.Match.MatchTime.Date == matchDate)
            {
                r.Status = "rejected";
            }
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = "Chốt kèo thành công! Trận đấu đã được ấn định đối thủ." });
    }

    [Authorize]
    [HttpPost("{id}/cancel-opponent")]
    public async Task<IActionResult> CancelOpponent(long id)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString) || !long.TryParse(userIdString, out var managerId))
            return Unauthorized();

        var match = await _context.Matches
            .Include(m => m.CreatorTeam)
            .FirstOrDefaultAsync(m => m.Id == id);

        if (match == null) return NotFound(new { message = "Kèo không tồn tại." });
        if (match.CreatorTeam == null || match.CreatorTeam.ManagerId != managerId)
            return Forbid();

        if (match.Status != "scheduled")
            return BadRequest(new { message = "Kèo này chưa chốt đối thủ nên không thể hủy." });

        var approvedRequest = await _context.MatchRequests
            .FirstOrDefaultAsync(r => r.MatchId == id && r.Status == "approved");
            
        if (approvedRequest != null)
        {
            approvedRequest.Status = "canceled";
        }

        if (match.OpponentTeamId.HasValue)
        {
            var opponentTeam = await _context.Teams.FindAsync(match.OpponentTeamId.Value);
            if (opponentTeam != null && opponentTeam.ManagerId > 0)
            {
                _context.Notifications.Add(new Notification
                {
                    UserId = opponentTeam.ManagerId,
                    Message = $"Đội {match.CreatorTeam?.Name} đã huỷ kèo đấu giao hữu với bạn trên sân {match.StadiumName}.",
                    ActionLink = $"/matches/{match.Id}"
                });
            }
        }

        match.OpponentTeamId = null;
        match.Status = "finding";

        await _context.SaveChangesAsync();
        return Ok(new { message = "Đã hủy kèo thành công. Trận đấu quay lại trạng thái tìm đối." });
    }

    /// <summary>
    /// Lấy tất cả kèo liên quấn đến User hiện tại (cả chủ khoản lẫn đối thủ), dùng cho trang Lịch Thi Đấu cá nhân.
    /// </summary>
    [Authorize]
    [HttpGet("my-matches")]
    public async Task<IActionResult> GetMyMatches([FromQuery] MatchFilter filter)
    {
        var userId = _baseServices.GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var myTeamIds = await _baseServices.GetUserTeamIdsAsync(userId.Value);
        var managedTeamIds = await _baseServices.GetManagedTeamIdsAsync(userId.Value);
        var allMyTeamIds = myTeamIds.Union(managedTeamIds).Distinct().ToList();

        var predicates = new List<Expression<Func<MatchResponse, bool>>>();

        // Filter by Ownership/Role (Contextual filter)
        if (filter.IsOpponent == true)
        {
            predicates.Add(m => m.OpponentTeamId.HasValue && allMyTeamIds.Contains(m.OpponentTeamId.Value));
        }
        else
        {
            predicates.Add(m => allMyTeamIds.Contains(m.CreatorTeamId) || 
                               (m.OpponentTeamId.HasValue && allMyTeamIds.Contains(m.OpponentTeamId.Value)));
        }

        var matches = _baseServices.DataFilter<Match, MatchResponse>(filter, predicates.ToArray());

        return Ok(matches);
    }

    [Authorize]
    [HttpPost("{id}/update-score")]
    public async Task<IActionResult> UpdateScore(long id, [FromBody] UpdateScoreRequest req)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString) || !long.TryParse(userIdString, out var userId))
            return Unauthorized();

        var match = await _context.Matches
            .Include(m => m.CreatorTeam)
            .FirstOrDefaultAsync(m => m.Id == id);

        if (match == null) return NotFound(new { message = "Kèo không tồn tại." });
        if (match.CreatorTeam?.ManagerId != userId)
            return Forbid();

        match.CreatorScore = req.CreatorScore;
        match.OpponentScore = req.OpponentScore;
        match.Status = "finished";
        await _context.SaveChangesAsync();

        return Ok(new { message = "Lưu tỷ số trận đấu thành công!" });
    }

    /// <summary>
    /// Lấy danh sách kèo do user hiện tại tạo (đội mình làm đội trưởng), status finding/waiting_approval.
    /// </summary>
    [Authorize]
    [HttpGet("my-created-matches")]
    public async Task<IActionResult> GetMyCreatedMatches()
    {
        var userId = _baseServices.GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var myTeamIds = await _baseServices.GetManagedTeamIdsAsync(userId.Value);

        var matches = await _context.Matches
            .Include(m => m.CreatorTeam)
            .Include(m => m.OpponentTeam)
            .Where(m => myTeamIds.Contains(m.CreatorTeamId)
                     && (m.Status == "finding" || m.Status == "waiting_approval" || m.Status == "scheduled"))
            .OrderByDescending(m => m.CreatedAt)
            .Select(m => new MatchResponse
            {
                Id = m.Id,
                CreatorTeamId = m.CreatorTeamId,
                CreatorTeamName = m.CreatorTeam != null ? m.CreatorTeam.Name : "N/A",
                OpponentTeamId = m.OpponentTeamId,
                OpponentTeamName = m.OpponentTeam != null ? m.OpponentTeam.Name : null,
                StadiumName = m.StadiumName,
                MatchTime = m.MatchTime,
                MatchType = m.MatchType,
                SkillRequirement = m.SkillRequirement,
                PaymentType = m.PaymentType,
                Status = m.Status,
                Note = m.Note
            })
            .ToListAsync();

        return Ok(matches);
    }

    /// <summary>
    /// Lấy danh sách yêu cầu nhận kèo mà user đã gửi (đội mình làm đội trưởng gửi).
    /// </summary>
    [Authorize]
    [HttpGet("my-sent-requests")]
    public async Task<IActionResult> GetMySentRequests()
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString) || !long.TryParse(userIdString, out var userId))
            return Unauthorized();

        var myTeamIds = await _context.Teams
            .Where(t => t.ManagerId == userId)
            .Select(t => t.Id)
            .ToListAsync();

        var requests = await _context.MatchRequests
            .Include(r => r.Match)
                .ThenInclude(m => m!.CreatorTeam)
            .Include(r => r.RequestingTeam)
            .Where(r => myTeamIds.Contains(r.RequestingTeamId) && r.Status == "pending")
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new
            {
                r.Id,
                r.MatchId,
                r.RequestingTeamId,
                RequestingTeamName = r.RequestingTeam != null ? r.RequestingTeam.Name : "N/A",
                r.Status,
                r.Message,
                MatchStadiumName = r.Match != null ? r.Match.StadiumName : null,
                MatchTime = r.Match != null ? r.Match.MatchTime : DateTime.MinValue,
                MatchType = r.Match != null ? r.Match.MatchType : 0,
                MatchStatus = r.Match != null ? r.Match.Status : "",
                CreatorTeamName = r.Match != null && r.Match.CreatorTeam != null ? r.Match.CreatorTeam.Name : "N/A",
                r.CreatedAt
            })
            .ToListAsync();

        return Ok(requests);
    }

    /// <summary>
    /// Hủy kèo do mình tạo. Chuyển status thành cancelled, reject tất cả pending requests.
    /// </summary>
    [Authorize]
    [HttpPost("{id}/cancel")]
    public async Task<IActionResult> CancelMatch(long id)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString) || !long.TryParse(userIdString, out var userId))
            return Unauthorized();

        var match = await _context.Matches
            .Include(m => m.CreatorTeam)
            .FirstOrDefaultAsync(m => m.Id == id);

        if (match == null) return NotFound(new { message = "Kèo không tồn tại." });
        if (match.CreatorTeam == null || match.CreatorTeam.ManagerId != userId)
            return Forbid();

        if (match.Status == "finished")
            return BadRequest(new { message = "Không thể hủy kèo đã kết thúc." });

        if (match.Status == "cancelled")
            return BadRequest(new { message = "Kèo này đã bị hủy trước đó." });

        // Reject tất cả pending requests và gửi thông báo
        var pendingRequests = await _context.MatchRequests
            .Include(r => r.RequestingTeam)
            .Where(r => r.MatchId == id && r.Status == "pending")
            .ToListAsync();

        foreach (var req in pendingRequests)
        {
            req.Status = "rejected";
            if (req.RequestingTeam != null && req.RequestingTeam.ManagerId > 0)
            {
                _context.Notifications.Add(new Notification
                {
                    UserId = req.RequestingTeam.ManagerId,
                    Message = $"Kèo trên sân {match.StadiumName} của đội {match.CreatorTeam?.Name} ngày {match.MatchTime.ToString("dd/MM/yyyy")} đã bị hủy.",
                    ActionLink = $"/matches"
                });
            }
        }

        // Thông báo cho đối thủ nếu đã chốt
        if (match.OpponentTeamId.HasValue)
        {
            var opponentTeam = await _context.Teams.FindAsync(match.OpponentTeamId.Value);
            if (opponentTeam != null && opponentTeam.ManagerId > 0)
            {
                _context.Notifications.Add(new Notification
                {
                    UserId = opponentTeam.ManagerId,
                    Message = $"Đội {match.CreatorTeam?.Name} đã hủy kèo giao hữu trên sân {match.StadiumName}.",
                    ActionLink = $"/matches"
                });
            }
        }

        match.Status = "cancelled";
        match.OpponentTeamId = null;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Đã hủy kèo thành công!" });
    }

    /// <summary>
    /// Rút yêu cầu nhận kèo đã gửi (chỉ rút được khi status = pending).
    /// </summary>
    [Authorize]
    [HttpDelete("{matchId}/withdraw-request")]
    public async Task<IActionResult> WithdrawRequest(long matchId)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString) || !long.TryParse(userIdString, out var userId))
            return Unauthorized();

        var myTeamIds = await _context.Teams
            .Where(t => t.ManagerId == userId)
            .Select(t => t.Id)
            .ToListAsync();

        var request = await _context.MatchRequests
            .FirstOrDefaultAsync(r => r.MatchId == matchId
                                   && myTeamIds.Contains(r.RequestingTeamId)
                                   && r.Status == "pending");

        if (request == null)
            return NotFound(new { message = "Không tìm thấy yêu cầu nhận kèo hoặc đã được xử lý." });

        _context.MatchRequests.Remove(request);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Đã rút yêu cầu nhận kèo thành công!" });
    }
}
