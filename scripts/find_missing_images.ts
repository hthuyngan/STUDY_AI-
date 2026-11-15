import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const sqlImages = execSync(
  'sqlcmd -S "localhost\\SQLEXPRESS" -E -C -h -1 -W -s "|" -Q "SET NOCOUNT ON; SELECT DISTINCT ImageUrl FROM StudyAIDb_E2E.dbo.content_questions WHERE SourceType = \'vnhsge\' AND ImageUrl IS NOT NULL AND ImageUrl != \'\';"',
  { encoding: 'utf8' }
)

const imageUrls = sqlImages.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0)
const backendWwwroot = 'D:\\TN\\backend\\src\\StudyAI.Api\\wwwroot'

const missing: string[] = []
for (const imgUrl of imageUrls) {
  const relPath = imgUrl.startsWith('/') ? imgUrl.slice(1) : imgUrl
  const bPath = path.join(backendWwwroot, relPath)
  if (!fs.existsSync(bPath)) {
    missing.push(imgUrl)
  }
}

console.log('Total missing image URLs:', missing.length)
missing.slice(0, 10).forEach(m => console.log('Missing:', m))

