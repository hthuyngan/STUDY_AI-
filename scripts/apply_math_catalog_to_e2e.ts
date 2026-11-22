import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const catalogPath = path.resolve('backend/data/curriculum/math-vietnam-catalog.v1.json');
if (!fs.existsSync(catalogPath)) {
  console.error(`Catalog not found: ${catalogPath}`);
  process.exit(1);
}

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));

// Build SQL script with UTF-8 support
const sqlStatements: string[] = [];
sqlStatements.push(`
SET NOCOUNT ON;
BEGIN TRANSACTION;
DECLARE @adminId nvarchar(64);
SELECT TOP 1 @adminId = Id FROM users WHERE Role = 'admin';
IF @adminId IS NULL
BEGIN
    SELECT TOP 1 @adminId = Id FROM users;
END
`);

function escapeSql(str: string | null | undefined): string {
  if (str === null || str === undefined) return 'NULL';
  return `N'${str.replace(/'/g, "''")}'`;
}

// 1. Upsert Subjects
for (const sub of catalog.subjects) {
  sqlStatements.push(`
IF EXISTS (SELECT 1 FROM content_subjects WHERE Id = ${escapeSql(sub.id)} OR Code = ${escapeSql(sub.code)})
BEGIN
    UPDATE content_subjects
    SET Name = ${escapeSql(sub.name)},
        Grade = ${escapeSql(sub.grade)},
        Description = ${escapeSql(sub.description)},
        OrderIndex = ${sub.orderIndex},
        IsActive = 1,
        UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = ${escapeSql(sub.id)} OR Code = ${escapeSql(sub.code)};
END
ELSE
BEGIN
    INSERT INTO content_subjects (Id, Code, Name, Grade, Description, OrderIndex, IsActive, CreatedAt, UpdatedAt)
    VALUES (${escapeSql(sub.id)}, ${escapeSql(sub.code)}, ${escapeSql(sub.name)}, ${escapeSql(sub.grade)}, ${escapeSql(sub.description)}, ${sub.orderIndex}, 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());
END
`);

  // 2. Upsert Chapters
  for (const ch of sub.chapters) {
    sqlStatements.push(`
IF EXISTS (SELECT 1 FROM content_chapters WHERE Id = ${escapeSql(ch.id)})
BEGIN
    UPDATE content_chapters
    SET SubjectId = ${escapeSql(sub.id)},
        Title = ${escapeSql(ch.title)},
        Description = ${escapeSql(ch.description)},
        OrderIndex = ${ch.orderIndex},
        IsActive = 1,
        Status = ${escapeSql(ch.status)},
        SourceName = ${escapeSql(ch.sourceName)},
        SourceUrl = ${escapeSql(ch.sourceUrl)},
        UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = ${escapeSql(ch.id)};
END
ELSE
BEGIN
    INSERT INTO content_chapters (Id, SubjectId, Title, Description, OrderIndex, IsActive, Status, SourceName, SourceUrl, CreatedAt, UpdatedAt)
    VALUES (${escapeSql(ch.id)}, ${escapeSql(sub.id)}, ${escapeSql(ch.title)}, ${escapeSql(ch.description)}, ${ch.orderIndex}, 1, ${escapeSql(ch.status)}, ${escapeSql(ch.sourceName)}, ${escapeSql(ch.sourceUrl)}, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());
END
`);

    // 3. Upsert Topics
    for (const top of ch.topics) {
      sqlStatements.push(`
IF EXISTS (SELECT 1 FROM content_topics WHERE Id = ${escapeSql(top.id)})
BEGIN
    UPDATE content_topics
    SET ChapterId = ${escapeSql(ch.id)},
        Title = ${escapeSql(top.title)},
        Description = ${escapeSql(top.description)},
        OrderIndex = ${top.orderIndex},
        IsActive = 1,
        UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = ${escapeSql(top.id)};
END
ELSE
BEGIN
    INSERT INTO content_topics (Id, ChapterId, Title, Description, OrderIndex, IsActive, CreatedAt, UpdatedAt)
    VALUES (${escapeSql(top.id)}, ${escapeSql(ch.id)}, ${escapeSql(top.title)}, ${escapeSql(top.description)}, ${top.orderIndex}, 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());
END
`);

      // 4. Upsert Lessons
      for (const les of top.lessons) {
        const objectivesJson = JSON.stringify(les.learningObjectives);
        const defsJson = JSON.stringify(les.definitions);
        const formsJson = JSON.stringify(les.formulas);
        const exsJson = JSON.stringify(les.examples);
        const notesJson = JSON.stringify(les.importantNotes);
        const sumsJson = JSON.stringify(les.summaryPoints);

        sqlStatements.push(`
IF EXISTS (SELECT 1 FROM content_lessons WHERE Id = ${escapeSql(les.id)})
BEGIN
    UPDATE content_lessons
    SET ChapterId = ${escapeSql(ch.id)},
        TopicId = ${escapeSql(top.id)},
        Title = ${escapeSql(les.title)},
        Slug = ${escapeSql(les.slug)},
        OrderIndex = ${les.orderIndex},
        Status = ${escapeSql(les.status)},
        SourceName = ${escapeSql(les.sourceName)},
        SourceUrl = ${escapeSql(les.sourceUrl)},
        SourceLicense = ${escapeSql(les.sourceLicense)},
        Introduction = ${escapeSql(les.introduction)},
        LearningObjectivesJson = ${escapeSql(objectivesJson)},
        DefinitionsJson = ${escapeSql(defsJson)},
        FormulasJson = ${escapeSql(formsJson)},
        ExamplesJson = ${escapeSql(exsJson)},
        ImportantNotesJson = ${escapeSql(notesJson)},
        SummaryPointsJson = ${escapeSql(sumsJson)},
        UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = ${escapeSql(les.id)};
END
ELSE
BEGIN
    INSERT INTO content_lessons (
        Id, ChapterId, TopicId, Title, Slug, OrderIndex, Status, AuthorId,
        SourceName, SourceUrl, SourceLicense, Introduction,
        LearningObjectivesJson, DefinitionsJson, FormulasJson, ExamplesJson,
        ImportantNotesJson, SummaryPointsJson, CreatedAt, UpdatedAt
    )
    VALUES (
        ${escapeSql(les.id)}, ${escapeSql(ch.id)}, ${escapeSql(top.id)}, ${escapeSql(les.title)}, ${escapeSql(les.slug)}, ${les.orderIndex}, ${escapeSql(les.status)}, @adminId,
        ${escapeSql(les.sourceName)}, ${escapeSql(les.sourceUrl)}, ${escapeSql(les.sourceLicense)}, ${escapeSql(les.introduction)},
        ${escapeSql(objectivesJson)}, ${escapeSql(defsJson)}, ${escapeSql(formsJson)}, ${escapeSql(exsJson)},
        ${escapeSql(notesJson)}, ${escapeSql(sumsJson)}, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
    );
END
`);

        // 5. Upsert Videos
        for (const vid of les.videos) {
          sqlStatements.push(`
IF EXISTS (SELECT 1 FROM content_lesson_videos WHERE Id = ${escapeSql(vid.id)})
BEGIN
    UPDATE content_lesson_videos
    SET LessonId = ${escapeSql(les.id)},
        Title = ${escapeSql(vid.title)},
        Description = ${escapeSql(vid.description)},
        Provider = ${escapeSql(vid.provider)},
        SourceUrl = ${escapeSql(vid.sourceUrl)},
        EmbedUrl = ${escapeSql(vid.embedUrl)},
        YouTubeVideoId = ${escapeSql(vid.youtubeVideoId)},
        ChannelName = ${escapeSql(vid.channelName)},
        IsPrimary = ${vid.isPrimary ? 1 : 0},
        AttributionText = ${escapeSql(vid.attributionText)},
        DurationSeconds = ${vid.durationSeconds},
        ThumbnailUrl = ${escapeSql(vid.thumbnailUrl)},
        SortOrder = ${vid.sortOrder},
        EmbedAllowed = ${vid.embedAllowed ? 1 : 0},
        VerificationStatus = ${escapeSql(vid.verificationStatus)},
        VerifiedAt = SYSDATETIMEOFFSET(),
        LastVerifiedAt = SYSDATETIMEOFFSET(),
        IsPublished = 1,
        UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = ${escapeSql(vid.id)};
END
ELSE
BEGIN
    INSERT INTO content_lesson_videos (
        Id, LessonId, Title, Description, Provider, SourceUrl, EmbedUrl,
        YouTubeVideoId, ChannelName, IsPrimary, AttributionText, Language,
        DurationSeconds, ThumbnailUrl, SortOrder, EmbedAllowed,
        VerificationStatus, VerifiedAt, LastVerifiedAt, IsPublished, CreatedAt, UpdatedAt
    )
    VALUES (
        ${escapeSql(vid.id)}, ${escapeSql(les.id)}, ${escapeSql(vid.title)}, ${escapeSql(vid.description)},
        ${escapeSql(vid.provider)}, ${escapeSql(vid.sourceUrl)}, ${escapeSql(vid.embedUrl)},
        ${escapeSql(vid.youtubeVideoId)}, ${escapeSql(vid.channelName)}, ${vid.isPrimary ? 1 : 0},
        ${escapeSql(vid.attributionText)}, N'vi', ${vid.durationSeconds}, ${escapeSql(vid.thumbnailUrl)},
        ${vid.sortOrder}, ${vid.embedAllowed ? 1 : 0}, ${escapeSql(vid.verificationStatus)},
        SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET(), 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
    );
END
`);
        }
      }
    }
  }
}

sqlStatements.push(`
COMMIT TRANSACTION;
SELECT 'SUCCESS' AS Status;
`);

const tempSqlPath = path.resolve('temp_apply_catalog.sql');
fs.writeFileSync(tempSqlPath, sqlStatements.join('\n'), 'utf-8');

const psScriptPath = path.resolve('temp_apply.ps1');
const psContent = `
$sql = Get-Content -LiteralPath '${tempSqlPath.replace(/'/g, "''")}' -Raw -Encoding UTF8
$conn = New-Object System.Data.SqlClient.SqlConnection("Server=localhost\\SQLEXPRESS;Database=StudyAIDb_E2E;Trusted_Connection=True;TrustServerCertificate=True")
$conn.Open()
$cmd = $conn.CreateCommand()
$cmd.CommandText = $sql
$cmd.CommandTimeout = 180
$res = $cmd.ExecuteNonQuery()
$conn.Close()
Write-Host "DATABASE_APPLY_SUCCESS"
`;
fs.writeFileSync(psScriptPath, psContent, 'utf-8');

console.log('Applying catalog to StudyAIDb_E2E via SqlClient...');
try {
  const result = execSync(`powershell -ExecutionPolicy Bypass -File "${psScriptPath}"`, {
    encoding: 'utf-8'
  });
  console.log('Result:\n', result);
} finally {
  if (fs.existsSync(tempSqlPath)) fs.unlinkSync(tempSqlPath);
  if (fs.existsSync(psScriptPath)) fs.unlinkSync(psScriptPath);
}
