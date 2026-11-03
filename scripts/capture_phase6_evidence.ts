import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

const BASE_URL = 'http://localhost:4173'
const SCREENSHOTS_DIR = path.join('docs', 'visual-qa', 'screenshots')
const INTERACTIONS_DIR = path.join('docs', 'visual-qa', 'interactions')

for (const dir of [SCREENSHOTS_DIR, INTERACTIONS_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

async function run() {
  console.log('=== STARTING PHASE 6 PLAYWRIGHT VISUAL QA & VERIFICATION ===')

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  })

  // Desktop context
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  })
  const page = await context.newPage()

  // 1. Initialize user and seed demo state
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    // Authenticate as learner
    localStorage.setItem(
      'study_ai_auth_user',
      JSON.stringify({
        id: 'student-demo-id',
        email: 'student@studyai.edu.vn',
        fullName: 'Nguyễn Văn Học Sinh',
        role: 'learner',
      })
    )

    // Seed Knowledge Gaps
    const gapsKey = 'study_ai.knowledge_gaps.v1'
    const gapsData = {
      version: 1,
      gaps: [
        {
          id: 'gap_les-math-12-01_kp-inflection',
          subjectId: 'toan-hoc',
          subjectName: 'Toán học',
          lessonId: 'les-math-12-01',
          lessonTitle: 'Đạo hàm và Khảo sát hàm số',
          sectionId: 'section-2',
          sectionTitle: 'Quy tắc chuỗi và đạo hàm hàm hợp',
          knowledgePointId: 'kp-inflection',
          title: 'Điểm uốn của đồ thị hàm số bậc 3',
          questionPrompt: 'Điểm uốn của hàm số y = ax^3 + bx^2 + cx + d xảy ra khi nào?',
          explanation: 'Điều kiện cần và đủ là đạo hàm cấp hai y\'\'(x) = 0 và đổi dấu khi qua điểm đó.',
          severity: 'medium',
          source: 'assessment_attempt',
          sourceAttemptId: 'att-math-01',
          wrongAttemptsCount: 2,
          correctReviewCount: 0,
          status: 'needs-review',
          lastDetectedAt: new Date(Date.now() - 86400000).toISOString(),
          createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'gap_les-phys-12-01_kp-shm-phase',
          subjectId: 'vat-ly',
          subjectName: 'Vật lý',
          lessonId: 'les-phys-12-01',
          lessonTitle: 'Dao động điều hòa đại cương',
          sectionId: 'sec-phase',
          sectionTitle: 'Ý nghĩa pha ban đầu phi',
          knowledgePointId: 'kp-shm-phase',
          title: 'Xác định pha ban đầu trong dao động điều hòa',
          questionPrompt: 'Tại t = 0 vật qua VTCB theo chiều dương thì pha ban đầu bằng bao nhiêu?',
          explanation: 'Vật qua VTCB theo chiều dương có v > 0 nên sin(phi) < 0 => phi = -pi/2 rad.',
          severity: 'low',
          source: 'assessment_attempt',
          sourceAttemptId: 'att-phys-01',
          wrongAttemptsCount: 1,
          correctReviewCount: 1,
          status: 'reinforcing',
          lastDetectedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
          createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'gap_les-chem-12-01_kp-titration',
          subjectId: 'hoa-hoc',
          subjectName: 'Hóa học',
          lessonId: 'les-chem-12-01',
          lessonTitle: 'Cân bằng hóa học và Axit - Bazơ',
          sectionId: 'sec-titration',
          sectionTitle: 'Kỹ thuật chuẩn độ thể tích',
          knowledgePointId: 'kp-titration',
          title: 'Điểm tương đương trong chuẩn độ Axit mạnh - Bazơ mạnh',
          questionPrompt: 'Chỉ thị phenolphthalein chuyển màu ở khoảng pH nào trong phép chuẩn độ?',
          explanation: 'Phenolphthalein không màu ở pH < 8.2 và chuyển sang màu hồng đậm ở pH 8.2 - 10.0.',
          severity: 'high',
          source: 'assessment_attempt',
          sourceAttemptId: 'att-chem-01',
          wrongAttemptsCount: 3,
          correctReviewCount: 0,
          status: 'needs-review',
          lastDetectedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
          createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    }
    localStorage.setItem(gapsKey, JSON.stringify(gapsData))

    // Seed Smart Review items
    const today = new Date().toISOString().split('T')[0]
    const reviewKey = 'study_ai.smart_review.v1'
    const reviewData = {
      version: 1,
      items: [
        {
          id: 'rev_gap_les-math-12-01_kp-inflection',
          gapId: 'gap_les-math-12-01_kp-inflection',
          knowledgePointId: 'kp-inflection',
          subjectId: 'toan-hoc',
          subjectName: 'Toán học',
          lessonId: 'les-math-12-01',
          lessonTitle: 'Đạo hàm và Khảo sát hàm số',
          sectionId: 'section-2',
          sectionTitle: 'Quy tắc chuỗi và đạo hàm hàm hợp',
          title: 'Điểm uốn của đồ thị hàm số bậc 3',
          prompt: 'Điểm uốn của hàm số y = ax^3 + bx^2 + cx + d xảy ra khi nào?',
          explanation: 'Điều kiện cần và đủ là đạo hàm cấp hai y\'\'(x) = 0 và đổi dấu khi qua điểm đó.',
          dueDate: today,
          reviewCount: 0,
          intervalDays: 1,
          status: 'due',
          history: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'rev_gap_les-chem-12-01_kp-titration',
          gapId: 'gap_les-chem-12-01_kp-titration',
          knowledgePointId: 'kp-titration',
          subjectId: 'hoa-hoc',
          subjectName: 'Hóa học',
          lessonId: 'les-chem-12-01',
          lessonTitle: 'Cân bằng hóa học và Axit - Bazơ',
          sectionId: 'sec-titration',
          sectionTitle: 'Kỹ thuật chuẩn độ thể tích',
          title: 'Điểm tương đương trong chuẩn độ Axit mạnh - Bazơ mạnh',
          prompt: 'Chỉ thị phenolphthalein chuyển màu ở khoảng pH nào trong phép chuẩn độ?',
          explanation: 'Phenolphthalein không màu ở pH < 8.2 và chuyển sang màu hồng đậm ở pH 8.2 - 10.0.',
          dueDate: today,
          reviewCount: 0,
          intervalDays: 1,
          status: 'due',
          history: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    }
    localStorage.setItem(reviewKey, JSON.stringify(reviewData))
  })

  // SCREENSHOT 1: Knowledge Gaps Page Desktop 1440x900
  console.log('Capturing Knowledge Gaps Page Desktop...')
  await page.goto(`${BASE_URL}/knowledge-gaps`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'learner_knowledge_gaps_desktop.png'),
    fullPage: false,
  })

  // SCREENSHOT 2: Knowledge Gaps Page Mobile 390x844
  console.log('Capturing Knowledge Gaps Page Mobile...')
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  })
  const mobilePage = await mobileContext.newPage()
  await mobilePage.goto(`${BASE_URL}/knowledge-gaps`, { waitUntil: 'networkidle' })
  await mobilePage.waitForTimeout(600)
  await mobilePage.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'learner_knowledge_gaps_mobile_390.png'),
    fullPage: false,
  })
  await mobileContext.close()

  // SCREENSHOT 3: Smart Review Home Desktop
  console.log('Capturing Smart Review Home Desktop...')
  await page.goto(`${BASE_URL}/review`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'learner_smart_review_home_desktop.png'),
    fullPage: false,
  })

  // SCREENSHOT 4: Smart Review Active Session (Question card before reveal)
  console.log('Capturing Smart Review Active Session Card...')
  const startBtn = page.getByRole('button', { name: /Bắt đầu ôn tập/i }).first()
  await startBtn.click()
  await page.waitForTimeout(600)
  await page.screenshot({
    path: path.join(INTERACTIONS_DIR, 'learner_smart_review_session_desktop.png'),
    fullPage: false,
  })

  // SCREENSHOT 5: Smart Review Revealed Card (Explanation + Rating buttons)
  console.log('Capturing Smart Review Revealed Card...')
  const revealBtn = page.getByRole('button', { name: /Xem giải thích & Đáp án/i })
  await revealBtn.click()
  await page.waitForTimeout(500)
  await page.screenshot({
    path: path.join(INTERACTIONS_DIR, 'learner_smart_review_revealed_desktop.png'),
    fullPage: false,
  })

  // Rate item 1 and item 2 to complete session
  console.log('Rating item 1 and item 2...')
  const wellRateBtn = page.getByRole('button', { name: /Nhớ rất tốt/i })
  await wellRateBtn.click()
  await page.waitForTimeout(500)

  // Item 2
  const revealBtn2 = page.getByRole('button', { name: /Xem giải thích & Đáp án/i })
  await revealBtn2.click()
  await page.waitForTimeout(400)
  const partialRateBtn = page.getByRole('button', { name: /Nhớ một phần/i })
  await partialRateBtn.click()
  await page.waitForTimeout(600)

  // SCREENSHOT 6: Smart Review Session Completed Screen
  console.log('Capturing Smart Review Completed Screen...')
  await page.screenshot({
    path: path.join(INTERACTIONS_DIR, 'learner_smart_review_completed_desktop.png'),
    fullPage: false,
  })

  // SCREENSHOT 7: Dashboard with Smart Review Widget
  console.log('Capturing Dashboard Smart Review Widget...')
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'learner_dashboard_review_widget_desktop.png'),
    fullPage: false,
  })

  // SCREENSHOT 8: Link back to lesson from Knowledge Gaps
  console.log('Capturing Lesson Anchor from Knowledge Gap...')
  await page.goto(`${BASE_URL}/knowledge-gaps`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  const lessonBtn = page.getByRole('button', { name: /Xem lại bài giảng/i }).first()
  await lessonBtn.click()
  await page.waitForTimeout(800)
  await page.screenshot({
    path: path.join(INTERACTIONS_DIR, 'learner_gap_to_lesson_anchor_desktop.png'),
    fullPage: false,
  })

  await browser.close()
  console.log('=== PHASE 6 PLAYWRIGHT VISUAL QA COMPLETED SUCCESSFULLY ===')
}

run().catch((err) => {
  console.error('Phase 6 visual QA failed:', err)
  process.exit(1)
})
