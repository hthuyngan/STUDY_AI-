import { chromium } from 'playwright'
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'

const PORT = 4173
const BASE_URL = `http://localhost:${PORT}`
const PHASE9_DIR = path.join('docs', 'visual-qa', 'phase-09')
const SCREENSHOTS_DIR = path.join('docs', 'visual-qa', 'screenshots')

for (const dir of [PHASE9_DIR, SCREENSHOTS_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

async function waitForServer(url: string, timeoutMs = 20000): Promise<void> {
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
  console.log('=== STARTING PHASE 9 VISUAL QA PLAYWRIGHT CAPTURE ===')

  // 1. Start vite preview server
  console.log('Starting vite preview on port 4173...')
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

    // Setup Desktop Context
    const desktopContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    })
    const page = await desktopContext.newPage()

    // Seed mock authentication and learner session
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' })
    await page.evaluate(() => {
      localStorage.clear()
      localStorage.setItem(
        'study_ai_auth_user',
        JSON.stringify({
          id: 'student-phase9-qa',
          email: 'student.phase9@studyai.edu.vn',
          fullName: 'Học sinh Nghiệm thu Phase 9',
          role: 'learner',
        })
      )
    })

    // 1. Subjects Catalog — Desktop
    console.log('1. Capturing Subjects Catalog (Desktop)...')
    await page.goto(`${BASE_URL}/subjects`, { waitUntil: 'networkidle' })
    await page.waitForSelector('.subjects-grid', { state: 'visible', timeout: 10000 })
    await page.waitForTimeout(600)

    const catalogDesktopPath = path.join(PHASE9_DIR, 'subjects_catalog_desktop.png')
    await page.screenshot({ path: catalogDesktopPath, fullPage: true })
    fs.copyFileSync(catalogDesktopPath, path.join(SCREENSHOTS_DIR, 'phase9_subjects_catalog_desktop.png'))

    // 2. Math Subject Detail — Desktop
    console.log('2. Capturing Math Subject Detail (Desktop)...')
    await page.goto(`${BASE_URL}/subjects/math`, { waitUntil: 'networkidle' })
    await page.waitForSelector('.subject-detail-root', { state: 'visible', timeout: 10000 })
    await page.waitForTimeout(600)

    const mathDetailDesktopPath = path.join(PHASE9_DIR, 'math_subject_detail_desktop.png')
    await page.screenshot({ path: mathDetailDesktopPath, fullPage: true })
    fs.copyFileSync(mathDetailDesktopPath, path.join(SCREENSHOTS_DIR, 'phase9_math_subject_detail_desktop.png'))

    // 3. Coming Soon Subject Detail (Literature) — Desktop
    console.log('3. Capturing Coming Soon Subject Detail (Desktop)...')
    await page.goto(`${BASE_URL}/subjects/literature`, { waitUntil: 'networkidle' })
    await page.waitForSelector('.subject-coming-soon-hero', { state: 'visible', timeout: 10000 })
    await page.waitForTimeout(600)

    const comingSoonDesktopPath = path.join(PHASE9_DIR, 'coming_soon_subject_desktop.png')
    await page.screenshot({ path: comingSoonDesktopPath, fullPage: true })
    fs.copyFileSync(comingSoonDesktopPath, path.join(SCREENSHOTS_DIR, 'phase9_coming_soon_subject_desktop.png'))

    // 4. Lesson 1 with Objectives & Skills Card — Desktop
    console.log('4. Capturing Lesson 1 with GDPT 2018 Objectives & Skills (Desktop)...')
    await page.goto(`${BASE_URL}/subjects/math/lessons/lesson-math-12-01`, { waitUntil: 'networkidle' })
    await page.waitForSelector('.lesson-objectives-card', { state: 'visible', timeout: 10000 })
    await page.waitForTimeout(600)

    const lesson1DesktopPath = path.join(PHASE9_DIR, 'lesson_objectives_skills_desktop.png')
    await page.screenshot({ path: lesson1DesktopPath, fullPage: true })
    fs.copyFileSync(lesson1DesktopPath, path.join(SCREENSHOTS_DIR, 'phase9_lesson_objectives_skills_desktop.png'))

    // 5. Lesson 2 Max/Min — Desktop
    console.log('5. Capturing Lesson 2 Max/Min (Desktop)...')
    await page.goto(`${BASE_URL}/subjects/math/lessons/lesson-math-12-02`, { waitUntil: 'networkidle' })
    await page.waitForSelector('.lesson-article-body', { state: 'visible', timeout: 10000 })
    await page.waitForTimeout(600)

    const lesson2DesktopPath = path.join(PHASE9_DIR, 'lesson_math_12_02_desktop.png')
    await page.screenshot({ path: lesson2DesktopPath, fullPage: true })
    fs.copyFileSync(lesson2DesktopPath, path.join(SCREENSHOTS_DIR, 'phase9_lesson_math_12_02_desktop.png'))

    // 6. Lesson 3 Curve Sketching — Desktop
    console.log('6. Capturing Lesson 3 Curve Sketching (Desktop)...')
    await page.goto(`${BASE_URL}/subjects/math/lessons/lesson-math-12-03`, { waitUntil: 'networkidle' })
    await page.waitForSelector('.lesson-article-body', { state: 'visible', timeout: 10000 })
    await page.waitForTimeout(600)

    const lesson3DesktopPath = path.join(PHASE9_DIR, 'lesson_math_12_03_desktop.png')
    await page.screenshot({ path: lesson3DesktopPath, fullPage: true })
    fs.copyFileSync(lesson3DesktopPath, path.join(SCREENSHOTS_DIR, 'phase9_lesson_math_12_03_desktop.png'))

    await desktopContext.close()

    // Mobile Context (iPhone 14 / standard 390x844)
    console.log('Setting up Mobile context (390x844)...')
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    })
    const mobilePage = await mobileContext.newPage()

    // 7. Subjects Catalog — Mobile
    console.log('7. Capturing Subjects Catalog (Mobile 390px)...')
    await mobilePage.goto(`${BASE_URL}/subjects`, { waitUntil: 'networkidle' })
    await mobilePage.waitForSelector('.subjects-grid', { state: 'visible', timeout: 10000 })
    await mobilePage.waitForTimeout(600)

    const catalogMobilePath = path.join(PHASE9_DIR, 'subjects_catalog_mobile_390.png')
    await mobilePage.screenshot({ path: catalogMobilePath, fullPage: true })
    fs.copyFileSync(catalogMobilePath, path.join(SCREENSHOTS_DIR, 'phase9_subjects_catalog_mobile_390.png'))

    // 8. Coming Soon Subject Detail — Mobile
    console.log('8. Capturing Coming Soon Subject Detail (Mobile 390px)...')
    await mobilePage.goto(`${BASE_URL}/subjects/literature`, { waitUntil: 'networkidle' })
    await mobilePage.waitForSelector('.subject-coming-soon-hero', { state: 'visible', timeout: 10000 })
    await mobilePage.waitForTimeout(600)

    const comingSoonMobilePath = path.join(PHASE9_DIR, 'coming_soon_subject_mobile_390.png')
    await mobilePage.screenshot({ path: comingSoonMobilePath, fullPage: true })
    fs.copyFileSync(comingSoonMobilePath, path.join(SCREENSHOTS_DIR, 'phase9_coming_soon_subject_mobile_390.png'))

    await mobileContext.close()
    await browser.close()
    console.log('=== ALL PHASE 9 VISUAL QA EVIDENCE CAPTURED SUCCESSFULLY ===')
  } finally {
    console.log('Terminating preview server...')
    preview.kill('SIGINT')
    preview.kill('SIGTERM')
  }
}

run().catch((err) => {
  console.error('Phase 9 evidence capture failed:', err)
  process.exit(1)
})
