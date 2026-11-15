import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const ROOT_DIR = 'D:\\TN\\temp_vnhsge\\Dataset'

function parseOptionsFromQuestion(rawQuestion: string): { prompt: string; options: string[] } {
  const optionRegex = /\n([A-D])\.\s/g
  const matches = [...rawQuestion.matchAll(optionRegex)]
  if (matches.length < 2) return { prompt: rawQuestion.trim(), options: [] }
  const firstOptIndex = matches[0].index!
  return { prompt: rawQuestion.substring(0, firstOptIndex).trim(), options: [] }
}

async function verifyCollision() {
  console.log('=== CROSS-CHECK COLLISION: 14 BASELINE vs 17,054 VNHSGE ITEMS ===\n')

  // 1. Get the 14 prompts and IDs from StudyAIDb
  const sqlOutput = execSync(
    'sqlcmd -S "localhost\\SQLEXPRESS" -E -C -h -1 -W -s "|" -Q "SET NOCOUNT ON; SELECT Id, Prompt FROM StudyAIDb.dbo.content_questions;"',
    { encoding: 'utf8' }
  )

  const baselineItems: Array<{ id: string; prompt: string }> = []
  sqlOutput.split(/\r?\n/).forEach((line) => {
    const parts = line.split('|')
    if (parts.length >= 2) {
      const id = parts[0].trim()
      const prompt = parts.slice(1).join('|').trim()
      if (id) baselineItems.push({ id, prompt })
    }
  })

  console.log(`Found ${baselineItems.length} baseline questions in StudyAIDb:`)
  baselineItems.forEach((b, i) => {
    console.log(`  [${i + 1}] ID: ${b.id} | Prompt: "${b.prompt.slice(0, 50)}..."`)
  })

  const baselinePromptSet = new Set(
    baselineItems.map((b) => b.prompt.replace(/\s+/g, ' ').trim().toLowerCase())
  )

  // 2. Scan all 17,054 items in VNHSGE
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
  let totalScanned = 0
  const collisions: any[] = []

  for (const file of files) {
    const content = JSON.parse(fs.readFileSync(file, 'utf8'))
    if (!Array.isArray(content)) continue
    for (const item of content) {
      totalScanned++
      const rawPrompt = item.Question || item['Câu hỏi'] || ''
      const { prompt } = parseOptionsFromQuestion(rawPrompt)
      const pNorm = (prompt || rawPrompt).replace(/\s+/g, ' ').trim().toLowerCase()
      if (baselinePromptSet.has(pNorm)) {
        collisions.push({ file: path.basename(file), rawPrompt: rawPrompt.slice(0, 60) })
      }
    }
  }

  console.log(`\nScanned ${totalScanned} items across ${files.length} VNHSGE files.`)
  console.log(`Collisions with baseline questions: ${collisions.length}`)
  if (collisions.length === 0) {
    console.log('>>> ZERO COLLISION: None of the 14 baseline questions collide with VNHSGE! <<<')
  } else {
    console.log('Collisions detected:', collisions)
  }
}

verifyCollision().catch(console.error)

