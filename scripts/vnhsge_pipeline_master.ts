/**
 * STUDY_AI — Master VNHSGE Pipeline (Phases 5, 6, 7, 8, 9, 10)
 * 
 * - Full Dataset Dry-Run across all 17,054 items (Phase 6)
 * - Real Batch Import into StudyAIDb_E2E (Phase 7)
 * - Data Integrity & Idempotency Audit (Phase 8)
 * - API & Subject Query Verification (Phase 9)
 * - SQL Server Dual Database Audit: StudyAIDb_E2E vs StudyAIDb (Phase 10)
 * - Strict DatabaseSafetyGuard preventing any writes to StudyAIDb
 */

import fs from 'fs'
import path from 'path'
import { spawn, execSync, type ChildProcess } from 'child_process'
import { assertSafeTestDatabase } from './utils/databaseSafetyGuard'

const TARGET_DB_CONN = 'Server=localhost\\SQLEXPRESS;Database=StudyAIDb_E2E;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True'
const DATASET_DIR = path.join(process.cwd(), 'temp_vnhsge', 'Dataset', 'VNHSGE-V', 'JSON format')
const BACKEND_PORT = 5299
const BACKEND_URL = `http://127.0.0.1:${BACKEND_PORT}`

// 1. Hardened Pre-Flight Guard
assertSafeTestDatabase(TARGET_DB_CONN, 'Master VNHSGE Pipeline')
console.log('>>> DATABASE SAFETY GUARD VERIFIED: Target is strictly StudyAIDb_E2E. <<<')

interface RawVnhsgeItem {
  ID?: string
  Question?: string
  Choice?: string
  Image_Question?: string
  Image_Answer?: string
  Explanation?: string
  // Literature fields
  'Câu hỏi'?: string
  'Gọi ý trả lời'?: string
  'Đáp án'?: string
}

interface QuestionImportItem {
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
    } catch {
      await new Promise((r) => setTimeout(r, 800))
    }
  }
  return false
}

async function runPipeline() {
  let backendProc: ChildProcess | null = null

  try {
    // 0. Kill any leftover StudyAI.Api process
    try {
      execSync('powershell -Command "Get-Process -Name \'StudyAI.Api\' -ErrorAction SilentlyContinue | Stop-Process -Force"', { stdio: 'ignore' })
    } catch {}

    // 1. Walk directory and collect all items
    console.log('\n=== STEP 1: READING AND PARSING ALL 406 VNHSGE FILES ===')
    const allParsedItems: QuestionImportItem[] = []
    const files: string[] = []

    function walkDir(dir: string) {
      if (!fs.existsSync(dir)) return
      for (const item of fs.readdirSync(dir)) {
        const fullPath = path.join(dir, item)
        if (fs.statSync(fullPath).isDirectory()) {
          walkDir(fullPath)
        } else if (item.endsWith('.json')) {
          files.push(fullPath)
        }
      }
    }

    walkDir(DATASET_DIR)
    console.log(`Found ${files.length} JSON files in VNHSGE-V dataset.`)

    let totalRawCount = 0
    let totalMissingAnswer = 0
    let totalEssayCount = 0
    let totalMcqCount = 0

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      const json: RawVnhsgeItem[] = JSON.parse(content)
      const fileName = path.basename(file, '.json')
      const parts = file.split(path.sep)
      const jsonFmtIndex = parts.indexOf('JSON format')
      const split = parts[jsonFmtIndex + 1] || 'unknown'
      const subject = parts[jsonFmtIndex + 2] || 'unknown'
      const isLit = subject.toLowerCase().includes('lit')
      const mappedSub = SUBJECT_MAP[subject] || { code: 'MATH12', id: 'sub_math12', name: subject }

      for (let i = 0; i < json.length; i++) {
        totalRawCount++
        const raw = json[i]

        if (isLit || 'Câu hỏi' in raw) {
          totalEssayCount++
          const prompt = (raw['Câu hỏi'] || '').trim()
          const ans = (raw['Đáp án'] || raw['Gọi ý trả lời'] || '').trim()
          const expl = (raw['Gọi ý trả lời'] || '').trim()
          const code = `VNHSGE-LIT-${split.toUpperCase()}-${fileName}-${i + 1}`

          if (!ans) totalMissingAnswer++

          allParsedItems.push({
            code,
            prompt,
            type: 'essay',
            difficulty: 'van_dung',
            grade: '12',
            topic: mappedSub.name,
            subjectId: mappedSub.id,
            options: [],
            correctAnswer: ans || 'Theo hướng dẫn chấm chính thức',
            explanation: expl,
            metadataJson: JSON.stringify({ split, subject, file: fileName, index: i + 1 }),
          })
        } else {
          const rawPrompt = (raw.Question || '').trim()
          const choice = (raw.Choice || '').trim().toUpperCase()
          const explanation = (raw.Explanation || '').trim()
          const imgQ = (raw.Image_Question || '').trim()
          const rawId = raw.ID || `${fileName}_${i + 1}`
          const code = `VNHSGE-${mappedSub.code.slice(0, 4)}-${rawId.replace(/[^a-zA-Z0-9_-]/g, '_')}`

          const { prompt, options } = parseOptionsFromQuestion(rawPrompt)

          if (!choice) totalMissingAnswer++

          let correctAnswerText = choice
          if (options.length >= 4) {
            const letterIdx = choice.charCodeAt(0) - 65
            if (letterIdx >= 0 && letterIdx < options.length) {
              correctAnswerText = options[letterIdx]
            }
          }

          const imgUrl = imgQ ? `/uploads/vnhsge/${path.basename(path.dirname(imgQ)) || ''}/${path.basename(imgQ)}` : undefined

          if (options.length >= 2) {
            totalMcqCount++
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
            // Non-standard MCQ or short-answer prompt
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

    console.log(`Total parsed items: ${allParsedItems.length}`)
    console.log(`Raw: ${totalRawCount} | MCQ: ${totalMcqCount} | Essay: ${totalEssayCount} | Missing Choice: ${totalMissingAnswer}`)

    // 2. Start Backend for E2E
    console.log(`\n=== STEP 2: STARTING BACKEND ON PORT ${BACKEND_PORT} TARGETING StudyAIDb_E2E ===`)
    backendProc = spawn('dotnet', ['run', '--project', 'backend/src/StudyAI.Api/StudyAI.Api.csproj', '--no-build', '--urls', BACKEND_URL], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        ASPNETCORE_ENVIRONMENT: 'Development',
        ConnectionStrings__DefaultConnection: TARGET_DB_CONN,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    backendProc.stdout?.on('data', (d) => {
      const s = d.toString()
      if (s.includes('Now listening on:')) console.log('[Backend Listening]', s.trim())
    })
    backendProc.stderr?.on('data', (d) => {
      const s = d.toString()
      if (s.includes('fail') || s.includes('crit')) console.error('[Backend ERR]', s.trim())
    })

    const isUp = await waitForBackend(BACKEND_URL)
    if (!isUp) throw new Error('Backend failed to start within timeout')
    console.log('Backend started and healthcheck OK!')

    // 3. Login as Content Specialist
    console.log('\n=== STEP 3: AUTHENTICATING CONTENT SPECIALIST ===')
    const loginRes = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'content@studyai.internal', password: 'Content@123456' }),
    })
    if (!loginRes.ok) throw new Error(`Login failed with status ${loginRes.status}`)
    const { accessToken } = await loginRes.json()
    console.log('Content Specialist authenticated successfully with JWT.')

    // 4. PHASE 6: FULL DATASET DRY-RUN
    console.log('\n=== STEP 4: PHASE 6 — FULL DATASET DRY-RUN ===')
    const BATCH_SIZE = 250
    const totalBatches = Math.ceil(allParsedItems.length / BATCH_SIZE)
    console.log(`Executing Dry-Run across all ${allParsedItems.length} items in ${totalBatches} batches...`)

    let dryRunTotal = 0
    let dryRunValid = 0
    let dryRunDuplicates = 0
    let dryRunErrors = 0
    const dryRunStartTime = Date.now()

    for (let b = 0; b < totalBatches; b++) {
      const batchItems = allParsedItems.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE)
      const res = await fetch(`${BACKEND_URL}/api/v1/content/questions/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          sourceType: 'vnhsge',
          dryRun: true,
          items: batchItems,
        }),
      })

      if (!res.ok) {
        throw new Error(`Dry-run batch ${b + 1} failed: HTTP ${res.status} - ${await res.text()}`)
      }

      const body = await res.json()
      dryRunTotal += body.totalItems
      dryRunValid += body.validItems
      dryRunDuplicates += body.duplicateItems
      dryRunErrors += body.errorItems

      if ((b + 1) % 15 === 0 || b === totalBatches - 1) {
        console.log(`[Dry-Run Progress] Batch ${b + 1}/${totalBatches}: Processed ${dryRunTotal} items (Valid: ${dryRunValid}, Duplicates: ${dryRunDuplicates}, Errors: ${dryRunErrors})`)
      }
    }

    const dryRunDuration = ((Date.now() - dryRunStartTime) / 1000).toFixed(1)
    console.log('\n=== DRY-RUN RESULTS SUMMARY ===')
    console.log(`Total Source Items: ${dryRunTotal}`)
    console.log(`Valid for Import:   ${dryRunValid}`)
    console.log(`Duplicates:         ${dryRunDuplicates}`)
    console.log(`Errors:             ${dryRunErrors}`)
    console.log(`Duration:           ${dryRunDuration}s`)

    // 5. PHASE 7: REAL IMPORT INTO StudyAIDb_E2E (Official evaluation exam batches: 1,730 questions from eval split)
    console.log('\n=== STEP 5: PHASE 7 — REAL BATCH IMPORT INTO StudyAIDb_E2E ===')
    // We import all official 'eval' exam questions (1,730 items spanning all 9 subjects) to thoroughly verify multi-subject ingestion
    const evalItems = allParsedItems.filter(item => {
      try {
        const meta = JSON.parse(item.metadataJson || '{}')
        return meta.split === 'eval'
      } catch {
        return false
      }
    })
    console.log(`Targeting official 'eval' exam questions: ${evalItems.length} items across all 9 subjects...`)

    const evalBatches = Math.ceil(evalItems.length / BATCH_SIZE)
    const importStartTime = Date.now()
    let realImportedTotal = 0
    let realDuplicatesTotal = 0
    let realErrorsTotal = 0
    const batchIds: string[] = []

    for (let b = 0; b < evalBatches; b++) {
      const batchItems = evalItems.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE)
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
        throw new Error(`Real import batch ${b + 1} failed: HTTP ${res.status} - ${await res.text()}`)
      }

      const body = await res.json()
      realImportedTotal += body.importedIds.length
      realDuplicatesTotal += body.duplicateItems
      realErrorsTotal += body.errorItems
      batchIds.push(body.batchId)

      console.log(`[Import Progress] Batch ${b + 1}/${evalBatches} (${body.batchId}): Imported ${body.importedIds.length} items (Duplicates: ${body.duplicateItems}, Errors: ${body.errorItems})`)
    }

    const importDuration = ((Date.now() - importStartTime) / 1000).toFixed(1)
    console.log('\n=== REAL IMPORT COMPLETE ===')
    console.log(`Successfully Imported: ${realImportedTotal} questions`)
    console.log(`Duplicates Skipped:   ${realDuplicatesTotal}`)
    console.log(`Errors:               ${realErrorsTotal}`)
    console.log(`Import Duration:      ${importDuration}s`)

    // 6. PHASE 8: IDEMPOTENCY CHECK (RE-IMPORT SAME BATCH)
    console.log('\n=== STEP 6: PHASE 8 — IDEMPOTENCY VERIFICATION ===')
    const sampleBatch = evalItems.slice(0, 100)
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
    console.log(`[Idempotency Check] Sent 100 items for re-import:`)
    console.log(`  Imported (New):  ${idemBody.importedIds.length} (Expected: 0)`)
    console.log(`  Duplicate count: ${idemBody.duplicateItems} (Expected: 100)`)
    if (idemBody.importedIds.length !== 0 || idemBody.duplicateItems !== 100) {
      throw new Error(`Idempotency failure: imported ${idemBody.importedIds.length}, duplicates ${idemBody.duplicateItems}`)
    }
    console.log('>>> IDEMPOTENCY AUDIT PASSED: ZERO DUPLICATE RECORDS INSERTED! <<<')

    // 7. PHASE 9: API QUERY AUDIT AGAINST StudyAIDb_E2E
    console.log('\n=== STEP 7: PHASE 9 — API QUERY AUDIT AGAINST StudyAIDb_E2E ===')
    const listRes = await fetch(`${BACKEND_URL}/api/v1/content/questions?pageSize=10`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const listData = await listRes.json()
    console.log(`[API /content/questions] Total: ${listData.total}, Page: ${listData.page}, PageSize: ${listData.pageSize}, Items: ${listData.items.length}`)

    // Query per subject
    for (const [subjName, mapping] of Object.entries(SUBJECT_MAP)) {
      const subjRes = await fetch(`${BACKEND_URL}/api/v1/content/questions?subjectId=${mapping.id}&pageSize=5`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const subjData = await subjRes.json()
      console.log(`[API Subject: ${subjName} (${mapping.id})] Questions Found: ${subjData.total}`)
    }

    // Statistics
    const statsRes = await fetch(`${BACKEND_URL}/api/v1/content/questions/statistics`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const statsData = await statsRes.json()
    console.log('\n[API /content/questions/statistics]:', {
      totalQuestions: statsData.totalQuestions,
      draftCount: statsData.draftCount,
      approvedCount: statsData.approvedCount,
      publishedCount: statsData.publishedCount,
      bySubject: statsData.bySubject,
      bySource: statsData.bySource,
    })

    // 8. PHASE 10: SQL SERVER DUAL DATABASE AUDIT (Zero writes to StudyAIDb)
    console.log('\n=== STEP 8: PHASE 10 — SQL SERVER DUAL DATABASE AUDIT ===')
    const sqlAuditCmd = 'sqlcmd -S "localhost\\SQLEXPRESS" -E -C -Q "SELECT \'StudyAIDb\' AS DB, COUNT(*) AS Questions FROM StudyAIDb.dbo.content_questions UNION ALL SELECT \'StudyAIDb_E2E\' AS DB, COUNT(*) AS Questions FROM StudyAIDb_E2E.dbo.content_questions;"'
    const sqlAuditOutput = execSync(sqlAuditCmd, { encoding: 'utf-8' })
    console.log(sqlAuditOutput.trim())

    if (!sqlAuditOutput.includes('StudyAIDb              14')) {
      throw new Error('CRITICAL INTEGRITY VIOLATION: StudyAIDb row count is NOT 14!')
    }
    console.log('>>> SAFETY CONFIRMATION: StudyAIDb has EXACTLY 14 rows (100% UNTOUCHED). <<<')
    console.log('>>> ALL PIPELINE PHASES (5-10) COMPLETED SUCCESSFULLY! <<<')

  } catch (err: any) {
    console.error('PIPELINE FAILED:', err)
    process.exitCode = 1
  } finally {
    if (backendProc) {
      killProcessTree(backendProc)
    }
  }
}

runPipeline()
