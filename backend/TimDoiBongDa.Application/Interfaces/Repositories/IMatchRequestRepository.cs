using TimDoiBongDa.Application.DTOs.MatchDtos;
using TimDoiBongDa.Domain.Entities;

namespace TimDoiBongDa.Application.Interfaces.Repositories;

public interface IMatchRequestRepository : IGenericRepository<MatchRequest>
{
    Task<IEnumerable<MatchRequest>> GetRequestsByMatchIdWithTeamsAsync(long matchId);
    Task<IEnumerable<MatchRequest>> GetSentRequestsWithDetailsAsync(List<long> teamIds, MatchFilter filter);
}
