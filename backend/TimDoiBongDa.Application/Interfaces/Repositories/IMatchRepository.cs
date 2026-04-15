using TimDoiBongDa.Application.DTOs.MatchDtos;
using TimDoiBongDa.Domain.Entities;

namespace TimDoiBongDa.Application.Interfaces.Repositories;

public interface IMatchRepository : IGenericRepository<Match>
{
    Task<Match?> GetByIdWithTeamsAsync(long id);
}
