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

    public async Task<Match?> GetByIdWithTeamsAsync(long id)
    {
        return await _dbSet
            .Include(m => m.CreatorTeam)
            .Include(m => m.OpponentTeam)
            .FirstOrDefaultAsync(m => m.Id == id);
    }
}
