using TimDoiBongDa.Domain.Entities;

namespace TimDoiBongDa.Application.Interfaces.Repositories;

public interface ITeamRepository : IGenericRepository<Team>
{
    Task<IEnumerable<Team>> GetAllWithManagerAsync();
    Task<IEnumerable<Team>> GetMyTeamsAsync(long userId, List<long> memberTeamIds);
    Task<Team?> GetByIdWithManagerAsync(long id);
}
