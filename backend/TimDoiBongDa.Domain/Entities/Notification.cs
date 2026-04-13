using System.ComponentModel.DataAnnotations;

namespace TimDoiBongDa.Domain.Entities;

public class Notification
{
    [Key]
    public long Id { get; set; }
    
    // Thuộc về User nào
    public long UserId { get; set; }
    public User? User { get; set; }

    public string Message { get; set; } = string.Empty;
    public string? ActionLink { get; set; }
    
    public bool IsRead { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
