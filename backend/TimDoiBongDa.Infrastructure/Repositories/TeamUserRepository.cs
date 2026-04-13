using Microsoft.EntityFrameworkCore;
using TimDoiBongDa.Application.Interfaces;
using TimDoiBongDa.Application.Interfaces.Repositories;
using TimDoiBongDa.Domain.Entities;

namespace TimDoiBongDa.Infrastructure.Repositories;

public class TeamUserRepository : GenericRepository<TeamUser>, ITeamUserRepository
{
    public TeamUserRepository(IAppDbContext context) : base(context)
    {
    }

    public async Task<IEnumerable<TeamUser>> GetMembersByTeamIdAsync(long teamId)
    {
        return await _dbSet.Include(tu => tu.User).Where(tu => tu.TeamId == teamId).ToListAsync();
    }
}
