using Microsoft.EntityFrameworkCore;
using TimDoiBongDa.Application.Interfaces;
using TimDoiBongDa.Application.Interfaces.Repositories;
using TimDoiBongDa.Domain.Entities;

namespace TimDoiBongDa.Infrastructure.Repositories;

public class AttendanceRepository : GenericRepository<AttendanceSession>, IAttendanceRepository
{
    public AttendanceRepository(IAppDbContext context) : base(context)
    {
    }

    public async Task<IEnumerable<AttendanceSession>> GetMySessionsWithDetailsAsync(List<long> teamIds)
    {
        return await _dbSet
            .Include(s => s.Team)
            .Include(s => s.Votes).ThenInclude(v => v.User)
            .Where(s => teamIds.Contains(s.TeamId))
            .OrderBy(s => s.TargetDate)
            .ToListAsync();
    }
}
