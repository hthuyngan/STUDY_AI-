import fs from 'fs'
import path from 'path'
import { spawn, execSync, ChildProcess } from 'child_process'

const ROOT_DIR = 'D:\\TN\\temp_vnhsge\\Dataset'
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

async function run() {
  let backendProc: ChildProcess | null = null

  try {
    console.log('=================================================================')
    console.log('   FULL VNHSGE DATASET IMPORT TEST (16,906+ QUESTIONS) ON E2E   ')
    console.log('=================================================================')

    // 1. Gather all files and items
    console.log('\n[1/7] Collecting and parsing all VNHSGE JSON items...')
    const baseJsonDir = path.join(ROOT_DIR, 'VNHSGE-V', 'JSON format')
    const allParsedItems: ParsedItem[] = []
    let totalRawCount = 0
    let totalMcqCount = 0
    let totalEssayCount = 0

    function walk(dir: string, fileList: string[] = []) {
      for (const item of fs.readdirSync(dir)) {
        const full = path.join(dir, item)
        if (fs.statSync(full).isDirectory()) walk(full, fileList)
        else if (item.endsWith('.json')) fileList.push(full)
      }
      return fileList
    }

    const files = walk(baseJsonDir)
    console.log(`Discovered ${files.length} JSON files in VNHSGE-V. Parsing...`)

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
        totalRawCount++

        if (isLit) {
          totalEssayCount++
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

    console.log(`Parsed total raw questions: ${totalRawCount}`)
    console.log(`  MCQ: ${totalMcqCount} | Essay: ${totalEssayCount} | Items in payload: ${allParsedItems.length}`)

    // 2. Start Backend targeting StudyAIDb_E2E
    console.log('\n[2/7] Starting Backend server targeting StudyAIDb_E2E on port ' + BACKEND_PORT + '...')
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
    if (!isUp) throw new Error('Backend failed to start within timeout')
    console.log('Backend is up and responsive at ' + BACKEND_URL)

    // 3. Login
    console.log('\n[3/7] Authenticating as Content Specialist...')
    const loginRes = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'content@studyai.internal', password: 'Content@123456' }),
    })
    if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.status}`)
    const { accessToken } = await loginRes.json()
    console.log('Authenticated successfully.')

    // 4. Batch Import all 17,054 items
    const BATCH_SIZE = 250
    const totalBatches = Math.ceil(allParsedItems.length / BATCH_SIZE)
    console.log(`\n[4/7] Executing Real Batch Import of all ${allParsedItems.length} items across ${totalBatches} batches...`)
    const importStartTime = Date.now()

    let totalImported = 0
    let totalDuplicates = 0
    let totalErrors = 0
    const batchTimes: number[] = []

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
        throw new Error(`Batch ${b + 1} failed: HTTP ${res.status} - ${await res.text()}`)
      }

      const body = await res.json()
      const batchElapsed = Date.now() - batchStart
      batchTimes.push(batchElapsed)

      totalImported += body.importedIds.length
      totalDuplicates += body.duplicateItems
      totalErrors += body.errorItems

      if ((b + 1) % 10 === 0 || b === totalBatches - 1) {
        const rate = (totalImported / ((Date.now() - importStartTime) / 1000)).toFixed(1)
        console.log(`[Batch ${b + 1}/${totalBatches}] Progress: ${totalImported} imported, ${totalDuplicates} dups, ${totalErrors} errs | ${rate} q/s | Batch time: ${batchElapsed}ms`)
      }
    }

    const totalDurationSec = (Date.now() - importStartTime) / 1000
    const avgBatchMs = (batchTimes.reduce((a, b) => a + b, 0) / batchTimes.length).toFixed(0)

    console.log('\n=================================================================')
    console.log('                  FULL IMPORT RESULTS SUMMARY                    ')
    console.log('=================================================================')
    console.log(`Total Input Questions:    ${allParsedItems.length}`)
    console.log(`Successfully Imported:   ${totalImported}`)
    console.log(`Duplicates Skipped:      ${totalDuplicates}`)
    console.log(`Errors:                  ${totalErrors}`)
    console.log(`Total Time:              ${totalDurationSec.toFixed(1)} seconds`)
    console.log(`Throughput:              ${(totalImported / totalDurationSec).toFixed(1)} questions/sec`)
    console.log(`Average Batch Latency:   ${avgBatchMs} ms/batch (Batch size = ${BATCH_SIZE})`)

    // 5. Idempotency Check
    console.log('\n[5/7] Verifying Idempotency with re-submission of batch 1 (250 items)...')
    const sampleBatch = allParsedItems.slice(0, 250)
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
    console.log(`Idempotency response: new=${idemBody.importedIds.length}, duplicates=${idemBody.duplicateItems}, errors=${idemBody.errorItems}`)
    if (idemBody.importedIds.length !== 0 || idemBody.duplicateItems !== 250) {
      throw new Error(`Idempotency check failed! Expected 0 new, 250 duplicates. Got: ${idemBody.importedIds.length} new, ${idemBody.duplicateItems} dups`)
    }
    console.log('>>> IDEMPOTENCY CONFIRMED: 0 new records inserted, 250 duplicates rejected! <<<')

    // 6. API Audit
    console.log('\n[6/7] Auditing API Endpoints against StudyAIDb_E2E...')
    const listRes = await fetch(`${BACKEND_URL}/api/v1/content/questions?pageSize=10`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const listData = await listRes.json()
    console.log(`API List: Total in DB = ${listData.total}`)

    for (const [subKey, subInfo] of Object.entries(SUBJECT_MAP)) {
      const subRes = await fetch(`${BACKEND_URL}/api/v1/content/questions?subjectId=${subInfo.id}&pageSize=1`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const subData = await subRes.json()
      console.log(`  - Subject ${subInfo.name} (${subInfo.id}): ${subData.total} questions`)
    }

    const statsRes = await fetch(`${BACKEND_URL}/api/v1/content/questions/statistics`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const statsData = await statsRes.json()
    console.log('\nAPI Statistics:', {
      totalQuestions: statsData.totalQuestions,
      draftCount: statsData.draftCount,
      approvedCount: statsData.approvedCount,
      publishedCount: statsData.publishedCount,
      bySource: statsData.bySource,
    })

    // 7. SQL Server dual database audit
    console.log('\n[7/7] Verifying SQL Server databases...')
    const sqlAudit = execSync(
      'sqlcmd -S "localhost\\SQLEXPRESS" -E -C -Q "SELECT \'StudyAIDb\' AS DB, COUNT(*) AS Questions FROM StudyAIDb.dbo.content_questions UNION ALL SELECT \'StudyAIDb_E2E\' AS DB, COUNT(*) AS Questions FROM StudyAIDb_E2E.dbo.content_questions;"',
      { encoding: 'utf8' }
    )
    console.log(sqlAudit.trim())

    if (!sqlAudit.includes('StudyAIDb              14')) {
      throw new Error('CRITICAL SAFETY VIOLATION: StudyAIDb row count altered!')
    }
    console.log('>>> SAFETY CONFIRMATION: StudyAIDb is 100% UNTOUCHED at EXACTLY 14 rows. <<<')

    // Print breakdown in E2E
    const sqlBreakdown = execSync(
      'sqlcmd -S "localhost\\SQLEXPRESS" -E -C -Q "SELECT ISNULL(s.Name, q.SubjectId) AS Subject, q.SourceType, q.Status, COUNT(*) AS Cnt FROM StudyAIDb_E2E.dbo.content_questions q LEFT JOIN StudyAIDb_E2E.dbo.subjects s ON q.SubjectId = s.Id GROUP BY ISNULL(s.Name, q.SubjectId), q.SourceType, q.Status ORDER BY Cnt DESC;"',
      { encoding: 'utf8' }
    )
    console.log('\nDatabase Subject Breakdown (StudyAIDb_E2E):')
    console.log(sqlBreakdown.trim())

  } catch (err) {
    console.error('ERROR during full import test:', err)
    process.exitCode = 1
  } finally {
    if (backendProc) {
      console.log('\nShutting down backend process...')
      killProcessTree(backendProc)
    }
  }
}

run()

