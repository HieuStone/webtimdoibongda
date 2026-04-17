using System.ComponentModel.DataAnnotations;
using TimDoiBongDa.Domain.Enums;

namespace TimDoiBongDa.Application.DTOs.MatchDtos;

public class CreateMatchRequest
{
    [Required]
    public long CreatorTeamId { get; set; }

    public string? StadiumName { get; set; }
    
    public int? AreaId { get; set; }

    [Required]
    public DateTime MatchTime { get; set; }

    public int MatchType { get; set; } = 7;
    public bool IsHomeMatch { get; set; } = true;
    public bool IsAutoMatch { get; set; } = false;
    public int SkillRequirement { get; set; } = 3;
    public string PaymentType { get; set; } = "50-50";
    public string? Note { get; set; }
}

public class MatchResponse
{
    public long Id { get; set; }
    public string CreatorTeamName { get; set; } = string.Empty;
    public long CreatorTeamId { get; set; }
    public string? OpponentTeamName { get; set; }
    public string? StadiumName { get; set; }
    public DateTime MatchTime { get; set; }
    public int MatchType { get; set; }
    public bool IsHomeMatch { get; set; }
    public bool IsAutoMatch { get; set; }
    public int SkillRequirement { get; set; }
    public string PaymentType { get; set; } = string.Empty;
    public MatchStatus Status { get; set; }
    public string? Note { get; set; }
    public int? CreatorScore { get; set; }
    public int? OpponentScore { get; set; }
    public long? OpponentTeamId { get; set; }
    public string? CreatorAvatar { get; set; }
    public double? CreatorFairplayScore { get; set; }
}

public class ToggleAutoMatchDto
{
    public bool IsEnabled { get; set; }
}
