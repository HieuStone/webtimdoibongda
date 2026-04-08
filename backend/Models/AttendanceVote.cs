using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TimDoiBongDa.Api.Models;

public class AttendanceVote
{
    [Key]
    public long Id { get; set; }

    public long SessionId { get; set; }
    [ForeignKey("SessionId")]
    public AttendanceSession? Session { get; set; }

    public long UserId { get; set; }
    [ForeignKey("UserId")]
    public User? User { get; set; }

    public bool IsAttending { get; set; }

    [MaxLength(500)]
    public string? Note { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
