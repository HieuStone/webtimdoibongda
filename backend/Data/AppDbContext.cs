using Microsoft.EntityFrameworkCore;
using TimDoiBongDa.Api.Models;

namespace TimDoiBongDa.Api.Data;

public class AppDbContext : DbContext
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
    }
}
