using System;
using Microsoft.EntityFrameworkCore.Migrations;
using MySql.EntityFrameworkCore.Metadata;

#nullable disable

namespace NimbusSales.Crm.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "Accounts",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    AccountRef = table.Column<string>(type: "varchar(16)", maxLength: 16, nullable: false),
                    Name = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false),
                    Industry = table.Column<string>(type: "varchar(80)", maxLength: 80, nullable: true),
                    Country = table.Column<string>(type: "varchar(80)", maxLength: 80, nullable: true),
                    Website = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetime", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Accounts", x => x.Id);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "Contacts",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    ContactRef = table.Column<string>(type: "varchar(16)", maxLength: 16, nullable: false),
                    AccountId = table.Column<long>(type: "bigint", nullable: false),
                    FirstName = table.Column<string>(type: "varchar(80)", maxLength: 80, nullable: false),
                    LastName = table.Column<string>(type: "varchar(80)", maxLength: 80, nullable: false),
                    Email = table.Column<string>(type: "varchar(160)", maxLength: 160, nullable: false),
                    Phone = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: true),
                    JobTitle = table.Column<string>(type: "varchar(120)", maxLength: 120, nullable: true),
                    Status = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false),
                    CreditRiskNote = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true),
                    LastContactedAt = table.Column<DateTimeOffset>(type: "datetime", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetime", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Contacts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Contacts_Accounts_AccountId",
                        column: x => x.AccountId,
                        principalTable: "Accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "Activities",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    ContactId = table.Column<long>(type: "bigint", nullable: false),
                    Type = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false),
                    Subject = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false),
                    Notes = table.Column<string>(type: "varchar(2000)", maxLength: 2000, nullable: true),
                    OccurredAt = table.Column<DateTimeOffset>(type: "datetime", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetime", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Activities", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Activities_Contacts_ContactId",
                        column: x => x.ContactId,
                        principalTable: "Contacts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "Deals",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    DealRef = table.Column<string>(type: "varchar(16)", maxLength: 16, nullable: false),
                    AccountId = table.Column<long>(type: "bigint", nullable: false),
                    ContactId = table.Column<long>(type: "bigint", nullable: false),
                    Title = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false),
                    Value = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    ExpectedCloseDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Stage = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false),
                    ClosedDate = table.Column<DateOnly>(type: "date", nullable: true),
                    LostReason = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetime", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetime", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Deals", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Deals_Accounts_AccountId",
                        column: x => x.AccountId,
                        principalTable: "Accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Deals_Contacts_ContactId",
                        column: x => x.ContactId,
                        principalTable: "Contacts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "DealStageChanges",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    DealId = table.Column<long>(type: "bigint", nullable: false),
                    FromStage = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: true),
                    ToStage = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false),
                    ChangedAt = table.Column<DateTimeOffset>(type: "datetime", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DealStageChanges", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DealStageChanges_Deals_DealId",
                        column: x => x.DealId,
                        principalTable: "Deals",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_Accounts_AccountRef",
                table: "Accounts",
                column: "AccountRef",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Activities_ContactId",
                table: "Activities",
                column: "ContactId");

            migrationBuilder.CreateIndex(
                name: "IX_Activities_OccurredAt",
                table: "Activities",
                column: "OccurredAt");

            migrationBuilder.CreateIndex(
                name: "IX_Contacts_AccountId",
                table: "Contacts",
                column: "AccountId");

            migrationBuilder.CreateIndex(
                name: "IX_Contacts_ContactRef",
                table: "Contacts",
                column: "ContactRef",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Contacts_LastName",
                table: "Contacts",
                column: "LastName");

            migrationBuilder.CreateIndex(
                name: "IX_Contacts_Status",
                table: "Contacts",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Deals_AccountId",
                table: "Deals",
                column: "AccountId");

            migrationBuilder.CreateIndex(
                name: "IX_Deals_ContactId",
                table: "Deals",
                column: "ContactId");

            migrationBuilder.CreateIndex(
                name: "IX_Deals_DealRef",
                table: "Deals",
                column: "DealRef",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Deals_Stage",
                table: "Deals",
                column: "Stage");

            migrationBuilder.CreateIndex(
                name: "IX_DealStageChanges_DealId",
                table: "DealStageChanges",
                column: "DealId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Activities");

            migrationBuilder.DropTable(
                name: "DealStageChanges");

            migrationBuilder.DropTable(
                name: "Deals");

            migrationBuilder.DropTable(
                name: "Contacts");

            migrationBuilder.DropTable(
                name: "Accounts");
        }
    }
}
