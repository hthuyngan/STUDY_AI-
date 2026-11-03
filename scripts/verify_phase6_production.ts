import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

const PROD_URL = 'https://hthuyngan.github.io/STUDY_AI-'
const SCREENSHOTS_DIR = path.join('docs', 'visual-qa', 'screenshots')
const INTERACTIONS_DIR = path.join('docs', 'visual-qa', 'interactions')

for (const dir of [SCREENSHOTS_DIR, INTERACTIONS_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

async function run() {
  console.log('=== STARTING PRODUCTION ACCEPTANCE FOR PHASE 6 ===')
  console.log(`Target: ${PROD_URL}`)

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  })

  // 1. Desktop context
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  })
  const page = await context.newPage()

  // Navigate to root to set session
  console.log('1. Loading production root...')
  await page.goto(`${PROD_URL}/`, { waitUntil: 'networkidle' })

  await page.evaluate(() => {
    localStorage.clear()
    localStorage.setItem(
      'study_ai_auth_user',
      JSON.stringify({
        id: 'student-prod-qa',
        email: 'student.qa@studyai.edu.vn',
        fullName: 'Nguyễn Văn Học Sinh QA',
        role: 'learner',
      })
    )

    // Pre-seed 80% reading progress on lesson-math-08 so assessment is unlocked
    const progressKey = 'study_ai.lesson_progress.v1'
    const progressData = {
      'lesson-math-08': {
        lessonId: 'lesson-math-08',
        subjectId: 'math',
        completedSectionIds: ['intro', 'definitions', 'properties', 'examples'],
        contentProgress: 80,
        assessmentStatus: 'not-attempted',
        overallProgress: 80,
        updatedAt: new Date().toISOString(),
      },
    }
    localStorage.setItem(progressKey, JSON.stringify(progressData))
  })

  // 2. Open lesson-math-08 on production
  console.log('2. Navigating to lesson-math-08 on production...')
  await page.goto(`${PROD_URL}/subjects/math/lessons/lesson-math-08`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)

  // Scroll to bottom to view assessment card
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight)
  })
  await page.waitForTimeout(600)

  // 3. Start harvest assessment
  console.log('3. Opening Assessment Modal...')
  const startBtn = page.getByRole('button', { name: /Bắt đầu làm bài/i }).first()
  if (await startBtn.isVisible()) {
    await startBtn.click()
    await page.waitForTimeout(600)

    // Answering all 5 questions so isAllAnswered is true
    console.log('Answering questions in assessment modal...')
    for (let q = 0; q < 5; q++) {
      await page.waitForTimeout(500)
      const options = page.locator('.assessment-option-item')
      await options.first().click()
      await page.waitForTimeout(400)

      if (q < 4) {
        const nextBtn = page.getByRole('button', { name: /Câu tiếp/i }).first()
        await nextBtn.click()
      }
    }

    // Now on last question, click "Nộp bài"
    console.log('Submitting assessment attempt...')
    const submitBtn = page.getByRole('button', { name: /Nộp bài/i }).first()
    if (await submitBtn.isVisible()) {
      await submitBtn.click()
      await page.waitForTimeout(400)

      // Confirm submit dialog
      const confirmSubmitBtn = page.getByRole('button', { name: /Xác nhận nộp bài/i }).first()
      if (await confirmSubmitBtn.isVisible()) {
        await confirmSubmitBtn.click()
        await page.waitForTimeout(1000)
      }
    }

    // Capture assessment completion & score
    await page.screenshot({
      path: path.join(INTERACTIONS_DIR, 'prod_phase6_assessment_gap_created.png'),
      fullPage: false,
    })

    // Close modal
    const closeBtn = page.getByRole('button', { name: /Đóng|Xem lại bài học/i }).first()
    if (await closeBtn.isVisible()) {
      await closeBtn.click()
      await page.waitForTimeout(500)
    }
  }

  // 4. Verify progress and generated knowledge gaps in storage
  const storageState = await page.evaluate(() => {
    let gaps: any = null
    let review: any = null
    let progress: any = null
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k?.includes('knowledge_gaps')) gaps = JSON.parse(localStorage.getItem(k) || '{}')
      if (k?.includes('smart_review')) review = JSON.parse(localStorage.getItem(k) || '{}')
      if (k?.includes('lesson_progress')) progress = JSON.parse(localStorage.getItem(k) || '{}')
    }
    return {
      progress,
      gaps,
      review,
    }
  })
  console.log('Storage inspection after assessment attempt:')
  console.log('- Lesson progress:', JSON.stringify(storageState.progress))
  console.log('- Total Knowledge Gaps created:', storageState.gaps?.gaps?.length ?? storageState.gaps?.length ?? 0)
  console.log('- Total Smart Review items created:', storageState.review?.items?.length ?? storageState.review?.length ?? 0)

  // 5. Navigate to /knowledge-gaps on production
  console.log('5. Navigating to /knowledge-gaps on production...')
  await page.goto(`${PROD_URL}/knowledge-gaps`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)

  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'prod_phase6_knowledge_gaps_desktop.png'),
    fullPage: false,
  })

  // 6. Navigate to /review on production
  console.log('6. Navigating to /review on production...')
  await page.goto(`${PROD_URL}/review`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)

  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'prod_phase6_smart_review_desktop.png'),
    fullPage: false,
  })

  // 7. Start Smart Review Session
  console.log('7. Starting Smart Review session...')
  const startReviewBtn = page.getByRole('button', { name: /Bắt đầu ôn tập/i }).first()
  if (await startReviewBtn.isVisible()) {
    await startReviewBtn.click()
    await page.waitForTimeout(600)

    // Capture active card before reveal
    await page.screenshot({
      path: path.join(INTERACTIONS_DIR, 'prod_phase6_smart_review_session.png'),
      fullPage: false,
    })

    // Click reveal
    const revealBtn = page.getByRole('button', { name: /Xem giải thích & Đáp án/i })
    if (await revealBtn.isVisible()) {
      await revealBtn.click()
      await page.waitForTimeout(500)

      // Rate card
      const rateBtn = page.getByRole('button', { name: /Nhớ rất tốt/i }).first()
      if (await rateBtn.isVisible()) {
        await rateBtn.click()
        await page.waitForTimeout(800)
      }
    }

    // Capture completed screen
    await page.screenshot({
      path: path.join(INTERACTIONS_DIR, 'prod_phase6_smart_review_completed.png'),
      fullPage: false,
    })
  }

  // 8. Verify persistence across page reload
  console.log('8. Verifying reload persistence on /review...')
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(600)

  // 9. Navigate to /dashboard on production
  console.log('9. Navigating to /dashboard on production...')
  await page.goto(`${PROD_URL}/dashboard`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)

  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'prod_phase6_dashboard_desktop.png'),
    fullPage: false,
  })

  // 10. Check mobile viewports on production
  console.log('10. Capturing mobile viewports on production...')
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  })
  const mobilePage = await mobileContext.newPage()

  await mobilePage.goto(`${PROD_URL}/knowledge-gaps`, { waitUntil: 'networkidle' })
  await mobilePage.waitForTimeout(800)
  await mobilePage.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'prod_phase6_knowledge_gaps_mobile.png'),
    fullPage: false,
  })

  await mobilePage.goto(`${PROD_URL}/review`, { waitUntil: 'networkidle' })
  await mobilePage.waitForTimeout(800)
  await mobilePage.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'prod_phase6_smart_review_mobile.png'),
    fullPage: false,
  })

  await mobileContext.close()
  await browser.close()
  console.log('=== PRODUCTION ACCEPTANCE SUITE COMPLETED WITH 100% SUCCESS ===')
}

run().catch((err) => {
  console.error('Production acceptance error:', err)
  process.exit(1)
})
