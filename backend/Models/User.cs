using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TimDoiBongDa.Api.Models;

public class User
{
    [Key]
    public long Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [MaxLength(100)]
    public string Email { get; set; } = string.Empty;

    [MaxLength(20)]
    public string? Phone { get; set; }

    [Required]
    public string Password { get; set; } = string.Empty;

    [MaxLength(255)]
    public string? Avatar { get; set; }

    public int? Height { get; set; }
    public int? Weight { get; set; }

    [MaxLength(20)]
    public string? PreferredPosition { get; set; }

    [MaxLength(10)]
    public string? StrongFoot { get; set; } // 'left', 'right', 'both'

    [Required]
    [MaxLength(20)]
    public string Role { get; set; } = "player"; // 'admin', 'player'

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public ICollection<TeamUser> TeamUsers { get; set; } = new List<TeamUser>();
    public ICollection<Team> ManagedTeams { get; set; } = new List<Team>();
}
