import fs from 'fs'
import path from 'path'

const SOURCE_ROOT = path.join(process.cwd(), 'temp_vnhsge', 'Dataset', 'VNHSGE-V', 'JSON format')
const TARGET_API = path.join(process.cwd(), 'backend', 'src', 'StudyAI.Api', 'wwwroot', 'uploads', 'vnhsge')
const TARGET_FRONTEND = path.join(process.cwd(), 'frontend', 'public', 'uploads', 'vnhsge')

function ensureDir(p: string) {
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p, { recursive: true })
  }
}

async function copyAssets() {
  console.log('=== COPYING VNHSGE IMAGE ASSETS ===')
  ensureDir(TARGET_API)
  ensureDir(TARGET_FRONTEND)

  let copied = 0

  function scanAndCopy(dir: string) {
    if (!fs.existsSync(dir)) return
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        scanAndCopy(fullPath)
      } else if (/\.(png|jpg|jpeg|gif|webp)$/i.test(entry.name)) {
        // preserve folder structure relative to split or subject folder
        // e.g. eval/Biology/MET_Bio_IE_2019/image001.png -> uploads/vnhsge/MET_Bio_IE_2019/image001.png
        const parentDirName = path.basename(path.dirname(fullPath))
        const apiTargetDir = path.join(TARGET_API, parentDirName)
        const frontendTargetDir = path.join(TARGET_FRONTEND, parentDirName)

        ensureDir(apiTargetDir)
        ensureDir(frontendTargetDir)

        fs.copyFileSync(fullPath, path.join(apiTargetDir, entry.name))
        fs.copyFileSync(fullPath, path.join(frontendTargetDir, entry.name))
        copied++
      }
    }
  }

  scanAndCopy(SOURCE_ROOT)
  console.log(`Successfully copied ${copied} image assets to both backend and frontend uploads/vnhsge/`)
}

copyAssets().catch(err => {
  console.error('Error copying assets:', err)
  process.exit(1)
})
