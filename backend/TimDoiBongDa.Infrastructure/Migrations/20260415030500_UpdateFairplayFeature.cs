using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TimDoiBongDa.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UpdateFairplayFeature : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "AverageFairplayScore",
                table: "Teams",
                type: "double",
                nullable: true);

            migrationBuilder.AlterColumn<double>(
                name: "FairplayRating",
                table: "MatchRatings",
                type: "double",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AverageFairplayScore",
                table: "Teams");

            migrationBuilder.AlterColumn<int>(
                name: "FairplayRating",
                table: "MatchRatings",
                type: "int",
                nullable: false,
                oldClrType: typeof(double),
                oldType: "double");
        }
    }
}
