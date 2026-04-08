using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TimDoiBongDa.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialWithScores : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "CreatorScore",
                table: "Matches",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "OpponentScore",
                table: "Matches",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CreatorScore",
                table: "Matches");

            migrationBuilder.DropColumn(
                name: "OpponentScore",
                table: "Matches");
        }
    }
}
