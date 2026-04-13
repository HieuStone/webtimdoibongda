using TimDoiBongDa.Domain.Entities;

namespace TimDoiBongDa.Application.Interfaces.Repositories;

public interface IAttendanceRepository : IGenericRepository<AttendanceSession>
{
    Task<IEnumerable<AttendanceSession>> GetMySessionsWithDetailsAsync(List<long> teamIds);
}
