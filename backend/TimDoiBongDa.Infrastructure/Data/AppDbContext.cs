using Microsoft.EntityFrameworkCore;
using TimDoiBongDa.Domain.Entities;
using TimDoiBongDa.Domain.Entities;
using TimDoiBongDa.Application.Interfaces;

namespace TimDoiBongDa.Infrastructure.Data;

public class AppDbContext : DbContext, IAppDbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users { get; set; } = null!;
    public DbSet<Team> Teams { get; set; } = null!;
    public DbSet<TeamUser> TeamUsers { get; set; } = null!;
    public DbSet<Area> Areas { get; set; } = null!;
    public DbSet<Match> Matches { get; set; } = null!;
    public DbSet<MatchRequest> MatchRequests { get; set; } = null!;
    public DbSet<MatchRating> MatchRatings { get; set; } = null!;
    public DbSet<Mercenary> Mercenaries { get; set; } = null!;
    public DbSet<AttendanceSession> AttendanceSessions { get; set; } = null!;
    public DbSet<AttendanceVote> AttendanceVotes { get; set; } = null!;
    public DbSet<Notification> Notifications { get; set; } = null!;
    public DbSet<ChatMessage> ChatMessages { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure relations and prevent cascade delete cycles
        modelBuilder.Entity<Match>()
            .HasOne(m => m.CreatorTeam)
            .WithMany()
            .HasForeignKey(m => m.CreatorTeamId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Match>()
            .HasOne(m => m.OpponentTeam)
            .WithMany()
            .HasForeignKey(m => m.OpponentTeamId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<MatchRequest>()
            .HasOne(mr => mr.RequestingTeam)
            .WithMany()
            .HasForeignKey(mr => mr.RequestingTeamId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<MatchRating>()
            .HasOne(r => r.ReviewerTeam)
            .WithMany()
            .HasForeignKey(r => r.ReviewerTeamId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<MatchRating>()
            .HasOne(r => r.TargetTeam)
            .WithMany()
            .HasForeignKey(r => r.TargetTeamId)
            .OnDelete(DeleteBehavior.Restrict);
            
        modelBuilder.Entity<Team>()
            .HasOne(t => t.Manager)
            .WithMany(u => u.ManagedTeams)
            .HasForeignKey(t => t.ManagerId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<AttendanceSession>()
            .HasOne(a => a.Team)
            .WithMany()
            .HasForeignKey(a => a.TeamId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<AttendanceSession>()
            .HasOne(a => a.Match)
            .WithMany()
            .HasForeignKey(a => a.MatchId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<AttendanceVote>()
            .HasOne(v => v.Session)
            .WithMany(s => s.Votes)
            .HasForeignKey(v => v.SessionId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<AttendanceVote>()
            .HasOne(v => v.User)
            .WithMany()
            .HasForeignKey(v => v.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Notification>()
            .HasOne(n => n.User)
            .WithMany()
            .HasForeignKey(n => n.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ChatMessage>()
            .HasOne(c => c.Sender)
            .WithMany()
            .HasForeignKey(c => c.SenderId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
