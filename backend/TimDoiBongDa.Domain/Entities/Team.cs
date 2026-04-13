using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TimDoiBongDa.Domain.Entities;

public class Team
{
    [Key]
    public long Id { get; set; }

    public long ManagerId { get; set; }
    [ForeignKey("ManagerId")]
    public User? Manager { get; set; }

    [Required]
    [MaxLength(150)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(50)]
    public string? ShortName { get; set; }

    [MaxLength(255)]
    public string? Logo { get; set; }

    public int? AreaId { get; set; }
    [ForeignKey("AreaId")]
    public Area? Area { get; set; }

    public long? HomeStadiumId { get; set; }

    public int SkillLevel { get; set; } = 3; // 1: Kém, 2: TB-Yếu, 3: TB, 4: Khá, 5: Bán chuyên

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public ICollection<TeamUser> TeamUsers { get; set; } = new List<TeamUser>();
}
