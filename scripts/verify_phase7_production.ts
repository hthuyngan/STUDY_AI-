import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

const PROD_URL = 'https://hthuyngan.github.io/STUDY_AI-'
const SCREENSHOTS_DIR = path.join('docs', 'visual-qa', 'screenshots')

for (const dir of [SCREENSHOTS_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

async function run() {
  console.log('=== STARTING PRODUCTION ACCEPTANCE FOR PHASE 7 ===')
  console.log(`Target: ${PROD_URL}`)

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  })

  // Desktop context
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  })
  const page = await context.newPage()

  console.log('1. Loading production root...')
  await page.goto(`${PROD_URL}/`, { waitUntil: 'networkidle' })

  await page.evaluate(() => {
    const userId = 'student-prod-phase7'
    localStorage.clear()
    localStorage.setItem(
      'study_ai_auth_user',
      JSON.stringify({
        id: userId,
        email: 'student.phase7@studyai.edu.vn',
        fullName: 'Nguyễn Văn Học Sinh Phase 7',
        role: 'learner',
      })
    )

    // Knowledge Gaps
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
      ],
    }
    localStorage.setItem('study_ai.knowledge_gaps.v1', JSON.stringify(gapsData))

    // Harvest Assessments
    const attempts = [
      { attemptId: 'att-math-01', lessonId: 'les-math-12-01', score: 85, totalQuestions: 10, correctCount: 8, passed: true, completedAt: new Date(Date.now() - 86400000 * 4).toISOString() },
      { attemptId: 'att-math-02', lessonId: 'les-math-12-02', score: 90, totalQuestions: 10, correctCount: 9, passed: true, completedAt: new Date(Date.now() - 86400000 * 2).toISOString() },
      { attemptId: 'att-phys-01', lessonId: 'les-phys-12-01', score: 75, totalQuestions: 8, correctCount: 6, passed: true, completedAt: new Date(Date.now() - 86400000 * 3).toISOString() },
      { attemptId: 'att-chem-01', lessonId: 'les-chem-12-01', score: 60, totalQuestions: 10, correctCount: 6, passed: false, completedAt: new Date(Date.now() - 86400000).toISOString() },
      { attemptId: 'att-eng-01', lessonId: 'les-eng-12-01', score: 95, totalQuestions: 10, correctCount: 9, passed: true, completedAt: new Date().toISOString() },
    ]
    localStorage.setItem('study_ai.assessment_attempts.v1', JSON.stringify(attempts))
    localStorage.setItem('study_ai.learning_attempts.v1', JSON.stringify(attempts))
    localStorage.setItem('study_ai.' + userId + '.assessment_attempts.v2', JSON.stringify(attempts))

    // Lesson Progress
    const progressData = {
      'les-math-12-01': { lessonId: 'les-math-12-01', subjectId: 'toan-hoc', progressPercent: 100, completed: true, completedSections: ['s1', 's2'], lastAccessedAt: new Date().toISOString() },
      'les-math-12-02': { lessonId: 'les-math-12-02', subjectId: 'toan-hoc', progressPercent: 100, completed: true, completedSections: ['s1'], lastAccessedAt: new Date().toISOString() },
      'les-phys-12-01': { lessonId: 'les-phys-12-01', subjectId: 'vat-ly', progressPercent: 100, completed: true, completedSections: ['s1'], lastAccessedAt: new Date().toISOString() },
      'les-chem-12-01': { lessonId: 'les-chem-12-01', subjectId: 'hoa-hoc', progressPercent: 80, completed: false, completedSections: ['s1'], lastAccessedAt: new Date().toISOString() },
      'les-eng-12-01': { lessonId: 'les-eng-12-01', subjectId: 'tieng-anh', progressPercent: 100, completed: true, completedSections: ['s1'], lastAccessedAt: new Date().toISOString() },
    }
    localStorage.setItem('study_ai.lesson_progress.v1', JSON.stringify(progressData))
    localStorage.setItem('study_ai.' + userId + '.lesson_progress.v2', JSON.stringify(progressData))

    // Learning Events
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

  // 1. Prod Overview
  console.log('2. Navigating to production /learning-analytics...')
  await page.goto(`${PROD_URL}/learning-analytics`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'prod_phase7_overview_desktop.png'),
    fullPage: false,
  })
  console.log('Saved prod_phase7_overview_desktop.png')

  // 2. Prod Competency Tab
  console.log('3. Clicking Competency Profile tab on production...')
  const competencyTab = page.locator('button.nav-tab-btn:has-text("Hồ sơ năng lực")').first()
  await competencyTab.click()
  await page.waitForTimeout(800)
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'prod_phase7_competency_desktop.png'),
    fullPage: false,
  })
  console.log('Saved prod_phase7_competency_desktop.png')

  // 3. Prod Subject Tab
  console.log('4. Clicking Subject Analytics tab on production...')
  const subjectTab = page.locator('button.nav-tab-btn:has-text("môn")').first()
  await subjectTab.click()
  await page.waitForTimeout(800)
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'prod_phase7_subjects_desktop.png'),
    fullPage: false,
  })
  console.log('Saved prod_phase7_subjects_desktop.png')

  // 4. Prod History Tab
  console.log('5. Clicking Learning History tab on production...')
  const historyTab = page.locator('button.nav-tab-btn:has-text("Lịch sử")').first()
  await historyTab.click()
  await page.waitForTimeout(800)
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'prod_phase7_history_desktop.png'),
    fullPage: false,
  })
  console.log('Saved prod_phase7_history_desktop.png')

  // 5. Prod Mobile
  console.log('6. Testing mobile view on production...')
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  })
  const mobilePage = await mobileContext.newPage()
  await mobilePage.goto(`${PROD_URL}/`, { waitUntil: 'domcontentloaded' })
  await mobilePage.evaluate(() => {
    localStorage.setItem(
      'study_ai_auth_user',
      JSON.stringify({
        id: 'student-prod-phase7',
        email: 'student.phase7@studyai.edu.vn',
        fullName: 'Nguyễn Văn Học Sinh Phase 7',
        role: 'learner',
      })
    )
  })
  await mobilePage.goto(`${PROD_URL}/learning-analytics`, { waitUntil: 'networkidle' })
  await mobilePage.waitForTimeout(1000)
  await mobilePage.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'prod_phase7_mobile_390.png'),
    fullPage: false,
  })
  await mobileContext.close()
  console.log('Saved prod_phase7_mobile_390.png')

  // 6. Prod Teacher Student Analytics
  console.log('7. Testing Teacher Student Analytics on production...')
  await page.goto(`${PROD_URL}/`, { waitUntil: 'domcontentloaded' })
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
  await page.goto(`${PROD_URL}/teacher/students/stu-1`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  const teacherTab = page.locator('button.tab-btn:has-text("Phân tích học tập")').first()
  if (await teacherTab.isVisible()) {
    await teacherTab.click()
    await page.waitForTimeout(800)
  }
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'prod_phase7_teacher_analytics_desktop.png'),
    fullPage: false,
  })
  console.log('Saved prod_phase7_teacher_analytics_desktop.png')

  await browser.close()
  console.log('=== PRODUCTION ACCEPTANCE FOR PHASE 7 COMPLETED SUCCESSFULLY ===')
}

run().catch((err) => {
  console.error('Production verification failed:', err)
  process.exit(1)
})
