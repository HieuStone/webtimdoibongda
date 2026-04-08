using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TimDoiBongDa.Api.Models;

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
    [MaxLength(20)]
    public string TeamRole { get; set; } = "member"; // 'member', 'vice_captain'

    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
