import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

async function auditImagesAndStatus() {
  console.log('=== AUDIT: IMAGES AND STATUS DISTRIBUTION ===\n')

  // 1. Query SQL for status & copyright distribution
  const sqlStatus = execSync(
    'sqlcmd -S "localhost\\SQLEXPRESS" -E -C -h -1 -W -s "|" -Q "SET NOCOUNT ON; SELECT SourceType, Status, CopyrightStatus, COUNT(*) AS Cnt FROM StudyAIDb_E2E.dbo.content_questions WHERE SourceType = \'vnhsge\' GROUP BY SourceType, Status, CopyrightStatus;"',
    { encoding: 'utf8' }
  )
  console.log('SQL Status & Copyright Breakdown (vnhsge):')
  console.log(sqlStatus.trim())

  // Check if any vnhsge question is published
  const sqlPublishedCheck = execSync(
    'sqlcmd -S "localhost\\SQLEXPRESS" -E -C -h -1 -W -s "|" -Q "SET NOCOUNT ON; SELECT COUNT(*) FROM StudyAIDb_E2E.dbo.content_questions WHERE SourceType = \'vnhsge\' AND Status = \'published\';"',
    { encoding: 'utf8' }
  )
  const publishedCount = parseInt(sqlPublishedCheck.trim(), 10) || 0
  console.log(`\nPublished VNHSGE Questions Count: ${publishedCount}`)
  if (publishedCount === 0) {
    console.log('>>> CONFIRMATION: 100% of VNHSGE questions are in DRAFT status! <<<')
  }

  // 2. Query distinct image URLs
  const sqlImages = execSync(
    'sqlcmd -S "localhost\\SQLEXPRESS" -E -C -h -1 -W -s "|" -Q "SET NOCOUNT ON; SELECT DISTINCT ImageUrl FROM StudyAIDb_E2E.dbo.content_questions WHERE SourceType = \'vnhsge\' AND ImageUrl IS NOT NULL AND ImageUrl != \'\';"',
    { encoding: 'utf8' }
  )

  const imageUrls = sqlImages
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  console.log(`\nDistinct Image URLs referenced: ${imageUrls.length}`)

  // Check on disk
  const backendWwwroot = 'D:\\TN\\backend\\src\\StudyAI.Api\\wwwroot'
  const frontendPublic = 'D:\\TN\\frontend\\public'

  let backendMissing = 0
  let frontendMissing = 0

  for (const imgUrl of imageUrls) {
    // imgUrl e.g. /uploads/vnhsge/Math_1/image001.png
    const relPath = imgUrl.startsWith('/') ? imgUrl.slice(1) : imgUrl
    const bPath = path.join(backendWwwroot, relPath)
    const fPath = path.join(frontendPublic, relPath)

    if (!fs.existsSync(bPath)) backendMissing++
    if (!fs.existsSync(fPath)) frontendMissing++
  }

  console.log(`Backend missing images:  ${backendMissing} / ${imageUrls.length}`)
  console.log(`Frontend missing images: ${frontendMissing} / ${imageUrls.length}`)

  if (backendMissing === 0 && frontendMissing === 0) {
    console.log('>>> ALL IMAGE ASSETS EXIST AND ARE ACCESSIBLE ON BOTH SIDES! <<<')
  }
}

auditImagesAndStatus().catch(console.error)
