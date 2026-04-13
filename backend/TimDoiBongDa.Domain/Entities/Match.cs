using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TimDoiBongDa.Domain.Entities;

public class Match
{
    [Key]
    public long Id { get; set; }

    public long CreatorTeamId { get; set; }
    [ForeignKey("CreatorTeamId")]
    public Team? CreatorTeam { get; set; }

    public long? OpponentTeamId { get; set; }
    [ForeignKey("OpponentTeamId")]
    public Team? OpponentTeam { get; set; }

    [MaxLength(200)]
    public string? StadiumName { get; set; }

    public int? AreaId { get; set; }
    [ForeignKey("AreaId")]
    public Area? Area { get; set; }

    public DateTime MatchTime { get; set; }

    public int MatchType { get; set; } = 7; // 5, 7, 11

    public int SkillRequirement { get; set; } = 3;

    [MaxLength(50)]
    public string PaymentType { get; set; } = "50-50";

    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = "finding";

    public string? Note { get; set; }

    // Kết quả trận đấu
    public int? CreatorScore { get; set; }
    public int? OpponentScore { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<MatchRequest> Requests { get; set; } = new List<MatchRequest>();
}
