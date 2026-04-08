using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TimDoiBongDa.Api.Models;

public class MatchRating
{
    [Key]
    public long Id { get; set; }

    public long MatchId { get; set; }
    [ForeignKey("MatchId")]
    public Match? Match { get; set; }

    public long ReviewerTeamId { get; set; }
    [ForeignKey("ReviewerTeamId")]
    public Team? ReviewerTeam { get; set; }

    public long TargetTeamId { get; set; }
    [ForeignKey("TargetTeamId")]
    public Team? TargetTeam { get; set; }

    [Range(1, 5)]
    public int FairplayRating { get; set; }

    public bool IsSkillMatched { get; set; }
    public bool IsBomKeo { get; set; }

    public string? Comment { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
