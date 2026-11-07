import { chromium } from 'playwright'
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'

const PORT = 4178
const BASE_URL = `http://localhost:${PORT}`
const PHASE13_DIR = path.join('docs', 'visual-qa', 'phase-13')

if (!fs.existsSync(PHASE13_DIR)) {
  fs.mkdirSync(PHASE13_DIR, { recursive: true })
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
  console.log('=== STARTING PHASE 13 PERSONALIZED LEARNING ENGINE PLAYWRIGHT CAPTURE ===')

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

    // 1. Clean LocalStorage to test honest empty states
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' })
    await page.evaluate(() => {
      localStorage.setItem('study_ai_auth_user', JSON.stringify({
        id: 'student-phase13',
        name: 'Học sinh Nguyễn Văn An',
        email: 'an.nguyen@student.studyai.vn',
        role: 'student',
      }))
      localStorage.removeItem('study_ai_practice_sessions_v1')
      localStorage.removeItem('study_ai_practice_results_v1')
    })

    // Shot 1: Analytics Empty State Desktop
    console.log('Capturing 01-analytics-empty-state-desktop.png...')
    await page.goto(`${BASE_URL}/learning-analytics`, { waitUntil: 'networkidle' })
    // Click on "Năng lực thực chứng & Cá nhân hóa" tab
    const personalizationTabBtn = page.getByRole('tab', { name: /Năng lực thực chứng/i })
    await personalizationTabBtn.click()
    await page.waitForTimeout(600)
    await page.screenshot({
      path: path.join(PHASE13_DIR, '01-analytics-empty-state-desktop.png'),
      fullPage: true,
    })

    // Shot 2: Analytics Empty State Mobile (390x844)
    console.log('Capturing 02-analytics-empty-state-mobile.png...')
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
    })
    const mobilePage = await mobileContext.newPage()
    await mobilePage.goto(`${BASE_URL}/learning-analytics`, { waitUntil: 'networkidle' })
    await mobilePage.getByRole('tab', { name: /Năng lực thực chứng/i }).click()
    await mobilePage.waitForTimeout(600)
    await mobilePage.screenshot({
      path: path.join(PHASE13_DIR, '02-analytics-empty-state-mobile.png'),
      fullPage: true,
    })
    await mobileContext.close()

    // Shot 3: Learning Path Empty State Desktop
    console.log('Capturing 03-learning-path-adaptive-empty.png...')
    await page.goto(`${BASE_URL}/learning-path`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(600)
    await page.screenshot({
      path: path.join(PHASE13_DIR, '03-learning-path-adaptive-empty.png'),
      fullPage: true,
    })

    // 2. Perform authentic Practice Session to generate real PracticeResult
    console.log('Performing authentic practice session...')
    await page.goto(`${BASE_URL}/practice`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(600)

    // Click "Bắt đầu làm bài"
    const startBtn = page.getByRole('button', { name: /Bắt đầu làm bài/i })
    await startBtn.click()
    await page.waitForURL(/\/practice\/session\//, { timeout: 10000 })
    await page.waitForTimeout(600)

    // Answer Q1 (MCQ) - Pick Option A
    const optA = page.locator('.mcq-option-row').first()
    if (await optA.isVisible()) {
      await optA.click()
      await page.waitForTimeout(300)
    }

    // Navigate to Q2
    const nextBtn = page.getByRole('button', { name: /Câu tiếp theo/i })
    if (await nextBtn.isVisible()) {
      await nextBtn.click()
      await page.waitForTimeout(400)
    }

    // Submit session
    const submitBtn = page.getByRole('button', { name: /Nộp bài/i })
    await submitBtn.click()
    await page.waitForTimeout(400)

    // Confirm dialog
    const confirmBtn = page.locator('.confirm-dialog-footer button').last()
    await confirmBtn.click()
    await page.waitForURL(/\/practice\/result\//, { timeout: 10000 })
    await page.waitForTimeout(800)

    // Shot 4: Analytics Populated Desktop
    console.log('Capturing 04-analytics-populated-desktop.png...')
    await page.goto(`${BASE_URL}/learning-analytics`, { waitUntil: 'networkidle' })
    await page.getByRole('tab', { name: /Năng lực thực chứng/i }).click()
    await page.waitForTimeout(800)
    await page.screenshot({
      path: path.join(PHASE13_DIR, '04-analytics-populated-desktop.png'),
      fullPage: true,
    })

    // Shot 5: Knowledge Gaps Section in /knowledge-gaps
    console.log('Capturing 05-knowledge-gaps-section.png...')
    await page.goto(`${BASE_URL}/knowledge-gaps`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    await page.screenshot({
      path: path.join(PHASE13_DIR, '05-knowledge-gaps-section.png'),
      fullPage: true,
    })

    // Shot 6: Personalized Recommendations close-up
    console.log('Capturing 06-personalized-recommendations.png...')
    await page.goto(`${BASE_URL}/learning-analytics`, { waitUntil: 'networkidle' })
    await page.getByRole('tab', { name: /Năng lực thực chứng/i }).click()
    await page.waitForTimeout(600)
    const recSection = page.locator('[data-testid="recommendations-section"]')
    if (await recSection.isVisible()) {
      await recSection.scrollIntoViewIfNeeded()
      await page.screenshot({
        path: path.join(PHASE13_DIR, '06-personalized-recommendations.png'),
      })
    } else {
      await page.screenshot({
        path: path.join(PHASE13_DIR, '06-personalized-recommendations.png'),
        fullPage: true,
      })
    }

    // Shot 7: Adaptive Learning Path Desktop (/learning-path)
    console.log('Capturing 07-adaptive-learning-path.png...')
    await page.goto(`${BASE_URL}/learning-path`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    await page.screenshot({
      path: path.join(PHASE13_DIR, '07-adaptive-learning-path.png'),
      fullPage: true,
    })

    // Shot 8: Adaptive Learning Path Mobile (390x844)
    console.log('Capturing 08-adaptive-path-mobile.png...')
    const mobileContext2 = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
    })
    const mobilePage2 = await mobileContext2.newPage()
    await mobilePage2.goto(`${BASE_URL}/learning-path`, { waitUntil: 'networkidle' })
    await mobilePage2.waitForTimeout(800)
    await mobilePage2.screenshot({
      path: path.join(PHASE13_DIR, '08-adaptive-path-mobile.png'),
      fullPage: true,
    })
    await mobileContext2.close()

    // 3. Complete a 2nd Practice Session to test dynamic update
    console.log('Performing a second practice session to verify dynamic re-computation...')
    await page.goto(`${BASE_URL}/practice`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(400)
    await page.getByRole('button', { name: /Bắt đầu làm bài/i }).click()
    await page.waitForURL(/\/practice\/session\//, { timeout: 10000 })
    await page.waitForTimeout(400)

    // Submit right away
    await page.getByRole('button', { name: /Nộp bài/i }).click()
    await page.waitForTimeout(300)
    await page.locator('.confirm-dialog-footer button').last().click()
    await page.waitForURL(/\/practice\/result\//, { timeout: 10000 })
    await page.waitForTimeout(800)

    // Shot 9: Recalculated after new attempt
    console.log('Capturing 09-recalculated-after-new-attempt.png...')
    await page.goto(`${BASE_URL}/learning-analytics`, { waitUntil: 'networkidle' })
    await page.getByRole('tab', { name: /Năng lực thực chứng/i }).click()
    await page.waitForTimeout(800)
    await page.screenshot({
      path: path.join(PHASE13_DIR, '09-recalculated-after-new-attempt.png'),
      fullPage: true,
    })

    console.log('=== PLAYWRIGHT CAPTURE COMPLETED SUCCESSFULLY ===')
    await browser.close()
  } finally {
    preview.kill()
  }
}

run().catch((err) => {
  console.error('Playwright script failed:', err)
  process.exit(1)
})
