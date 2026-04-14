using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TimDoiBongDa.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddIsHomeMatch : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsHomeMatch",
                table: "Matches",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsHomeMatch",
                table: "Matches");
        }
    }
}
