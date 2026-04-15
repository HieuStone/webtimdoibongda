using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using TimDoiBongDa.Domain.Enums;

namespace TimDoiBongDa.Domain.Entities;

public class TeamUser
{
    [Key]
    public long Id { get; set; }

    public long TeamId { get; set; }
    [ForeignKey("TeamId")]
    public Team? Team { get; set; }

    public long UserId { get; set; }
    [ForeignKey("UserId")]
    public User? User { get; set; }

    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = "pending"; // 'pending', 'approved'

    [Required]
    public TeamRole TeamRole { get; set; } = TeamRole.Member; // 0 = Member, 1 = ViceCaptain

    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
