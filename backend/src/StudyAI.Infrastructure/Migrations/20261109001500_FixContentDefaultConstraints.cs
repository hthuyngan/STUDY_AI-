using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StudyAI.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FixContentDefaultConstraints : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Ensure default constraint for content_subjects.IsActive (true / 1)
            migrationBuilder.Sql(@"
IF NOT EXISTS (
    SELECT 1 FROM sys.default_constraints dc
    JOIN sys.columns c ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
    WHERE dc.parent_object_id = OBJECT_ID(N'[content_subjects]') AND c.name = N'IsActive'
)
BEGIN
    ALTER TABLE [content_subjects] ADD CONSTRAINT [DF_content_subjects_IsActive] DEFAULT CAST(1 AS bit) FOR [IsActive];
END;
");

            // 2. Ensure default constraint for content_chapters.OrderIndex (0)
            migrationBuilder.Sql(@"
IF NOT EXISTS (
    SELECT 1 FROM sys.default_constraints dc
    JOIN sys.columns c ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
    WHERE dc.parent_object_id = OBJECT_ID(N'[content_chapters]') AND c.name = N'OrderIndex'
)
BEGIN
    ALTER TABLE [content_chapters] ADD CONSTRAINT [DF_content_chapters_OrderIndex] DEFAULT 0 FOR [OrderIndex];
END;
");

            // 3. Ensure default constraint for content_lessons.OrderIndex (0)
            migrationBuilder.Sql(@"
IF NOT EXISTS (
    SELECT 1 FROM sys.default_constraints dc
    JOIN sys.columns c ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
    WHERE dc.parent_object_id = OBJECT_ID(N'[content_lessons]') AND c.name = N'OrderIndex'
)
BEGIN
    ALTER TABLE [content_lessons] ADD CONSTRAINT [DF_content_lessons_OrderIndex] DEFAULT 0 FOR [OrderIndex];
END;
");

            // 4. Ensure default constraint for content_questions.OrderIndex (0)
            migrationBuilder.Sql(@"
IF NOT EXISTS (
    SELECT 1 FROM sys.default_constraints dc
    JOIN sys.columns c ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
    WHERE dc.parent_object_id = OBJECT_ID(N'[content_questions]') AND c.name = N'OrderIndex'
)
BEGIN
    ALTER TABLE [content_questions] ADD CONSTRAINT [DF_content_questions_OrderIndex] DEFAULT 0 FOR [OrderIndex];
END;
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF EXISTS (SELECT 1 FROM sys.default_constraints WHERE name = N'DF_content_subjects_IsActive')
    ALTER TABLE [content_subjects] DROP CONSTRAINT [DF_content_subjects_IsActive];
IF EXISTS (SELECT 1 FROM sys.default_constraints WHERE name = N'DF_content_chapters_OrderIndex')
    ALTER TABLE [content_chapters] DROP CONSTRAINT [DF_content_chapters_OrderIndex];
IF EXISTS (SELECT 1 FROM sys.default_constraints WHERE name = N'DF_content_lessons_OrderIndex')
    ALTER TABLE [content_lessons] DROP CONSTRAINT [DF_content_lessons_OrderIndex];
IF EXISTS (SELECT 1 FROM sys.default_constraints WHERE name = N'DF_content_questions_OrderIndex')
    ALTER TABLE [content_questions] DROP CONSTRAINT [DF_content_questions_OrderIndex];
");
        }
    }
}
