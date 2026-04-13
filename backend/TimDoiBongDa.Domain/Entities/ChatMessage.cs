using System.ComponentModel.DataAnnotations;

namespace TimDoiBongDa.Domain.Entities;

public class ChatMessage
{
    [Key]
    public long Id { get; set; }
    
    // Loại phòng chat: "MATCH" hoặc "TEAM"
    public string RoomType { get; set; } = string.Empty;
    
    // ID của phòng tương ứng (MatchId hoặc TeamId)
    public long RoomId { get; set; }
    
    public long SenderId { get; set; }
    public User? Sender { get; set; }

    [Required]
    public string Message { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
