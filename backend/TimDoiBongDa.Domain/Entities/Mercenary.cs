using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TimDoiBongDa.Domain.Entities;

public class Mercenary
{
    [Key]
    public long Id { get; set; }

    public long UserId { get; set; }
    [ForeignKey("UserId")]
    public User? User { get; set; }

    public DateTime AvailableDate { get; set; }

    [MaxLength(50)]
    public string? TimeFrame { get; set; }

    public int? AreaId { get; set; }
    [ForeignKey("AreaId")]
    public Area? Area { get; set; }

    public string? Note { get; set; }

    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = "available";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
