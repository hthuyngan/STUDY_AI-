/**
 * STUDY_AI — Master VNHSGE Pipeline (Phases 5, 6, 7, 8)
 * 
 * - Full Dataset Dry-Run (Phase 6)
 * - Real Batch Import into StudyAIDb_E2E (Phase 7)
 * - Data Integrity & Idempotency Audit (Phase 8)
 * - Strict DatabaseSafetyGuard preventing any writes to StudyAIDb
 */

import fs from 'fs'
import path from 'path'
import { spawn, type ChildProcess } from 'child_process'
import { assertSafeTestDatabase } from './utils/databaseSafetyGuard'

const TARGET_DB_CONN = 'Server=localhost\\SQLEXPRESS;Database=StudyAIDb_E2E;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True'
const DATASET_DIR = 'e:\\AI_tutor\\temp_vnhsge\\Dataset\\VNHSGE-V\\JSON format'
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
  options: string[]
  correctAnswer: string
  explanation?: string
  imageUrl?: string
  metadataJson?: string
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
            topic: 'Ngữ văn',
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
          const code = `VNHSGE-${subject.slice(0, 4).toUpperCase()}-${rawId.replace(/[^a-zA-Z0-9_-]/g, '_')}`

          const { prompt, options } = parseOptionsFromQuestion(rawPrompt)

          if (!choice) totalMissingAnswer++

          let correctAnswerText = choice
          if (options.length >= 4) {
            const letterIdx = choice.charCodeAt(0) - 65
            if (letterIdx >= 0 && letterIdx < options.length) {
              correctAnswerText = options[letterIdx]
            }
          }

          if (options.length >= 2) {
            totalMcqCount++
            allParsedItems.push({
              code,
              prompt: prompt || rawPrompt,
              type: 'multiple-choice',
              difficulty: 'thong_hieu',
              grade: '12',
              topic: subject,
              options: options.length >= 2 ? options : ['Phương án A', 'Phương án B'],
              correctAnswer: correctAnswerText || (options[0] ?? 'A'),
              explanation,
              imageUrl: imgQ || undefined,
              metadataJson: JSON.stringify({ split, subject, file: fileName, rawId }),
            })
          } else {
            // Irregular MCQ or prompt without standard \nA. markers
            allParsedItems.push({
              code,
              prompt: rawPrompt,
              type: 'short-answer',
              difficulty: 'van_dung',
              grade: '12',
              topic: subject,
              options: [],
              correctAnswer: choice || 'Theo đáp án chính thức',
              explanation,
              imageUrl: imgQ || undefined,
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
      cwd: 'E:\\AI_tutor',
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
    console.log(`Executing Dry-Run across ${allParsedItems.length} items in ${totalBatches} batches...`)

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

      if ((b + 1) % 10 === 0 || b === totalBatches - 1) {
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

    // 5. PHASE 7: REAL IMPORT INTO StudyAIDb_E2E
    console.log('\n=== STEP 5: PHASE 7 — REAL BATCH IMPORT INTO StudyAIDb_E2E ===')
    const importStartTime = Date.now()
    let realImportedTotal = 0
    let realDuplicatesTotal = 0
    let realErrorsTotal = 0
    const batchIds: string[] = []

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

      if ((b + 1) % 10 === 0 || b === totalBatches - 1) {
        console.log(`[Import Progress] Batch ${b + 1}/${totalBatches} (${body.batchId}): Imported ${realImportedTotal} items (Duplicates: ${realDuplicatesTotal}, Errors: ${realErrorsTotal})`)
      }
    }

    const importDuration = ((Date.now() - importStartTime) / 1000).toFixed(1)
    console.log('\n=== REAL IMPORT COMPLETE ===')
    console.log(`Successfully Imported: ${realImportedTotal} questions`)
    console.log(`Duplicates Skipped:   ${realDuplicatesTotal}`)
    console.log(`Errors:               ${realErrorsTotal}`)
    console.log(`Import Duration:      ${importDuration}s`)

    // 6. PHASE 8: IDEMPOTENCY CHECK (RE-IMPORT SAME BATCH)
    console.log('\n=== STEP 6: PHASE 8 — IDEMPOTENCY VERIFICATION ===')
    const sampleBatch = allParsedItems.slice(0, 100)
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
    console.log(`[Idempotency Check] Sent 100 items:`)
    console.log(`  Imported (New):  ${idemBody.importedIds.length} (Expected: 0)`)
    console.log(`  Duplicate count: ${idemBody.duplicateItems} (Expected: 100)`)
    if (idemBody.importedIds.length !== 0 || idemBody.duplicateItems !== 100) {
      throw new Error('Idempotency failure: duplicate items were re-inserted!')
    }
    console.log('>>> IDEMPOTENCY AUDIT PASSED: ZERO DUPLICATE RECORDS INSERTED! <<<')

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

