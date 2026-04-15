using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TimDoiBongDa.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMatchStatusEnum : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Chuẩn hóa dữ liệu cũ trước khi đổi kiểu cột
            migrationBuilder.Sql("UPDATE `Matches` SET `Status` = '0' WHERE `Status` = 'finding';");
            migrationBuilder.Sql("UPDATE `Matches` SET `Status` = '1' WHERE `Status` = 'waiting_approval';");
            migrationBuilder.Sql("UPDATE `Matches` SET `Status` = '2' WHERE `Status` = 'scheduled';");
            migrationBuilder.Sql("UPDATE `Matches` SET `Status` = '3' WHERE `Status` = 'finished';");
            migrationBuilder.Sql("UPDATE `Matches` SET `Status` = '4' WHERE `Status` = 'cancelled';");

            migrationBuilder.AlterColumn<int>(
                name: "Status",
                table: "Matches",
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
                name: "Status",
                table: "Matches",
                type: "varchar(20)",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int")
                .Annotation("MySql:CharSet", "utf8mb4");
        }
    }
}
