using Microsoft.EntityFrameworkCore;
using TimDoiBongDa.Application.DTOs.MatchDtos;
using TimDoiBongDa.Application.Interfaces;
using TimDoiBongDa.Application.Interfaces.Repositories;
using TimDoiBongDa.Domain.Entities;

namespace TimDoiBongDa.Infrastructure.Repositories;

public class MatchRepository : GenericRepository<Match>, IMatchRepository
{
    public MatchRepository(IAppDbContext context) : base(context)
    {
    }

    public async Task<IEnumerable<Match>> GetAvailableMatchesAsync(List<long> excludeTeamIds, MatchFilter filter)
    {
        var query = _dbSet
            .Include(m => m.CreatorTeam)
            .Include(m => m.OpponentTeam)
            .Where(m => (m.Status == "finding" || m.Status == "waiting_approval")
                     && (excludeTeamIds.Count == 0 || !excludeTeamIds.Contains(m.CreatorTeamId))
                     && m.MatchTime >= DateTime.Now);

        if (filter.MatchTime.HasValue)
        {
            var date = filter.MatchTime.Value.Date;
            query = query.Where(m => m.MatchTime.Date == date);
        }

        if (filter.TeamId.HasValue)
        {
            query = query.Where(m => m.CreatorTeamId == filter.TeamId.Value);
        }

        if (!string.IsNullOrEmpty(filter.SearchTerm))
        {
            var term = filter.SearchTerm.ToLower();
            query = query.Where(m => m.StadiumName.ToLower().Contains(term) 
                                 || m.CreatorTeam.Name.ToLower().Contains(term));
        }

        return await query
            .OrderBy(m => m.MatchTime)
            .ToListAsync();
    }

    public async Task<Match?> GetByIdWithTeamsAsync(long id)
    {
        return await _dbSet
            .Include(m => m.CreatorTeam)
            .Include(m => m.OpponentTeam)
            .FirstOrDefaultAsync(m => m.Id == id);
    }

    public async Task<IEnumerable<Match>> GetMyCreatedMatchesAsync(List<long> teamIds, MatchFilter filter)
    {
        var query = _dbSet
            .Include(m => m.CreatorTeam)
            .Include(m => m.OpponentTeam)
            .Where(m => teamIds.Contains(m.CreatorTeamId)
                     && (m.Status == "finding" || m.Status == "waiting_approval" || m.Status == "scheduled"));

        if (filter.MatchTime.HasValue)
        {
            var date = filter.MatchTime.Value.Date;
            query = query.Where(m => m.MatchTime.Date == date);
        }

        if (filter.TeamId.HasValue)
        {
            query = query.Where(m => m.CreatorTeamId == filter.TeamId.Value);
        }

        if (!string.IsNullOrEmpty(filter.SearchTerm))
        {
            var term = filter.SearchTerm.ToLower();
            query = query.Where(m => m.StadiumName.ToLower().Contains(term) 
                                 || m.CreatorTeam.Name.ToLower().Contains(term)
                                 || (m.OpponentTeam != null && m.OpponentTeam.Name.ToLower().Contains(term)));
        }

        return await query
            .OrderByDescending(m => m.CreatedAt)
            .ToListAsync();
    }
}
