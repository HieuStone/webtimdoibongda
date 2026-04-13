using Microsoft.EntityFrameworkCore;
using TimDoiBongDa.Domain.Entities;
using Microsoft.EntityFrameworkCore.Infrastructure;

namespace TimDoiBongDa.Application.Interfaces;

public interface IAppDbContext
{
    DbSet<User> Users { get; set; }
    DbSet<Team> Teams { get; set; }
    DbSet<TeamUser> TeamUsers { get; set; }
    DbSet<Area> Areas { get; set; }
    DbSet<Match> Matches { get; set; }
    DbSet<MatchRequest> MatchRequests { get; set; }
    DbSet<MatchRating> MatchRatings { get; set; }
    DbSet<Mercenary> Mercenaries { get; set; }
    DbSet<AttendanceSession> AttendanceSessions { get; set; }
    DbSet<AttendanceVote> AttendanceVotes { get; set; }
    DbSet<Notification> Notifications { get; set; }
    DbSet<ChatMessage> ChatMessages { get; set; }
    
    DatabaseFacade Database { get; }
    DbSet<TEntity> Set<TEntity>() where TEntity : class;

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
