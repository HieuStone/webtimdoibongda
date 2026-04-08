using System.ComponentModel.DataAnnotations;

namespace TimDoiBongDa.Api.DTOs;

public class CreateMatchRequest
{
    [Required]
    public long CreatorTeamId { get; set; }

    public string? StadiumName { get; set; }
    
    public int? AreaId { get; set; }

    [Required]
    public DateTime MatchTime { get; set; }

    public int MatchType { get; set; } = 7;
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
    public int SkillRequirement { get; set; }
    public string PaymentType { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? Note { get; set; }
    public int? CreatorScore { get; set; }
    public int? OpponentScore { get; set; }
    public long? OpponentTeamId { get; set; }
}
