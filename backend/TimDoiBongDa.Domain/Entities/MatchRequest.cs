using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TimDoiBongDa.Domain.Entities;

public class MatchRequest
{
    [Key]
    public long Id { get; set; }

    public long MatchId { get; set; }
    [ForeignKey("MatchId")]
    public Match? Match { get; set; }

    public long RequestingTeamId { get; set; }
    [ForeignKey("RequestingTeamId")]
    public Team? RequestingTeam { get; set; }

    public string? Message { get; set; }

    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = "pending";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
