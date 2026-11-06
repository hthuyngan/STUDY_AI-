import { chromium } from 'playwright'
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'

const PORT = 4174
const BASE_URL = `http://localhost:${PORT}`
const PHASE10_DIR = path.join('docs', 'visual-qa', 'phase-10')
const SCREENSHOTS_DIR = path.join('docs', 'visual-qa', 'screenshots')

for (const dir of [PHASE10_DIR, SCREENSHOTS_DIR]) {
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
  console.log('=== STARTING PHASE 10 INTERACTIVE LEARNING PLAYWRIGHT CAPTURE ===')

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
          id: 'student-phase10-qa',
          email: 'student.phase10@studyai.edu.vn',
          fullName: 'Học sinh Nghiệm thu Phase 10',
          role: 'learner',
        })
      )
    })

    // 1. Lesson 1: Monotonicity & Extrema (BBT, Formulas, Mistakes) - Desktop
    console.log('1. Capturing Lesson 1 (Desktop)...')
    await page.goto(`${BASE_URL}/subjects/math/lessons/lesson-math-12-01`, { waitUntil: 'networkidle' })
    await page.waitForSelector('.lesson-page-container', { state: 'visible', timeout: 15000 })
    await page.waitForTimeout(600)
    const l1DesktopPath = path.join(PHASE10_DIR, 'lesson1_monotony_desktop.png')
    await page.screenshot({ path: l1DesktopPath, fullPage: true })
    fs.copyFileSync(l1DesktopPath, path.join(SCREENSHOTS_DIR, 'phase10_lesson1_monotony_desktop.png'))

    // 2. Lesson 2: Max-Min on Interval/Segment - Desktop
    console.log('2. Capturing Lesson 2 (Desktop)...')
    await page.goto(`${BASE_URL}/subjects/math/lessons/lesson-math-12-02`, { waitUntil: 'networkidle' })
    await page.waitForSelector('.lesson-page-container', { state: 'visible', timeout: 15000 })
    await page.waitForTimeout(600)
    const l2DesktopPath = path.join(PHASE10_DIR, 'lesson2_minmax_desktop.png')
    await page.screenshot({ path: l2DesktopPath, fullPage: true })
    fs.copyFileSync(l2DesktopPath, path.join(SCREENSHOTS_DIR, 'phase10_lesson2_minmax_desktop.png'))

    // 3. Lesson 3: Function Graph Sketching (SVG Graphs & Asymptotes) - Desktop
    console.log('3. Capturing Lesson 3 (Desktop)...')
    await page.goto(`${BASE_URL}/subjects/math/lessons/lesson-math-12-03`, { waitUntil: 'networkidle' })
    await page.waitForSelector('.lesson-page-container', { state: 'visible', timeout: 15000 })
    await page.waitForTimeout(600)
    const l3DesktopPath = path.join(PHASE10_DIR, 'lesson3_graphs_desktop.png')
    await page.screenshot({ path: l3DesktopPath, fullPage: true })
    fs.copyFileSync(l3DesktopPath, path.join(SCREENSHOTS_DIR, 'phase10_lesson3_graphs_desktop.png'))

    // 4. Focus on Variation Table Component
    console.log('4. Capturing Variation Table Close-up...')
    const bbtElement = page.locator('.variation-table-card').first()
    if (await bbtElement.isVisible()) {
      await bbtElement.screenshot({ path: path.join(PHASE10_DIR, 'variation_table_closeup.png') })
    }

    // 5. Focus on Function Graph SVG Component
    console.log('5. Capturing Function Graph Close-up...')
    const graphElement = page.locator('.function-graph-card').first()
    if (await graphElement.isVisible()) {
      await graphElement.screenshot({ path: path.join(PHASE10_DIR, 'function_graph_closeup.png') })
    }

    // 6. Test Ask AI Integration from Lesson 3
    console.log('6. Testing and Capturing Contextual AI Tutor transition...')
    const askAiBtn = page.locator('.graph-ai-action-btn').first()
    if (await askAiBtn.isVisible()) {
      await askAiBtn.click()
      await page.waitForURL('**/ai-tutor', { timeout: 10000 })
      await page.waitForSelector('.chat-messages', { state: 'visible', timeout: 10000 })
      await page.waitForTimeout(800)
      const aiContextPath = path.join(PHASE10_DIR, 'ai_tutor_contextual_from_graph.png')
      await page.screenshot({ path: aiContextPath, fullPage: true })
      fs.copyFileSync(aiContextPath, path.join(SCREENSHOTS_DIR, 'phase10_ai_tutor_contextual_from_graph.png'))
    }

    // 7. Mobile Viewport (iPhone 13 / 390x844)
    console.log('7. Capturing Lesson 3 & Variation Table on Mobile (390px)...')
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    })
    const mobilePage = await mobileContext.newPage()
    await mobilePage.goto(`${BASE_URL}/subjects/math/lessons/lesson-math-12-03`, { waitUntil: 'networkidle' })
    await mobilePage.waitForSelector('.lesson-page-container', { state: 'visible', timeout: 15000 })
    await mobilePage.waitForTimeout(600)
    const mobileLessonPath = path.join(PHASE10_DIR, 'lesson3_mobile_390px.png')
    await mobilePage.screenshot({ path: mobileLessonPath, fullPage: true })
    fs.copyFileSync(mobileLessonPath, path.join(SCREENSHOTS_DIR, 'phase10_lesson3_mobile_390px.png'))

    await browser.close()
    console.log('=== PHASE 10 VISUAL QA EVIDENCE CAPTURED SUCCESSFULLY ===')
  } finally {
    preview.kill()
  }
}

run().catch((err) => {
  console.error('Phase 10 capture failed:', err)
  process.exit(1)
})
