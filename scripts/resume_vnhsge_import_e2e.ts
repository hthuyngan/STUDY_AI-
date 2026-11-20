import fs from 'fs'
import path from 'path'
import { spawn, execSync, ChildProcess } from 'child_process'

const ROOT_DIR = 'D:\\TN\\temp_vnhsge\\Dataset'
const CHECKPOINT_FILE = path.join(__dirname, 'vnhsge_checkpoint.json')
const BACKEND_PORT = 5025
const BACKEND_URL = `http://localhost:${BACKEND_PORT}`
const TARGET_DB_CONN = 'Server=localhost\\SQLEXPRESS;Database=StudyAIDb_E2E;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true'

interface ParsedItem {
  code: string
  prompt: string
  type: string
  difficulty: string
  grade: string
  topic: string
  subjectId: string
  options: string[]
  correctAnswer: string
  explanation?: string
  imageUrl?: string
  metadataJson?: string
}

const SUBJECT_MAP: Record<string, { code: string; id: string; name: string }> = {
  Mathematics: { code: 'MATH12', id: 'sub_math12', name: 'Toán 12' },
  Physics: { code: 'PHYS12', id: 'sub_phys12', name: 'Vật lý 12' },
  Chemistry: { code: 'CHEM12', id: 'sub_chem12', name: 'Hóa học 12' },
  Biology: { code: 'BIO12', id: 'sub_bio12', name: 'Sinh học 12' },
  Literature: { code: 'LIT12', id: 'sub_lit12', name: 'Ngữ văn 12' },
  English: { code: 'ENG12', id: 'sub_eng12', name: 'Tiếng Anh 12' },
  History: { code: 'HIST12', id: 'sub_hist12', name: 'Lịch sử 12' },
  Geography: { code: 'GEO12', id: 'sub_geo12', name: 'Địa lý 12' },
  CivicEducation: { code: 'CIVIC12', id: 'sub_civic12', name: 'Giáo dục kinh tế và pháp luật 12' },
}

function parseOptionsFromQuestion(rawQuestion: string): { prompt: string; options: string[] } {
  const optionRegex = /\n([A-D])\.\s/g
  const matches = [...rawQuestion.matchAll(optionRegex)]

  if (matches.length < 2) {
    return { prompt: rawQuestion.trim(), options: [] }
  }

  const firstOptIndex = matches[0].index!
  const prompt = rawQuestion.substring(0, firstOptIndex).trim()
  const options: string[] = []

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index! + matches[i][0].length
    const end = i < matches.length - 1 ? matches[i + 1].index! : rawQuestion.length
    options.push(rawQuestion.substring(start, end).trim())
  }

  return { prompt, options }
}

function killProcessTree(proc: ChildProcess | null) {
  if (!proc || !proc.pid) return
  try {
    spawn('taskkill', ['/pid', proc.pid.toString(), '/T', '/F'])
  } catch {}
}

async function waitForBackend(url: string, timeoutMs = 30000): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${url}/health`)
      if (res.ok) return true
    } catch {}
    await new Promise((r) => setTimeout(r, 500))
  }
  return false
}

async function resumeImport() {
  let backendProc: ChildProcess | null = null

  try {
    console.log('=================================================================')
    console.log('    VNHSGE RESILIENT BATCH IMPORT RESUMPTION ON StudyAIDb_E2E    ')
    console.log('=================================================================')

    // 1. Parse items in exact deterministic order
    console.log('\n[1/8] Parsing all 406 VNHSGE JSON files deterministically...')
    const baseJsonDir = path.join(ROOT_DIR, 'VNHSGE-V', 'JSON format')
    const allParsedItems: ParsedItem[] = []

    function walk(dir: string, fileList: string[] = []) {
      for (const item of fs.readdirSync(dir)) {
        const full = path.join(dir, item)
        if (fs.statSync(full).isDirectory()) walk(full, fileList)
        else if (item.endsWith('.json')) fileList.push(full)
      }
      return fileList
    }

    const files = walk(baseJsonDir)

    for (const file of files) {
      const parts = file.split(path.sep)
      const jsonIdx = parts.indexOf('JSON format')
      const split = parts[jsonIdx + 1] || 'unknown'
      const subject = parts[jsonIdx + 2] || 'unknown'
      const fileName = path.basename(file, '.json')
      const mappedSub = SUBJECT_MAP[subject] || { code: 'GEN12', id: 'sub_general12', name: subject }

      const content = JSON.parse(fs.readFileSync(file, 'utf8'))
      if (!Array.isArray(content)) continue

      const isLit = subject.toLowerCase().includes('lit') || file.includes('Literature')

      for (let i = 0; i < content.length; i++) {
        const raw = content[i]

        if (isLit) {
          const prompt = raw['Câu hỏi'] || ''
          const answer = raw['Đáp án'] || raw['Gọi ý trả lời'] || ''
          const rawId = raw.ID || `${fileName}_${i + 1}`
          const code = `VNHSGE-LIT-${fileName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${i + 1}`

          allParsedItems.push({
            code,
            prompt,
            type: 'essay',
            difficulty: 'van_dung',
            grade: '12',
            topic: mappedSub.name,
            subjectId: mappedSub.id,
            options: [],
            correctAnswer: answer,
            explanation: answer,
            metadataJson: JSON.stringify({ split, subject, file: fileName, rawId, type: 'essay' }),
          })
        } else {
          const rawPrompt = raw.Question || ''
          const choice = (raw.Choice || '').trim().toUpperCase()
          const explanation = (raw.Explanation || '').trim()
          const imgQ = (raw.Image_Question || '').trim()
          const rawId = raw.ID || `${fileName}_${i + 1}`
          const code = `VNHSGE-${mappedSub.code.slice(0, 4)}-${fileName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${i + 1}`

          const { prompt, options } = parseOptionsFromQuestion(rawPrompt)

          let correctAnswerText = choice
          if (options.length >= 4) {
            const letterIdx = choice.charCodeAt(0) - 65
            if (letterIdx >= 0 && letterIdx < options.length) {
              correctAnswerText = options[letterIdx]
            }
          }

          const imgUrl = imgQ ? `/uploads/vnhsge/${path.basename(path.dirname(imgQ)) || ''}/${path.basename(imgQ)}` : undefined

          if (options.length >= 2) {
            allParsedItems.push({
              code,
              prompt: prompt || rawPrompt,
              type: 'multiple-choice',
              difficulty: 'thong_hieu',
              grade: '12',
              topic: mappedSub.name,
              subjectId: mappedSub.id,
              options: options.length >= 2 ? options : ['Phương án A', 'Phương án B'],
              correctAnswer: correctAnswerText || (options[0] ?? 'A'),
              explanation,
              imageUrl: imgUrl,
              metadataJson: JSON.stringify({ split, subject, file: fileName, rawId }),
            })
          } else {
            allParsedItems.push({
              code,
              prompt: rawPrompt,
              type: 'short-answer',
              difficulty: 'van_dung',
              grade: '12',
              topic: mappedSub.name,
              subjectId: mappedSub.id,
              options: [],
              correctAnswer: choice || 'Theo đáp án chính thức',
              explanation,
              imageUrl: imgUrl,
              metadataJson: JSON.stringify({ split, subject, file: fileName, rawId, note: 'non_standard_mcq' }),
            })
          }
        }
      }
    }

    const BATCH_SIZE = 250
    const totalBatches = Math.ceil(allParsedItems.length / BATCH_SIZE)
    console.log(`Parsed total: ${allParsedItems.length} items (${totalBatches} batches of size ${BATCH_SIZE})`)

    // 2. Query StudyAIDb_E2E for existing codes & determine starting batch
    console.log('\n[2/8] Checking existing questions in StudyAIDb_E2E...')
    const rawExistingCodes = execSync(
      'sqlcmd -S "localhost\\SQLEXPRESS" -E -C -h -1 -W -s "|" -Q "SET NOCOUNT ON; SELECT Code FROM StudyAIDb_E2E.dbo.content_questions WHERE SourceType = \'vnhsge\';"',
      { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 }
    )

    const existingCodeSet = new Set<string>()
    rawExistingCodes.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim()
      if (trimmed) existingCodeSet.add(trimmed.toLowerCase())
    })
    console.log(`Currently ${existingCodeSet.size} VNHSGE questions exist in StudyAIDb_E2E.`)

    // Determine first batch that has missing items
    let startBatchIndex = 0
    for (let b = 0; b < totalBatches; b++) {
      const batchItems = allParsedItems.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE)
      const hasMissing = batchItems.some((it) => !existingCodeSet.has(it.code.toLowerCase()))
      if (hasMissing) {
        startBatchIndex = b
        break
      }
    }

    console.log(`\n>>> RESUMPTION DETERMINATION <<<`)
    console.log(`Batches 1 to ${startBatchIndex} (0 to ${startBatchIndex - 1}) already completed.`)
    console.log(`Resuming from Batch ${startBatchIndex + 1} (index ${startBatchIndex}) through Batch ${totalBatches}...`)

    // 3. Start Backend
    console.log('\n[3/8] Starting backend API on port ' + BACKEND_PORT + '...')
    backendProc = spawn('dotnet', ['run', '--project', 'backend/src/StudyAI.Api/StudyAI.Api.csproj', '--no-build', '--urls', BACKEND_URL], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        ASPNETCORE_ENVIRONMENT: 'Development',
        ConnectionStrings__DefaultConnection: TARGET_DB_CONN,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    const isUp = await waitForBackend(BACKEND_URL)
    if (!isUp) throw new Error('Backend failed to start')
    console.log('Backend listening at ' + BACKEND_URL)

    // 4. Authenticate
    console.log('\n[4/8] Authenticating Content Specialist...')
    const loginRes = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'content@studyai.internal', password: 'Content@123456' }),
    })
    if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.status}`)
    const { accessToken } = await loginRes.json()
    console.log('JWT Token acquired.')

    // 5. Execute Remaining Batches with per-batch checkpointing
    console.log(`\n[5/8] Executing batches ${startBatchIndex + 1} to ${totalBatches}...`)
    const startTime = Date.now()
    let newlyImported = 0
    let newlyDuplicates = 0
    let newlyErrors = 0

    for (let b = startBatchIndex; b < totalBatches; b++) {
      const batchStart = Date.now()
      const batchItems = allParsedItems.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE)

      const res = await fetch(`${BACKEND_URL}/api/v1/content/questions/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          sourceType: 'vnhsge',
          dryRun: false,
          items: batchItems,
        }),
      })

      if (!res.ok) {
        throw new Error(`Batch ${b + 1} failed: HTTP ${res.status} - ${await res.text()}`)
      }

      const body = await res.json()
      const batchElapsed = Date.now() - batchStart

      newlyImported += body.importedIds.length
      newlyDuplicates += body.duplicateItems
      newlyErrors += body.errorItems

      // Update checkpoint after EVERY single batch
      const checkpoint = {
        lastCompletedBatchIndex: b,
        lastCompletedBatchNumber: b + 1,
        totalBatches,
        batchSize: BATCH_SIZE,
        lastBatchId: body.batchId,
        sessionNewImported: newlyImported,
        sessionNewDuplicates: newlyDuplicates,
        sessionNewErrors: newlyErrors,
        updatedAt: new Date().toISOString(),
      }
      fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2))

      console.log(`[Batch ${b + 1}/${totalBatches}] (${body.batchId}) +${body.importedIds.length} new, ${body.duplicateItems} dups, ${body.errorItems} errs | ${batchElapsed}ms | Checkpoint saved`)
    }

    const durationSec = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log('\n=================================================================')
    console.log(`ALL BATCHES COMPLETE in ${durationSec}s!`)
    console.log(`Session Newly Imported:  ${newlyImported}`)
    console.log(`Session Duplicates:      ${newlyDuplicates}`)
    console.log(`Session Errors:          ${newlyErrors}`)
    console.log('=================================================================')

    // 6. Idempotency Verification
    console.log('\n[6/8] Verifying Idempotency with re-submission of batch 56 (250 items)...')
    const sampleBatch = allParsedItems.slice(55 * BATCH_SIZE, 56 * BATCH_SIZE)
    const idemRes = await fetch(`${BACKEND_URL}/api/v1/content/questions/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        sourceType: 'vnhsge',
        dryRun: false,
        items: sampleBatch,
      }),
    })
    const idemBody = await idemRes.json()
    console.log(`Idempotency Result: new=${idemBody.importedIds.length}, duplicates=${idemBody.duplicateItems}, errors=${idemBody.errorItems}`)
    if (idemBody.importedIds.length !== 0) {
      throw new Error(`Idempotency check failed: ${idemBody.importedIds.length} duplicate items were re-inserted!`)
    }
    console.log('>>> IDEMPOTENCY PASS: 0 new items inserted, all duplicates correctly detected! <<<')

    // 7. API and Statistics Audit
    console.log('\n[7/8] Auditing API and Subject Distribution...')
    const statsRes = await fetch(`${BACKEND_URL}/api/v1/content/questions/statistics`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const statsData = await statsRes.json()
    console.log('API Statistics Endpoint Response:')
    console.log(`  Total Questions:   ${statsData.totalQuestions}`)
    console.log(`  Draft Count:       ${statsData.draftCount}`)
    console.log(`  Approved Count:    ${statsData.approvedCount}`)
    console.log(`  Published Count:   ${statsData.publishedCount}`)
    console.log('  By Subject:', JSON.stringify(statsData.bySubject, null, 2))
    console.log('  By Source:', JSON.stringify(statsData.bySource, null, 2))

    // 8. SQL Server Verification & Safety Confirmation
    console.log('\n[8/8] SQL Server Dual Database Audit & Image Verification...')
    const sqlAudit = execSync(
      'sqlcmd -S "localhost\\SQLEXPRESS" -E -C -Q "SELECT \'StudyAIDb\' AS DB, COUNT(*) AS Questions FROM StudyAIDb.dbo.content_questions UNION ALL SELECT \'StudyAIDb_E2E\' AS DB, COUNT(*) AS Questions FROM StudyAIDb_E2E.dbo.content_questions;"',
      { encoding: 'utf8' }
    )
    console.log(sqlAudit.trim())

    if (!sqlAudit.includes('StudyAIDb              14')) {
      throw new Error('CRITICAL INTEGRITY VIOLATION: StudyAIDb row count was altered!')
    }
    console.log('>>> PRODUCTION SAFETY CONFIRMED: StudyAIDb is 100% UNTOUCHED at EXACTLY 14 rows. <<<')

    // SQL Detailed subject query
    const sqlSubjectSummary = execSync(
      'sqlcmd -S "localhost\\SQLEXPRESS" -E -C -Q "SELECT ISNULL(s.Name, q.SubjectId) AS SubjectName, q.SourceType, q.Status, COUNT(*) AS Cnt FROM StudyAIDb_E2E.dbo.content_questions q LEFT JOIN StudyAIDb_E2E.dbo.content_subjects s ON q.SubjectId = s.Id GROUP BY ISNULL(s.Name, q.SubjectId), q.SourceType, q.Status ORDER BY Cnt DESC;"',
      { encoding: 'utf8' }
    )
    console.log('\nStudyAIDb_E2E Subject Breakdown:')
    console.log(sqlSubjectSummary.trim())

    // Image reference audit
    const sqlImages = execSync(
      'sqlcmd -S "localhost\\SQLEXPRESS" -E -C -Q "SELECT COUNT(*) AS ImageQuestions FROM StudyAIDb_E2E.dbo.content_questions WHERE ImageUrl IS NOT NULL AND ImageUrl != \'\';"',
      { encoding: 'utf8' }
    )
    console.log('\nImage Questions in DB:', sqlImages.trim())

    console.log('\n>>> ALL IMPORT AND AUDIT CHECKS COMPLETED SUCCESSFULLY! <<<')

  } catch (err) {
    console.error('ERROR in resume import:', err)
    process.exitCode = 1
  } finally {
    if (backendProc) {
      console.log('\nShutting down backend server...')
      killProcessTree(backendProc)
    }
  }
}

resumeImport()

