import fs from 'fs'
import path from 'path'

const ROOT_DIR = 'D:\\TN\\temp_vnhsge\\Dataset'

interface ParsedItem {
  code: string
  prompt: string
  subjectId: string
  batchIndex: number
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
  return { prompt: rawQuestion.substring(0, firstOptIndex).trim(), options: [] }
}

const baseJsonDir = path.join(ROOT_DIR, 'VNHSGE-V', 'JSON format')
function walk(dir: string, fileList: string[] = []): string[] {
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item)
    if (fs.statSync(full).isDirectory()) walk(full, fileList)
    else if (item.endsWith('.json')) fileList.push(full)
  }
  return fileList
}

const files = walk(baseJsonDir)
const items: ParsedItem[] = []
const BATCH_SIZE = 250

for (const file of files) {
  const parts = file.split(path.sep)
  const jsonIdx = parts.indexOf('JSON format')
  const subject = parts[jsonIdx + 2] || 'unknown'
  const fileName = path.basename(file, '.json')
  const mappedSub = SUBJECT_MAP[subject] || { code: 'GEN12', id: 'sub_general12', name: subject }
  const content = JSON.parse(fs.readFileSync(file, 'utf8'))
  if (!Array.isArray(content)) continue
  const isLit = subject.toLowerCase().includes('lit') || file.includes('Literature')

  for (let i = 0; i < content.length; i++) {
    const raw = content[i]
    let prompt = ''
    let code = ''
    if (isLit) {
      prompt = raw['Câu hỏi'] || ''
      code = `VNHSGE-LIT-${fileName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${i + 1}`
    } else {
      const rawPrompt = raw.Question || ''
      const { prompt: p } = parseOptionsFromQuestion(rawPrompt)
      prompt = p || rawPrompt
      code = `VNHSGE-${mappedSub.code.slice(0, 4)}-${fileName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${i + 1}`
    }
    const batchIndex = Math.floor(items.length / BATCH_SIZE)
    items.push({ code, prompt, subjectId: mappedSub.id, batchIndex })
  }
}

// Check internal duplicates in batches 0..54 (first 13750 items)
const seenPrompts = new Set<string>()
let dupsInFirst55Batches = 0
for (let i = 0; i < 13750; i++) {
  const pNorm = items[i].prompt.replace(/\s+/g, ' ').trim().toLowerCase()
  if (seenPrompts.has(pNorm)) {
    dupsInFirst55Batches++
  } else {
    seenPrompts.add(pNorm)
  }
}
console.log(`Internal duplicate prompts in first 55 batches (13,750 items): ${dupsInFirst55Batches}`)
console.log(`13750 - dups = ${13750 - dupsInFirst55Batches} unique prompts`)

