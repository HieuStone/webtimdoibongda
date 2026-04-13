using Microsoft.EntityFrameworkCore;
using TimDoiBongDa.Application.Interfaces;
using TimDoiBongDa.Application.Interfaces.Repositories;
using TimDoiBongDa.Domain.Entities;

namespace TimDoiBongDa.Infrastructure.Repositories;

public class TeamRepository : GenericRepository<Team>, ITeamRepository
{
    public TeamRepository(IAppDbContext context) : base(context)
    {
    }

    public async Task<IEnumerable<Team>> GetAllWithManagerAsync()
    {
        return await _dbSet.Include(t => t.Manager).ToListAsync();
    }

    public async Task<IEnumerable<Team>> GetMyTeamsAsync(long userId, List<long> memberTeamIds)
    {
        return await _dbSet
            .Include(t => t.Manager)
            .Where(t => t.ManagerId == userId || memberTeamIds.Contains(t.Id))
            .Distinct()
            .ToListAsync();
    }

    public async Task<Team?> GetByIdWithManagerAsync(long id)
    {
        return await _dbSet.Include(t => t.Manager).FirstOrDefaultAsync(t => t.Id == id);
    }
}
