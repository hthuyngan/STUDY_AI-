import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

const PROD_URL = 'https://hthuyngan.github.io/STUDY_AI-'
const SYNC_DIR = path.join('docs', 'visual-qa', 'github-sync')

if (!fs.existsSync(SYNC_DIR)) {
  fs.mkdirSync(SYNC_DIR, { recursive: true })
}

interface TestResult {
  route: string
  url: string
  title: string
  screenshot: string
  errors: string[]
}

async function run() {
  console.log('=== STARTING PRODUCTION LIVE VERIFICATION & SMOKE TEST ===')
  console.log('Target URL:', PROD_URL)

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  })

  // Desktop context
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  })
  const page = await desktopContext.newPage()

  const consoleErrors: string[] = []
  const failedAssetRequests: string[] = []

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text()
      // Ignore favicon and third-party quirks warnings
      if (!text.includes('favicon') && !text.includes('404 ()')) {
        consoleErrors.push(`[Console Error] ${text}`)
      }
    }
  })

  page.on('response', (res) => {
    const url = res.url()
    const isAsset = /\.(js|css|woff2?|ttf|png|svg|ico)($|\?)/.test(url)
    if (res.status() >= 400 && isAsset) {
      failedAssetRequests.push(`[HTTP ${res.status()}] ${url}`)
    }
  })

  // 1. Seed learner authentication session on root
  console.log('1. Initializing learner session on root...')
  await page.goto(`${PROD_URL}/`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    localStorage.clear()
    localStorage.setItem(
      'study_ai_auth_user',
      JSON.stringify({
        id: 'student-prod-verification',
        email: 'student.verification@studyai.edu.vn',
        fullName: 'Học sinh Thẩm định Production',
        role: 'learner',
      })
    )
  })

  const results: TestResult[] = []

  // 1. Dashboard
  console.log('1. Testing /dashboard on Live Production...')
  await page.goto(`${PROD_URL}/?/dashboard`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  const dashScreenshot = path.join(SYNC_DIR, 'prod_sync_dashboard_desktop.png')
  await page.screenshot({ path: dashScreenshot, fullPage: true })
  results.push({
    route: '/dashboard',
    url: page.url(),
    title: await page.title(),
    screenshot: dashScreenshot,
    errors: [],
  })

  // 2. Subjects Catalog (Desktop)
  console.log('2. Testing /subjects on Live Production (Desktop)...')
  await page.goto(`${PROD_URL}/?/subjects`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.subjects-grid', { timeout: 15000 })
  await page.waitForTimeout(1000)
  const subjDesktopScreenshot = path.join(SYNC_DIR, 'prod_sync_subjects_catalog_desktop.png')
  await page.screenshot({ path: subjDesktopScreenshot, fullPage: true })

  // Verify 9 subjects rendered
  const subjectCardsCount = await page.locator('.subject-item-card').count()
  console.log(`Found ${subjectCardsCount} subject cards on live /subjects`)

  results.push({
    route: '/subjects',
    url: page.url(),
    title: await page.title(),
    screenshot: subjDesktopScreenshot,
    errors: subjectCardsCount >= 9 ? [] : [`Expected 9 subject cards, found ${subjectCardsCount}`],
  })

  // 3. Math 12 Detail (Desktop)
  console.log('3. Testing /subjects/math on Live Production (Desktop)...')
  await page.goto(`${PROD_URL}/?/subjects/math`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.subject-detail-root', { timeout: 15000 })
  await page.waitForTimeout(1000)
  const mathScreenshot = path.join(SYNC_DIR, 'prod_sync_math_detail_desktop.png')
  await page.screenshot({ path: mathScreenshot, fullPage: true })

  results.push({
    route: '/subjects/math',
    url: page.url(),
    title: await page.title(),
    screenshot: mathScreenshot,
    errors: [],
  })

  // 4. Coming Soon Subject Detail (Literature) (Desktop)
  console.log('4. Testing /subjects/literature on Live Production (Desktop)...')
  await page.goto(`${PROD_URL}/?/subjects/literature`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.subject-coming-soon-hero', { timeout: 15000 })
  await page.waitForTimeout(1000)
  const litScreenshot = path.join(SYNC_DIR, 'prod_sync_coming_soon_literature_desktop.png')
  await page.screenshot({ path: litScreenshot, fullPage: true })

  const roadmapCardVisible = await page.locator('.roadmap-card').isVisible()
  results.push({
    route: '/subjects/literature',
    url: page.url(),
    title: await page.title(),
    screenshot: litScreenshot,
    errors: roadmapCardVisible ? [] : ['Roadmap card not visible in ComingSoonView'],
  })

  // 5. Lesson 1 with Objectives & Skills Card (Desktop)
  console.log('5. Testing /subjects/math/lessons/lesson-math-12-01 on Live Production (Desktop)...')
  await page.goto(`${PROD_URL}/?/subjects/math/lessons/lesson-math-12-01`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.lesson-objectives-card', { timeout: 15000 })
  await page.waitForTimeout(1000)
  const lessonScreenshot = path.join(SYNC_DIR, 'prod_sync_lesson_objectives_desktop.png')
  await page.screenshot({ path: lessonScreenshot, fullPage: true })

  const skillPillsCount = await page.locator('.lesson-skill-pill').count()
  console.log(`Found ${skillPillsCount} skill pills in Lesson 1 on live production`)

  results.push({
    route: '/subjects/math/lessons/lesson-math-12-01',
    url: page.url(),
    title: await page.title(),
    screenshot: lessonScreenshot,
    errors: skillPillsCount >= 3 ? [] : [`Expected >= 3 skill pills, found ${skillPillsCount}`],
  })

  // 6. AI Tutor (Desktop)
  console.log('6. Testing /ai-tutor on Live Production (Desktop)...')
  await page.goto(`${PROD_URL}/?/ai-tutor`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.ai-tutor-layout', { timeout: 15000 })
  await page.waitForTimeout(1000)
  const aiScreenshot = path.join(SYNC_DIR, 'prod_sync_ai_tutor_desktop.png')
  await page.screenshot({ path: aiScreenshot, fullPage: true })

  results.push({
    route: '/ai-tutor',
    url: page.url(),
    title: await page.title(),
    screenshot: aiScreenshot,
    errors: [],
  })

  await desktopContext.close()

  // 7. Mobile Viewport (390x844)
  console.log('7. Testing /subjects on Mobile 390px...')
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  })
  const mobilePage = await mobileContext.newPage()

  await mobilePage.goto(`${PROD_URL}/?/subjects`, { waitUntil: 'networkidle' })
  await mobilePage.waitForSelector('.subjects-grid', { timeout: 15000 })
  await mobilePage.waitForTimeout(1000)
  const mobileSubjScreenshot = path.join(SYNC_DIR, 'prod_sync_subjects_catalog_mobile_390.png')
  await mobilePage.screenshot({ path: mobileSubjScreenshot, fullPage: true })

  results.push({
    route: '/subjects [mobile_390]',
    url: mobilePage.url(),
    title: await mobilePage.title(),
    screenshot: mobileSubjScreenshot,
    errors: [],
  })

  await mobileContext.close()
  await browser.close()

  // Output summary
  console.log('\n=== SMOKE TEST SUMMARY ===')
  console.log(`Tested ${results.length} views on Live Production:`)
  let allPass = true
  for (const r of results) {
    const passed = r.errors.length === 0
    if (!passed) allPass = false
    console.log(`- [${passed ? 'PASS' : 'FAIL'}] ${r.route} -> ${r.screenshot}`)
    if (r.errors.length > 0) {
      console.log('  Errors:', r.errors)
    }
  }

  if (failedAssetRequests.length > 0) {
    console.warn('\nFailed Asset Network Requests:', failedAssetRequests)
    allPass = false
  } else {
    console.log('\n0 404/500 asset network requests on Live Production.')
  }

  fs.writeFileSync(
    path.join(SYNC_DIR, 'verification_summary.json'),
    JSON.stringify({ timestamp: new Date().toISOString(), commit: '3facd97', results, allPass }, null, 2),
    'utf-8'
  )

  if (!allPass) {
    throw new Error('Production verification detected errors!')
  }
  console.log('\n=== PRODUCTION LIVE VERIFICATION COMPLETED WITH 100% SUCCESS ===')
}

run().catch((err) => {
  console.error('Production verification failed:', err)
  process.exit(1)
})
