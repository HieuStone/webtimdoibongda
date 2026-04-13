using TimDoiBongDa.Domain.Entities;

namespace TimDoiBongDa.Application.Interfaces.Repositories;

public interface ITeamUserRepository : IGenericRepository<TeamUser>
{
    Task<IEnumerable<TeamUser>> GetMembersByTeamIdAsync(long teamId);
}
