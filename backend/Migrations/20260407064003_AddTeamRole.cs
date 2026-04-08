using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TimDoiBongDa.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTeamRole : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "TeamRole",
                table: "TeamUsers",
                type: "varchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TeamRole",
                table: "TeamUsers");
        }
    }
}
