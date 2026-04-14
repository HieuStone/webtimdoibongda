using Microsoft.EntityFrameworkCore;
using TimDoiBongDa.Application.Interfaces;
using TimDoiBongDa.Application.Interfaces.Repositories;
using TimDoiBongDa.Application.DTOs.MatchDtos;
using TimDoiBongDa.Domain.Entities;

namespace TimDoiBongDa.Infrastructure.Repositories;

public class MatchRequestRepository : GenericRepository<MatchRequest>, IMatchRequestRepository
{
    public MatchRequestRepository(IAppDbContext context) : base(context)
    {
    }

    public async Task<IEnumerable<MatchRequest>> GetRequestsByMatchIdWithTeamsAsync(long matchId)
    {
        return await _dbSet
            .Include(r => r.RequestingTeam)
            .Where(r => r.MatchId == matchId)
            .ToListAsync();
    }

    public async Task<IEnumerable<MatchRequest>> GetSentRequestsWithDetailsAsync(List<long> teamIds, MatchFilter filter)
    {
        var query = _dbSet
            .Include(r => r.Match).ThenInclude(m => m!.CreatorTeam)
            .Include(r => r.RequestingTeam)
            .Where(r => teamIds.Contains(r.RequestingTeamId) && r.Status == "pending");

        if (filter.MatchTime.HasValue)
        {
            var date = filter.MatchTime.Value.Date;
            query = query.Where(r => r.Match != null && r.Match.MatchTime.Date == date);
        }

        if (filter.TeamId.HasValue)
        {
            query = query.Where(r => r.RequestingTeamId == filter.TeamId.Value);
        }

        if (!string.IsNullOrEmpty(filter.SearchTerm))
        {
            var term = filter.SearchTerm.ToLower();
            query = query.Where(r => (r.Match != null && r.Match.StadiumName.ToLower().Contains(term))
                                 || (r.Match != null && r.Match.CreatorTeam != null && r.Match.CreatorTeam.Name.ToLower().Contains(term)));
        }

        return await query
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();
    }
}
