import { chromium } from 'playwright'
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'

const PORT = 4176
const BASE_URL = `http://localhost:${PORT}`
const PHASE12_DIR = path.join('docs', 'visual-qa', 'phase-12')
const SCREENSHOTS_DIR = path.join('docs', 'visual-qa', 'screenshots')

for (const dir of [PHASE12_DIR, SCREENSHOTS_DIR]) {
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
  console.log('=== STARTING PHASE 12 PRACTICE & ASSESSMENT ENGINE PLAYWRIGHT CAPTURE ===')

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

    // Seed mock authentication and clean practice storage
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' })
    await page.evaluate(() => {
      localStorage.clear()
      localStorage.setItem(
        'study_ai_auth_user',
        JSON.stringify({
          id: 'student-phase12-qa',
          email: 'student.phase12@studyai.edu.vn',
          fullName: 'Học sinh Nghiệm thu Phase 12',
          role: 'learner',
        })
      )
    })

    // 1. Practice Setup Screen - Desktop
    console.log('1. Capturing Practice Setup (Desktop)...')
    await page.goto(`${BASE_URL}/practice`, { waitUntil: 'networkidle' })
    await page.waitForSelector('.practice-setup-card', { state: 'visible', timeout: 15000 })
    await page.waitForTimeout(600)
    const setupDesktopPath = path.join(PHASE12_DIR, '01_practice_setup_desktop.png')
    await page.screenshot({ path: setupDesktopPath, fullPage: true })
    fs.copyFileSync(setupDesktopPath, path.join(SCREENSHOTS_DIR, 'phase12_01_practice_setup_desktop.png'))

    // 2. Start a Real Practice Session (5 questions)
    console.log('2. Starting Session and Capturing MCQ Question...')
    const startBtn = page.locator('.setup-start-btn')
    await startBtn.click()

    await page.waitForSelector('.practice-question-card', { state: 'visible', timeout: 15000 })
    await page.waitForTimeout(600)
    const sessionMcqPath = path.join(PHASE12_DIR, '02_practice_session_mcq.png')
    await page.screenshot({ path: sessionMcqPath, fullPage: true })
    fs.copyFileSync(sessionMcqPath, path.join(SCREENSHOTS_DIR, 'phase12_02_practice_session_mcq.png'))

    // Answer Question 1 (MCQ)
    const mcqOptionA = page.locator('.practice-mcq-btn').first()
    await mcqOptionA.click()
    await page.waitForTimeout(400)

    // Navigate to Question 2
    const nextBtn = page.locator('.nav-step-buttons button').last()
    await nextBtn.click()
    await page.waitForTimeout(400)

    // Capture Question 2
    const sessionQ2Path = path.join(PHASE12_DIR, '03_practice_session_q2.png')
    await page.screenshot({ path: sessionQ2Path, fullPage: true })

    // Reload page to verify Resume & Invariant persistence
    console.log('3. Verifying Auto-save & Resume on Reload...')
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForSelector('.practice-question-card', { state: 'visible', timeout: 15000 })
    await page.waitForTimeout(600)
    const resumePath = path.join(PHASE12_DIR, '04_practice_resume_after_reload.png')
    await page.screenshot({ path: resumePath, fullPage: true })

    // Open Submit Confirmation Dialog
    console.log('4. Opening Submit Confirmation Dialog...')
    const submitBtn = page.locator('.submit-action-wrap button')
    await submitBtn.click()
    await page.waitForSelector('.confirm-dialog-backdrop', { state: 'visible', timeout: 5000 })
    await page.waitForTimeout(500)
    const confirmPath = path.join(PHASE12_DIR, '05_practice_submit_confirm_dialog.png')
    await page.screenshot({ path: confirmPath })

    // Confirm Submit
    console.log('5. Submitting Session and Capturing Scored Result...')
    const confirmBtn = page.locator('.confirm-dialog-footer button').last()
    await confirmBtn.click()

    await page.waitForSelector('.practice-result-root', { state: 'visible', timeout: 15000 })
    await page.waitForTimeout(800)
    const resultDesktopPath = path.join(PHASE12_DIR, '06_practice_result_desktop.png')
    await page.screenshot({ path: resultDesktopPath, fullPage: true })
    fs.copyFileSync(resultDesktopPath, path.join(SCREENSHOTS_DIR, 'phase12_06_practice_result_desktop.png'))

    // Expand Explanation Drawer on a question
    const expToggle = page.locator('.result-exp-toggle').first()
    if (await expToggle.isVisible()) {
      await expToggle.click()
      await page.waitForSelector('.result-explanation-drawer', { state: 'visible', timeout: 5000 })
      await page.waitForTimeout(400)
      const expDrawerPath = path.join(PHASE12_DIR, '07_practice_result_explanation.png')
      await page.locator('.result-question-card').first().screenshot({ path: expDrawerPath })
    }

    // 6. View Practice History Tab
    console.log('6. Capturing Practice History Tab...')
    await page.goto(`${BASE_URL}/practice`, { waitUntil: 'networkidle' })
    await page.waitForSelector('.practice-hub-tabs', { state: 'visible', timeout: 15000 })
    const historyTabBtn = page.locator('.hub-tab-btn').last()
    await historyTabBtn.click()
    await page.waitForSelector('.history-card', { state: 'visible', timeout: 10000 })
    await page.waitForTimeout(600)
    const historyDesktopPath = path.join(PHASE12_DIR, '08_practice_history_desktop.png')
    await page.screenshot({ path: historyDesktopPath, fullPage: true })
    fs.copyFileSync(historyDesktopPath, path.join(SCREENSHOTS_DIR, 'phase12_08_practice_history_desktop.png'))

    // 7. Mobile Viewport (iPhone 13 / 390x844)
    console.log('7. Capturing Practice on Mobile (390px)...')
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    })
    const mobilePage = await mobileContext.newPage()
    await mobilePage.goto(`${BASE_URL}/practice`, { waitUntil: 'networkidle' })
    await mobilePage.waitForSelector('.practice-setup-card', { state: 'visible', timeout: 15000 })
    await mobilePage.waitForTimeout(600)
    const mobilePath = path.join(PHASE12_DIR, '09_practice_setup_mobile_390px.png')
    await mobilePage.screenshot({ path: mobilePath, fullPage: true })
    fs.copyFileSync(mobilePath, path.join(SCREENSHOTS_DIR, 'phase12_09_practice_setup_mobile_390px.png'))

    await browser.close()
    console.log('=== PHASE 12 VISUAL QA EVIDENCE CAPTURED SUCCESSFULLY ===')
  } finally {
    preview.kill()
  }
}

run().catch((err) => {
  console.error('Phase 12 capture failed:', err)
  process.exit(1)
})
