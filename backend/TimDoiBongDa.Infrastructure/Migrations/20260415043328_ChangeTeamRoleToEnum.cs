using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TimDoiBongDa.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ChangeTeamRoleToEnum : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Buước 0: Chuẩn hóa dữ liệu cũ trước khi đổi kiểu cột
            migrationBuilder.Sql("UPDATE `TeamUsers` SET `TeamRole` = '0' WHERE `TeamRole` = 'member' OR `TeamRole` = '' OR `TeamRole` IS NULL;");
            migrationBuilder.Sql("UPDATE `TeamUsers` SET `TeamRole` = '1' WHERE `TeamRole` = 'vice_captain';");

            migrationBuilder.AlterColumn<int>(
                name: "TeamRole",
                table: "TeamUsers",
                type: "int",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "varchar(20)",
                oldMaxLength: 20)
                .OldAnnotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "TeamRole",
                table: "TeamUsers",
                type: "varchar(20)",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int")
                .Annotation("MySql:CharSet", "utf8mb4");
        }
    }
}
