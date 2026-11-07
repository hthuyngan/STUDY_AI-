import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

const BASE_URL = 'http://127.0.0.1:5173'
const OUTPUT_DIR = path.join('docs', 'visual-qa', 'setup-verify')

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

const SCREENS = [
  { name: '01_dashboard', path: '/dashboard', title: 'Trang chủ' },
  { name: '02_subjects', path: '/subjects', title: 'Danh sách môn học' },
  { name: '03_subject_detail', path: '/subjects/toan-12', title: 'Chi tiết môn học' },
  { name: '04_lesson', path: '/subjects/toan-12/lessons/toan-12-c1-b1', title: 'Trang bài học' },
  { name: '05_learning_path', path: '/learning-path', title: 'Lộ trình học tập' },
  { name: '06_ai_tutor', path: '/ai-tutor', title: 'AI Tutor' },
  { name: '07_my_notes', path: '/my-notes', title: 'Ghi chú cá nhân' },
]

async function run() {
  console.log('🚀 Starting UI Verification across Desktop & Mobile...')
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  })

  // 1. Desktop 1280x800
  console.log('\n--- VERIFYING DESKTOP (1280x800) ---')
  const desktopPage = await browser.newPage({ viewport: { width: 1280, height: 800 } })

  for (const screen of SCREENS) {
    try {
      console.log(`Checking ${screen.title} (${screen.path})...`)
      await desktopPage.goto(`${BASE_URL}${screen.path}`, { waitUntil: 'networkidle', timeout: 10000 })
      await desktopPage.waitForTimeout(500)
      const screenshotPath = path.join(OUTPUT_DIR, `${screen.name}_desktop.png`)
      await desktopPage.screenshot({ path: screenshotPath, fullPage: false })
      console.log(`  ✓ Desktop Screenshot saved: ${screenshotPath}`)
    } catch (err: any) {
      console.error(`  ✗ Error testing ${screen.name}:`, err.message)
    }
  }

  // 2. Mobile 375x812 (iPhone view)
  console.log('\n--- VERIFYING MOBILE (375x812) ---')
  const mobilePage = await browser.newPage({ viewport: { width: 375, height: 812 } })

  for (const screen of SCREENS) {
    try {
      console.log(`Checking Mobile: ${screen.title} (${screen.path})...`)
      await mobilePage.goto(`${BASE_URL}${screen.path}`, { waitUntil: 'networkidle', timeout: 10000 })
      await mobilePage.waitForTimeout(500)
      const screenshotPath = path.join(OUTPUT_DIR, `${screen.name}_mobile.png`)
      await mobilePage.screenshot({ path: screenshotPath, fullPage: false })
      console.log(`  ✓ Mobile Screenshot saved: ${screenshotPath}`)
    } catch (err: any) {
      console.error(`  ✗ Error testing Mobile ${screen.name}:`, err.message)
    }
  }

  await browser.close()
  console.log('\n🎉 Visual UI verification finished successfully!')
}

run().catch((err) => {
  console.error('Fatal error during UI verification:', err)
  process.exit(1)
})

