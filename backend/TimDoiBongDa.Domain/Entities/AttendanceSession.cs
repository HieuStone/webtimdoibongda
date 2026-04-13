using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TimDoiBongDa.Domain.Entities;

public class AttendanceSession
{
    [Key]
    public long Id { get; set; }

    public long TeamId { get; set; }
    [ForeignKey("TeamId")]
    public Team? Team { get; set; }

    public DateTime TargetDate { get; set; }

    public long? MatchId { get; set; }
    [ForeignKey("MatchId")]
    public Match? Match { get; set; }

    [MaxLength(200)]
    public string? Title { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<AttendanceVote> Votes { get; set; } = new List<AttendanceVote>();
}
