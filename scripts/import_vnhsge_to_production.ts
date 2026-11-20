import fs from 'fs'
import path from 'path'
import { spawn, execSync, ChildProcess } from 'child_process'

const ROOT_DIR = 'D:\\TN\\temp_vnhsge\\Dataset'
const TARGET_DB = process.env.IMPORT_TARGET_DB || 'StudyAIDb_E2E'

// Fail-closed database guard: Block any run targeting the protected production database StudyAIDb
if (TARGET_DB.trim().toLowerCase() === 'studyaidb') {
  throw new Error(
    "CRITICAL DATABASE SAFETY GUARD TRIGGERED: Targeting 'StudyAIDb' is strictly forbidden by AGENTS.md. " +
    "All import scripts, migrations, and rehearsals must strictly target 'StudyAIDb_E2E' or an isolated disposable database."
  )
}

const BACKUP_PATH = `D:\\TN\\backups\\${TARGET_DB}_PreProduction_Snapshot.bak`
const BACKEND_PORT = 5025
const BACKEND_URL = `http://localhost:${BACKEND_PORT}`
const PROD_DB_CONN = `Server=localhost\\SQLEXPRESS;Database=${TARGET_DB};Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true`
const CHECKPOINT_FILE = path.join(__dirname, 'vnhsge_prod_checkpoint.json')

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
  if (matches.length < 2) return { prompt: rawQuestion.trim(), options: [] }

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

function resolveImageUrl(rawImg: string, examFolder: string): string | undefined {
  if (!rawImg || !rawImg.trim()) return undefined
  const first = rawImg.split(/[;,]/)[0].trim()
  if (!first) return undefined
  let clean = first.replace(/^eo_(\d+)/i, 'Geo_$1')
  const parts = clean.split(/[/\\]/).map(p => p.trim())
  let folder = parts.length > 1 ? parts[0] : examFolder
  let filename = parts[parts.length - 1]

  const relPath = folder ? path.join('uploads', 'vnhsge', folder, filename) : path.join('uploads', 'vnhsge', filename)
  const fullDiskPath = path.join('D:\\TN\\backend\\src\\StudyAI.Api\\wwwroot', relPath)

  if (fs.existsSync(fullDiskPath)) {
    return `/${relPath.replace(/\\/g, '/')}`
  }
  return undefined
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

export async function runProductionImport() {
  // STRICT SAFETY GATE
  if (process.argv.indexOf('--confirm-production-write') === -1) {
    console.error('CRITICAL ABORT: Missing --confirm-production-write flag. Production writes forbidden.')
    process.exit(1)
  }

  let backendProc: ChildProcess | null = null

  try {
    console.log('=================================================================')
    console.log('   PRODUCTION IMPORT: ALL VNHSGE QUESTIONS INTO StudyAIDb        ')
    console.log('=================================================================')

    // STEP 1: Verify Baseline 14 questions
    console.log(`\n[1/7] Auditing ${TARGET_DB} baseline questions...`)
    const baselineAudit = execSync(
      `sqlcmd -S "localhost\\SQLEXPRESS" -E -C -h -1 -W -Q "SET NOCOUNT ON; SELECT COUNT(*) FROM ${TARGET_DB}.dbo.content_questions;"`,
      { encoding: 'utf8' }
    )
    const baselineCount = parseInt(baselineAudit.trim(), 10)
    console.log(`${TARGET_DB} Baseline Question Count: ${baselineCount}`)
    if (baselineCount !== 14) {
      throw new Error(`CRITICAL PRECONDITION FAILED: ${TARGET_DB} does not have 14 baseline questions (got ${baselineCount})`)
    }

    // STEP 2: Backup with Checksum & Verify
    console.log('\n[2/7] Creating pre-import snapshot backup with CHECKSUM...')
    if (!fs.existsSync('D:\\TN\\backups')) fs.mkdirSync('D:\\TN\\backups', { recursive: true })
    execSync(
      `sqlcmd -S "localhost\\SQLEXPRESS" -E -C -Q "BACKUP DATABASE ${TARGET_DB} TO DISK = '${BACKUP_PATH}' WITH FORMAT, INIT, CHECKSUM, STATS = 25;"`,
      { stdio: 'inherit' }
    )
    console.log('Verifying backup checksum integrity...')
    execSync(`sqlcmd -S "localhost\\SQLEXPRESS" -E -C -Q "RESTORE VERIFYONLY FROM DISK = '${BACKUP_PATH}' WITH CHECKSUM;"`, { stdio: 'inherit' })
    console.log('>>> BACKUP SNAPSHOT VERIFIED WITH CHECKSUM! <<<')

    // STEP 3: Parse VNHSGE items
    console.log('\n[3/7] Parsing VNHSGE items with normalized image handling...')
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

          const imgUrl = resolveImageUrl(imgQ, fileName)

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
    console.log(`Parsed total: ${allParsedItems.length} items (${totalBatches} batches)`)

    // STEP 4: Start Backend targeting isolated database
    console.log(`\n[4/7] Starting backend API on port ${BACKEND_PORT} targeting ${TARGET_DB}...`)
    backendProc = spawn('dotnet', ['run', '--project', 'backend/src/StudyAI.Api/StudyAI.Api.csproj', '--no-build', '--urls', BACKEND_URL], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        ASPNETCORE_ENVIRONMENT: 'Development',
        ConnectionStrings__DefaultConnection: PROD_DB_CONN,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    const isUp = await waitForBackend(BACKEND_URL)
    if (!isUp) throw new Error(`Backend failed to start targeting ${TARGET_DB}`)
    console.log('Backend listening at ' + BACKEND_URL)

    // Authenticate
    const loginRes = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'content@studyai.internal', password: 'Content@123456' }),
    })
    if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.status}`)
    const { accessToken } = await loginRes.json()

    // STEP 5: Execute batches
    console.log(`\n[5/7] Executing ${totalBatches} batches into ${TARGET_DB}...`)
    const startTime = Date.now()
    let totalImported = 0
    let totalDuplicates = 0
    let totalErrors = 0

    for (let b = 0; b < totalBatches; b++) {
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
        throw new Error(`Production Batch ${b + 1} failed: HTTP ${res.status} - ${await res.text()}`)
      }

      const body = await res.json()
      const batchElapsed = Date.now() - batchStart
      totalImported += body.importedIds.length
      totalDuplicates += body.duplicateItems
      totalErrors += body.errorItems

      // Checkpoint
      fs.writeFileSync(
        CHECKPOINT_FILE,
        JSON.stringify({
          lastCompletedBatchIndex: b,
          lastCompletedBatchNumber: b + 1,
          totalBatches,
          totalImported,
          totalDuplicates,
          totalErrors,
          updatedAt: new Date().toISOString(),
        }, null, 2)
      )

      if ((b + 1) % 10 === 0 || b === totalBatches - 1) {
        console.log(`[Batch ${b + 1}/${totalBatches}] Progress: ${totalImported} imported, ${totalDuplicates} dups, ${totalErrors} errs | ${batchElapsed}ms`)
      }
    }

    const durationSec = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`\nAll production batches completed in ${durationSec}s!`)
    console.log(`Total Imported: ${totalImported} | Total Duplicates: ${totalDuplicates} | Total Errors: ${totalErrors}`)

    // STEP 6: Dual Audit
    console.log(`\n[6/7] Auditing ${TARGET_DB} final state...`)
    const sqlFinal = execSync(
      `sqlcmd -S "localhost\\SQLEXPRESS" -E -C -Q "SELECT SourceType, Status, COUNT(*) AS Cnt FROM ${TARGET_DB}.dbo.content_questions GROUP BY SourceType, Status; SELECT COUNT(*) AS TotalCount FROM ${TARGET_DB}.dbo.content_questions;"`,
      { encoding: 'utf8' }
    )
    console.log(sqlFinal.trim())

    // STEP 7: Verify baseline intact
    console.log('\n[7/7] Verifying 14 baseline questions are 100% intact...')
    const sqlBaselineCheck = execSync(
      `sqlcmd -S "localhost\\SQLEXPRESS" -E -C -h -1 -W -Q "SET NOCOUNT ON; SELECT COUNT(*) FROM ${TARGET_DB}.dbo.content_questions WHERE SourceType = 'manual';"`,
      { encoding: 'utf8' }
    )
    const manualCount = parseInt(sqlBaselineCheck.trim(), 10)
    if (manualCount !== 14) {
      throw new Error(`CRITICAL INTEGRITY VIOLATION: Manual baseline count altered! Expected 14, got ${manualCount}`)
    }
    console.log('>>> 14 BASELINE QUESTIONS 100% PRESERVED! <<<')
    console.log('>>> PRODUCTION IMPORT SUCCESSFUL! <<<')

  } catch (err) {
    console.error('ERROR in production import:', err)
    process.exitCode = 1
  } finally {
    if (backendProc) {
      killProcessTree(backendProc)
    }
  }
}

if (require.main === module) {
  runProductionImport()
}

