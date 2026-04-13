using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TimDoiBongDa.Domain.Entities;

public class Area
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    public int? ParentId { get; set; }
    [ForeignKey("ParentId")]
    public Area? Parent { get; set; }

    [Required]
    [MaxLength(20)]
    public string Type { get; set; } = "city"; // 'city', 'district'

    public ICollection<Area> Children { get; set; } = new List<Area>();
}
