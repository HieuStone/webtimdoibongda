using TimDoiBongDa.Application.DTOs.MatchDtos;
using TimDoiBongDa.Domain.Entities;

namespace TimDoiBongDa.Application.Interfaces.Repositories;

public interface IMatchRepository : IGenericRepository<Match>
{
    Task<IEnumerable<Match>> GetAvailableMatchesAsync(List<long> excludeTeamIds, MatchFilter filter);
    Task<Match?> GetByIdWithTeamsAsync(long id);
    Task<IEnumerable<Match>> GetMyCreatedMatchesAsync(List<long> teamIds, MatchFilter filter);
}
