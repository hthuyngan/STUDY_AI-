import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const ROOT_DIR = 'D:\\TN\\temp_vnhsge\\Dataset'

interface ParsedItem {
  code: string
  prompt: string
  subjectId: string
  batchIndex: number
  itemIndex: number
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
  return { prompt, options: [] }
}

async function reconcile() {
  console.log('=== VNHSGE RECONCILIATION & CHECKPOINT AUDIT ===\n')

  // 1. Parse items in deterministic order
  const baseJsonDir = path.join(ROOT_DIR, 'VNHSGE-V', 'JSON format')
  function walk(dir: string, fileList: string[] = []) {
    for (const item of fs.readdirSync(dir)) {
      const full = path.join(dir, item)
      if (fs.statSync(full).isDirectory()) walk(full, fileList)
      else if (item.endsWith('.json')) fileList.push(full)
    }
    return fileList
  }

  const files = walk(baseJsonDir)
  const allParsedItems: ParsedItem[] = []
  const BATCH_SIZE = 250

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
      const rawId = raw.ID || `${fileName}_${i + 1}`
      let prompt = ''
      let code = ''

      if (isLit) {
        prompt = raw['Câu hỏi'] || ''
        code = `VNHSGE-LIT-${fileName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${i + 1}`
      } else {
        const rawPrompt = raw.Question || ''
        const { prompt: parsedPrompt } = parseOptionsFromQuestion(rawPrompt)
        prompt = parsedPrompt || rawPrompt
        code = `VNHSGE-${mappedSub.code.slice(0, 4)}-${fileName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${i + 1}`
      }

      const itemIndex = allParsedItems.length
      const batchIndex = Math.floor(itemIndex / BATCH_SIZE)

      allParsedItems.push({
        code,
        prompt,
        subjectId: mappedSub.id,
        batchIndex,
        itemIndex,
      })
    }
  }

  console.log(`Total deterministic items parsed: ${allParsedItems.length}`)
  const totalBatches = Math.ceil(allParsedItems.length / BATCH_SIZE)
  console.log(`Total batches (size ${BATCH_SIZE}): ${totalBatches}`)

  // 2. Fetch all existing codes and prompts from StudyAIDb_E2E
  console.log('\nFetching existing questions from StudyAIDb_E2E...')
  const rawCodes = execSync(
    'sqlcmd -S "localhost\\SQLEXPRESS" -E -C -h -1 -W -s "|" -Q "SET NOCOUNT ON; SELECT Code FROM StudyAIDb_E2E.dbo.content_questions WHERE SourceType = \'vnhsge\';"',
    { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 }
  )

  const existingCodeSet = new Set<string>()
  rawCodes.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim()
    if (trimmed) existingCodeSet.add(trimmed.toLowerCase())
  })
  console.log(`Found ${existingCodeSet.size} distinct vnhsge codes in StudyAIDb_E2E.`)

  // 3. Batch analysis
  const batchStats: Array<{
    batchIndex: number
    batchNumber: number
    totalInBatch: number
    alreadyInDb: number
    missingInDb: number
  }> = []

  let lastCompletedBatchIndex = -1
  let firstIncompleteBatchIndex = -1

  for (let b = 0; b < totalBatches; b++) {
    const items = allParsedItems.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE)
    let inDb = 0
    let missing = 0

    for (const it of items) {
      if (existingCodeSet.has(it.code.toLowerCase())) {
        inDb++
      } else {
        missing++
      }
    }

    batchStats.push({
      batchIndex: b,
      batchNumber: b + 1,
      totalInBatch: items.length,
      alreadyInDb: inDb,
      missingInDb: missing,
    })

    if (missing === 0) {
      lastCompletedBatchIndex = b
    } else if (firstIncompleteBatchIndex === -1) {
      firstIncompleteBatchIndex = b
    }
  }

  console.log('\n--- Batch Completion Summary ---')
  console.log(`Last fully complete batch: Batch ${lastCompletedBatchIndex + 1} (index ${lastCompletedBatchIndex})`)
  console.log(`First incomplete batch:    Batch ${firstIncompleteBatchIndex + 1} (index ${firstIncompleteBatchIndex})`)

  let totalAlreadyInDb = 0
  let totalMissing = 0
  batchStats.forEach((bs) => {
    totalAlreadyInDb += bs.alreadyInDb
    totalMissing += bs.missingInDb
    if (bs.missingInDb > 0) {
      console.log(`  Batch ${bs.batchNumber} (index ${bs.batchIndex}): inDb=${bs.alreadyInDb}/${bs.totalInBatch}, missing=${bs.missingInDb}`)
    }
  })

  console.log(`\nReconciliation Summary:`)
  console.log(`  Total items in source:      ${allParsedItems.length}`)
  console.log(`  Items already in E2E DB:    ${totalAlreadyInDb}`)
  console.log(`  Items remaining to import:  ${totalMissing}`)

  // Write checkpoint file
  const checkpoint = {
    totalSourceItems: allParsedItems.length,
    batchSize: BATCH_SIZE,
    totalBatches,
    lastCompletedBatchIndex,
    firstIncompleteBatchIndex,
    itemsAlreadyInDb: totalAlreadyInDb,
    itemsRemaining: totalMissing,
    timestamp: new Date().toISOString(),
  }
  fs.writeFileSync('scripts/vnhsge_checkpoint.json', JSON.stringify(checkpoint, null, 2))
  console.log('\nCheckpoint written to scripts/vnhsge_checkpoint.json')
}

reconcile().catch(console.error)

