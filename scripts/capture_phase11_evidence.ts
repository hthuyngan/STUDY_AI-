import { chromium } from 'playwright'
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'

const PORT = 4175
const BASE_URL = `http://localhost:${PORT}`
const PHASE11_DIR = path.join('docs', 'visual-qa', 'phase-11')
const SCREENSHOTS_DIR = path.join('docs', 'visual-qa', 'screenshots')

for (const dir of [PHASE11_DIR, SCREENSHOTS_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

async function waitForServer(url: string, timeoutMs = 25000): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok || res.status === 200 || res.status === 304) {
        return
      }
    } catch {
      // wait and retry
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`Server at ${url} did not become ready within ${timeoutMs}ms`)
}

async function run() {
  console.log('=== STARTING PHASE 11 QUESTION BANK PLAYWRIGHT CAPTURE ===')

  console.log(`Starting vite preview on port ${PORT}...`)
  const preview = spawn('bun', ['run', 'preview', '--port', String(PORT), '--strictPort'], {
    cwd: path.join(process.cwd(), 'frontend'),
    shell: true,
    stdio: 'inherit',
  })

  try {
    await waitForServer(BASE_URL)
    console.log('Vite preview server is ready at', BASE_URL)

    const browser = await chromium.launch({
      headless: true,
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    })

    // Setup Desktop Context (1440x900)
    const desktopContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    })
    const page = await desktopContext.newPage()

    // Seed mock authentication
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' })
    await page.evaluate(() => {
      localStorage.clear()
      localStorage.setItem(
        'study_ai_auth_user',
        JSON.stringify({
          id: 'student-phase11-qa',
          email: 'student.phase11@studyai.edu.vn',
          fullName: 'Học sinh Nghiệm thu Phase 11',
          role: 'learner',
        })
      )
    })

    // 1. Question Bank Full Listing - Desktop
    console.log('1. Capturing Question Bank Listing (Desktop)...')
    await page.goto(`${BASE_URL}/question-bank`, { waitUntil: 'networkidle' })
    await page.waitForSelector('.qb-page-root', { state: 'visible', timeout: 15000 })
    await page.waitForTimeout(600)
    const listDesktopPath = path.join(PHASE11_DIR, 'question_bank_listing_desktop.png')
    await page.screenshot({ path: listDesktopPath, fullPage: true })
    fs.copyFileSync(listDesktopPath, path.join(SCREENSHOTS_DIR, 'phase11_question_bank_listing_desktop.png'))

    // 2. Filter by Question Type: True/False Group
    console.log('2. Filtering and Capturing True/False Group Questions...')
    const typeSelect = page.locator('.qb-filter-select').first()
    await typeSelect.selectOption('true_false_group')
    await page.waitForTimeout(500)
    const tfgPath = path.join(PHASE11_DIR, 'filter_true_false_group.png')
    await page.screenshot({ path: tfgPath, fullPage: true })
    fs.copyFileSync(tfgPath, path.join(SCREENSHOTS_DIR, 'phase11_filter_true_false_group.png'))

    // 3. Filter by Short Answer
    console.log('3. Filtering and Capturing Short Answer Questions...')
    await typeSelect.selectOption('short_answer')
    await page.waitForTimeout(500)
    const saPath = path.join(PHASE11_DIR, 'filter_short_answer.png')
    await page.screenshot({ path: saPath, fullPage: true })
    fs.copyFileSync(saPath, path.join(SCREENSHOTS_DIR, 'phase11_filter_short_answer.png'))

    // 4. Toggle Step-by-Step Explanation
    console.log('4. Toggling Explanation Drawer...')
    const toggleExpBtn = page.locator('.qb-toggle-exp-btn').first()
    if (await toggleExpBtn.isVisible()) {
      await toggleExpBtn.click()
      await page.waitForSelector('.qb-explanation-drawer', { state: 'visible', timeout: 5000 })
      await page.waitForTimeout(400)
      const expPath = path.join(PHASE11_DIR, 'question_explanation_drawer.png')
      await page.locator('.qb-question-card').first().screenshot({ path: expPath })
    }

    // 5. Mobile Viewport (iPhone 13 / 390x844)
    console.log('5. Capturing Question Bank on Mobile (390px)...')
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    })
    const mobilePage = await mobileContext.newPage()
    await mobilePage.goto(`${BASE_URL}/question-bank`, { waitUntil: 'networkidle' })
    await mobilePage.waitForSelector('.qb-page-root', { state: 'visible', timeout: 15000 })
    await mobilePage.waitForTimeout(600)
    const mobilePath = path.join(PHASE11_DIR, 'question_bank_mobile_390px.png')
    await mobilePage.screenshot({ path: mobilePath, fullPage: true })
    fs.copyFileSync(mobilePath, path.join(SCREENSHOTS_DIR, 'phase11_question_bank_mobile_390px.png'))

    await browser.close()
    console.log('=== PHASE 11 VISUAL QA EVIDENCE CAPTURED SUCCESSFULLY ===')
  } finally {
    preview.kill()
  }
}

run().catch((err) => {
  console.error('Phase 11 capture failed:', err)
  process.exit(1)
})
