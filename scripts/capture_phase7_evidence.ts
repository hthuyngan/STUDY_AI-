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
  console.log('=== STARTING PHASE 7 PLAYWRIGHT VISUAL QA EVIDENCE CAPTURE ===')

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
    const userId = 'student-demo-id'
    // Authenticate as learner
    localStorage.setItem(
      'study_ai_auth_user',
      JSON.stringify({
        id: userId,
        email: 'student@studyai.edu.vn',
        fullName: 'Nguyễn Văn Học Sinh',
        role: 'learner',
      })
    )

    // Seed Knowledge Gaps
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
          title: 'Điểm tương đương và chất chỉ thị màu',
          questionPrompt: 'Lựa chọn chất chỉ thị phenolphthalein trong chuẩn độ axit mạnh - bazơ mạnh?',
          explanation: 'Bước nhảy pH từ 7 đến 10 bao trùm khoảng đổi màu của phenolphthalein (8.2 - 10.0).',
          severity: 'high',
          source: 'assessment_attempt',
          sourceAttemptId: 'att-chem-01',
          wrongAttemptsCount: 3,
          correctReviewCount: 0,
          status: 'needs-review',
          lastDetectedAt: new Date().toISOString(),
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    }
    localStorage.setItem('study_ai.knowledge_gaps.v1', JSON.stringify(gapsData))

    // Seed Harvest Assessments
    const attempts = [
      {
        attemptId: 'att-math-01',
        lessonId: 'les-math-12-01',
        score: 85,
        totalQuestions: 10,
        correctCount: 8,
        passed: true,
        completedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
      },
      {
        attemptId: 'att-math-02',
        lessonId: 'les-math-12-02',
        score: 90,
        totalQuestions: 10,
        correctCount: 9,
        passed: true,
        completedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        attemptId: 'att-phys-01',
        lessonId: 'les-phys-12-01',
        score: 75,
        totalQuestions: 8,
        correctCount: 6,
        passed: true,
        completedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      },
      {
        attemptId: 'att-chem-01',
        lessonId: 'les-chem-12-01',
        score: 60,
        totalQuestions: 10,
        correctCount: 6,
        passed: false,
        completedAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        attemptId: 'att-eng-01',
        lessonId: 'les-eng-12-01',
        score: 95,
        totalQuestions: 10,
        correctCount: 9,
        passed: true,
        completedAt: new Date().toISOString(),
      },
    ]
    localStorage.setItem('study_ai.assessment_attempts.v1', JSON.stringify(attempts))
    localStorage.setItem('study_ai.learning_attempts.v1', JSON.stringify(attempts))
    localStorage.setItem('study_ai.' + userId + '.assessment_attempts.v2', JSON.stringify(attempts))

    // Seed Smart Review items
    const reviewData = {
      version: 1,
      items: [
        {
          id: 'gap_les-math-12-01_kp-inflection',
          knowledgeGapId: 'gap_les-math-12-01_kp-inflection',
          subjectId: 'toan-hoc',
          intervalDays: 1,
          repetitions: 1,
          easeFactor: 2.5,
          nextReviewDate: new Date(Date.now() + 86400000).toISOString(),
          lastReviewedAt: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: 'gap_les-phys-12-01_kp-shm-phase',
          knowledgeGapId: 'gap_les-phys-12-01_kp-shm-phase',
          subjectId: 'vat-ly',
          intervalDays: 3,
          repetitions: 2,
          easeFactor: 2.6,
          nextReviewDate: new Date(Date.now() + 86400000 * 2).toISOString(),
          lastReviewedAt: new Date(Date.now() - 86400000).toISOString(),
        },
      ],
    }
    localStorage.setItem('study_ai.smart_review.v1', JSON.stringify(reviewData))

    // Seed Lesson Progress
    const progressData = {
      'les-math-12-01': { lessonId: 'les-math-12-01', subjectId: 'toan-hoc', progressPercent: 100, completed: true, completedSections: ['s1', 's2'], lastAccessedAt: new Date().toISOString() },
      'les-math-12-02': { lessonId: 'les-math-12-02', subjectId: 'toan-hoc', progressPercent: 100, completed: true, completedSections: ['s1'], lastAccessedAt: new Date().toISOString() },
      'les-phys-12-01': { lessonId: 'les-phys-12-01', subjectId: 'vat-ly', progressPercent: 100, completed: true, completedSections: ['s1'], lastAccessedAt: new Date().toISOString() },
      'les-chem-12-01': { lessonId: 'les-chem-12-01', subjectId: 'hoa-hoc', progressPercent: 80, completed: false, completedSections: ['s1'], lastAccessedAt: new Date().toISOString() },
      'les-eng-12-01': { lessonId: 'les-eng-12-01', subjectId: 'tieng-anh', progressPercent: 100, completed: true, completedSections: ['s1'], lastAccessedAt: new Date().toISOString() },
    }
    localStorage.setItem('study_ai.lesson_progress.v1', JSON.stringify(progressData))
    localStorage.setItem('study_ai.' + userId + '.lesson_progress.v2', JSON.stringify(progressData))

    // Seed Learning Events
    const now = Date.now()
    const oneDay = 86400000
    const eventsData = [
      { id: 'ev-1', type: 'lesson_read', lessonId: 'les-math-12-01', subjectId: 'toan-hoc', durationSeconds: 1200, timestamp: new Date(now - oneDay * 5).toISOString() },
      { id: 'ev-2', type: 'assessment_complete', lessonId: 'les-math-12-01', subjectId: 'toan-hoc', score: 85, durationSeconds: 600, timestamp: new Date(now - oneDay * 4).toISOString() },
      { id: 'ev-3', type: 'lesson_read', lessonId: 'les-phys-12-01', subjectId: 'vat-ly', durationSeconds: 1500, timestamp: new Date(now - oneDay * 3).toISOString() },
      { id: 'ev-4', type: 'assessment_complete', lessonId: 'les-phys-12-01', subjectId: 'vat-ly', score: 75, durationSeconds: 500, timestamp: new Date(now - oneDay * 3).toISOString() },
      { id: 'ev-5', type: 'spaced_review', gapId: 'gap_les-phys-12-01_kp-shm-phase', subjectId: 'vat-ly', durationSeconds: 300, timestamp: new Date(now - oneDay * 2).toISOString() },
      { id: 'ev-6', type: 'lesson_read', lessonId: 'les-chem-12-01', subjectId: 'hoa-hoc', durationSeconds: 1800, timestamp: new Date(now - oneDay).toISOString() },
      { id: 'ev-7', type: 'assessment_complete', lessonId: 'les-chem-12-01', subjectId: 'hoa-hoc', score: 60, durationSeconds: 700, timestamp: new Date(now - oneDay).toISOString() },
      { id: 'ev-8', type: 'lesson_read', lessonId: 'les-eng-12-01', subjectId: 'tieng-anh', durationSeconds: 900, timestamp: new Date(now - 3600000 * 4).toISOString() },
      { id: 'ev-9', type: 'assessment_complete', lessonId: 'les-eng-12-01', subjectId: 'tieng-anh', score: 95, durationSeconds: 400, timestamp: new Date(now - 3600000 * 2).toISOString() },
    ]
    localStorage.setItem('study_ai.learning_events.v1', JSON.stringify(eventsData))
    localStorage.setItem('study_ai.' + userId + '.learning_events.v2', JSON.stringify(eventsData))
  })

  // SCREENSHOT 1: Learner Analytics Overview (Desktop 1440x900)
  console.log('1. Capturing learner_analytics_overview_desktop.png...')
  await page.goto(`${BASE_URL}/learning-analytics`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'learner_analytics_overview_desktop.png'),
    fullPage: false,
  })

  // SCREENSHOT 2: Competency Profile Tab (Desktop 1440x900)
  console.log('2. Capturing learner_analytics_competency_desktop.png...')
  const competencyTab = page.locator('button.nav-tab-btn:has-text("Hồ sơ năng lực")').first()
  await competencyTab.click()
  await page.waitForTimeout(600)
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'learner_analytics_competency_desktop.png'),
    fullPage: false,
  })

  // SCREENSHOT 3: Subject Analytics Tab (Desktop 1440x900)
  console.log('3. Capturing learner_analytics_subjects_desktop.png...')
  const subjectTab = page.locator('button.nav-tab-btn:has-text("môn")').first()
  await subjectTab.click()
  await page.waitForTimeout(600)
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'learner_analytics_subjects_desktop.png'),
    fullPage: false,
  })

  // SCREENSHOT 4: Learning History Tab (Desktop 1440x900)
  console.log('4. Capturing learner_analytics_history_desktop.png...')
  const historyTab = page.locator('button.nav-tab-btn:has-text("Lịch sử")').first()
  await historyTab.click()
  await page.waitForTimeout(600)
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'learner_analytics_history_desktop.png'),
    fullPage: false,
  })

  // SCREENSHOT 5: Dashboard Entry Button (Desktop 1440x900)
  console.log('5. Capturing learner_dashboard_analytics_entry_desktop.png...')
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  await page.screenshot({
    path: path.join(INTERACTIONS_DIR, 'learner_dashboard_analytics_entry_desktop.png'),
    fullPage: false,
  })

  // SCREENSHOT 6: Mobile (390x844) View of Learning Analytics
  console.log('6. Capturing learner_analytics_mobile_390.png...')
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  })
  const mobilePage = await mobileContext.newPage()
  await mobilePage.goto(`${BASE_URL}/learning-analytics`, { waitUntil: 'networkidle' })
  await mobilePage.waitForTimeout(600)
  await mobilePage.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'learner_analytics_mobile_390.png'),
    fullPage: false,
  })
  await mobileContext.close()

  // SCREENSHOT 7: Teacher Workspace Student Analytics (Desktop 1440x900)
  console.log('7. Capturing teacher_student_analytics_desktop.png...')
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    localStorage.setItem(
      'study_ai_auth_user',
      JSON.stringify({
        id: 'teacher-demo-id',
        email: 'teacher@studyai.edu.vn',
        fullName: 'Thầy Nguyễn Văn Giáo',
        role: 'teacher',
      })
    )
  })
  await page.goto(`${BASE_URL}/teacher/students/stu-1`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  const teacherTab = page.locator('button.tab-btn:has-text("Phân tích học tập")').first()
  if (await teacherTab.isVisible()) {
    await teacherTab.click()
    await page.waitForTimeout(600)
  }
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'teacher_student_analytics_desktop.png'),
    fullPage: false,
  })

  await browser.close()
  console.log('=== ALL PHASE 7 VISUAL QA EVIDENCE CAPTURED SUCCESSFULLY ===')
}

run().catch((err) => {
  console.error('Phase 7 evidence capture failed:', err)
  process.exit(1)
})
