using System.ComponentModel.DataAnnotations;

namespace TimDoiBongDa.Application.DTOs.TeamDtos;

public class CreateTeamRequest
{
    [Required]
    [MaxLength(150)]
    public string Name { get; set; } = string.Empty;

    public string? ShortName { get; set; }
    
    public int? AreaId { get; set; }
    
    public int SkillLevel { get; set; } = 3;
}

public class TeamResponse
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? ShortName { get; set; }
    public int SkillLevel { get; set; }
    public long ManagerId { get; set; }
    public string ManagerName { get; set; } = string.Empty;
    public double? AverageFairplayScore { get; set; }
}
