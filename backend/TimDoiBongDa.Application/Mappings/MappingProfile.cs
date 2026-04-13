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
                .ForMember(dest => dest.CreatorTeamName, opt => opt.MapAtRuntime()) // These are often handled by Include or specific logic
                .ForMember(dest => dest.OpponentTeamName, opt => opt.MapAtRuntime());

            // Add other maps as needed
            CreateMap<Team, TeamResponse>();
            CreateMap<Notification, object>(); // Placeholder
        }
    }
}
