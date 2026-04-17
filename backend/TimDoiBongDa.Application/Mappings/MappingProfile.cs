using AutoMapper;
using TimDoiBongDa.Domain.Entities;
using TimDoiBongDa.Application.DTOs.MatchDtos;
using TimDoiBongDa.Application.DTOs.TeamDtos;

namespace TimDoiBongDa.Application.Mappings
{
    public class MappingProfile : Profile
    {
        public MappingProfile()
        {
            CreateMap<Match, MatchResponse>()
                .ForMember(dest => dest.CreatorTeamName, opt => opt.MapFrom(src => src.CreatorTeam != null ? src.CreatorTeam.Name : "N/A"))
                .ForMember(dest => dest.OpponentTeamName, opt => opt.MapFrom(src => src.OpponentTeam != null ? src.OpponentTeam.Name : null))
                .ForMember(dest => dest.CreatorAvatar, opt => opt.MapFrom(src => (src.CreatorTeam != null && src.CreatorTeam.Manager != null) ? src.CreatorTeam.Manager.Avatar : null))
                .ForMember(dest => dest.CreatorFairplayScore, opt => opt.MapFrom(src => src.CreatorTeam != null ? src.CreatorTeam.AverageFairplayScore : null));

            CreateMap<Team, TeamResponse>()
                .ForMember(dest => dest.ManagerName, opt => opt.MapFrom(src => src.Manager != null ? src.Manager.Name : "N/A"))
                .ForMember(dest => dest.ManagerAvatar, opt => opt.MapFrom(src => src.Manager != null ? src.Manager.Avatar : null));
            CreateMap<Notification, object>(); // Placeholder
        }
    }
}
