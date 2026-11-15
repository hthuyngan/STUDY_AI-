import fs from 'fs'
import path from 'path'

const ROOT_DIR = 'D:\\TN\\temp_vnhsge\\Dataset\\VNHSGE-V\\JSON format'

function walk(dir: string, list: string[] = []) {
  for (const item of fs.readdirSync(dir)) {
    const p = path.join(dir, item)
    if (fs.statSync(p).isDirectory()) walk(p, list)
    else if (item.endsWith('.json')) list.push(p)
  }
  return list
}

const files = walk(ROOT_DIR)
const seen = new Map<string, { file: string; id: string; subject: string }>()
const dups: Array<{ prompt: string; subject: string; file1: string; id1: string; file2: string; id2: string }> = []

for (const file of files) {
  const parts = file.split(path.sep)
  const jsonIdx = parts.indexOf('JSON format')
  const subject = parts[jsonIdx + 2] || 'Unknown'
  const content = JSON.parse(fs.readFileSync(file, 'utf8'))

  for (const item of content) {
    const rawPrompt = item.Question || item['Câu hỏi'] || ''
    const norm = rawPrompt.replace(/\s+/g, ' ').trim().toLowerCase()
    if (!norm) continue

    if (seen.has(norm)) {
      const prev = seen.get(norm)!
      dups.push({
        prompt: rawPrompt.slice(0, 100),
        subject,
        file1: path.basename(prev.file),
        id1: prev.id,
        file2: path.basename(file),
        id2: item.ID || '',
      })
    } else {
      seen.set(norm, { file, id: item.ID || '', subject })
    }
  }
}

console.log('Total files checked:', files.length)
console.log('Unique prompts:', seen.size)
console.log('Duplicate prompts found:', dups.length)

// Breakdown by subject
const bySubject: Record<string, number> = {}
for (const d of dups) {
  bySubject[d.subject] = (bySubject[d.subject] || 0) + 1
}
console.log('Duplicates by subject:', bySubject)

console.log('\nFirst 5 duplicates:')
dups.slice(0, 5).forEach((d, idx) => {
  console.log(`[${idx + 1}] Subject: ${d.subject} | File 1: ${d.file1} (ID ${d.id1}) vs File 2: ${d.file2} (ID ${d.id2})`)
  console.log(`     Prompt: "${d.prompt}..."`)
})

