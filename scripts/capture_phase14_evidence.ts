import { chromium } from 'playwright'
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'

const PORT = 4179
const BASE_URL = `http://localhost:${PORT}`
const PHASE14_DIR = path.join('docs', 'visual-qa', 'phase-14')

if (!fs.existsSync(PHASE14_DIR)) {
  fs.mkdirSync(PHASE14_DIR, { recursive: true })
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
  console.log('=== STARTING PHASE 14 FULL-STACK PLAYWRIGHT CAPTURE ===')

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

    // 1. Initial Empty State (Honest Zero Mock State)
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' })
    await page.evaluate(() => {
      localStorage.setItem('study_ai_auth_user', JSON.stringify({
        id: 'student-phase14',
        name: 'Học sinh Nguyễn Văn An',
        email: 'an.nguyen@student.studyai.vn',
        role: 'student',
      }))
      localStorage.removeItem('study_ai_practice_sessions_v1')
      localStorage.removeItem('study_ai_practice_results_v1')
    })

    // Shot 1: Analytics Empty State Desktop
    console.log('Capturing 01-analytics-honest-empty-state-desktop.png...')
    await page.goto(`${BASE_URL}/analytics`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    await page.screenshot({
      path: path.join(PHASE14_DIR, '01-analytics-honest-empty-state-desktop.png'),
      fullPage: true,
    })

    // 2. Inject Verified Authentic Results for Evidence Sufficiency Display
    console.log('Injecting authentic PracticeResult data to verify Evidence Sufficiency UI...')
    await page.evaluate(() => {
      const mockResult1 = {
        id: 'res-p14-01',
        sessionId: 'sess-p14-01',
        subjectId: 'math',
        chapterId: 'chap-math-12-01',
        lessonId: 'lesson-math-12-01',
        totalQuestions: 5,
        correctCount: 4,
        partialCount: 0,
        incorrectCount: 1,
        unansweredCount: 0,
        earnedPoints: 4,
        maxPoints: 5,
        percentage: 80,
        submittedAt: '2026-11-07T10:00:00.000Z',
        durationSeconds: 300,
        scoringVersion: 'GDPT_2018_V1',
        questionResults: [
          {
            questionId: 'math-12-c1-mc-01',
            questionType: 'multiple_choice',
            difficulty: 'easy',
            cognitiveLevel: 'recognition',
            skillIds: ['math-12-sk-01'],
            stem: 'Cho hàm số y = f(x) có bảng xét dấu đạo hàm...',
            explanation: 'f\'(x) > 0 trên khoảng (-1; 2)',
            studentAnswer: 'B',
            correctAnswerDisplay: 'B',
            isFullyCorrect: true,
            isPartiallyCorrect: false,
            isUnanswered: false,
            earnedPoints: 1,
            maxPoints: 1,
          },
          {
            questionId: 'math-12-c1-mc-02',
            questionType: 'multiple_choice',
            difficulty: 'medium',
            cognitiveLevel: 'comprehension',
            skillIds: ['math-12-sk-01'],
            stem: 'Hàm số y = x^3 - 3x^2 + 2 nghịch biến trên khoảng nào?',
            explanation: 'y\' = 3x^2 - 6x < 0 <=> 0 < x < 2',
            studentAnswer: 'A',
            correctAnswerDisplay: 'A',
            isFullyCorrect: true,
            isPartiallyCorrect: false,
            isUnanswered: false,
            earnedPoints: 1,
            maxPoints: 1,
          },
          {
            questionId: 'math-12-c1-mc-03',
            questionType: 'multiple_choice',
            difficulty: 'medium',
            cognitiveLevel: 'comprehension',
            skillIds: ['math-12-sk-02'],
            stem: 'Điểm cực đại của hàm số y = -x^3 + 3x - 1 là:',
            explanation: 'x = 1',
            studentAnswer: 'B',
            correctAnswerDisplay: 'C',
            isFullyCorrect: false,
            isPartiallyCorrect: false,
            isUnanswered: false,
            earnedPoints: 0,
            maxPoints: 1,
          },
          {
            questionId: 'math-12-c1-mc-04',
            questionType: 'multiple_choice',
            difficulty: 'medium',
            cognitiveLevel: 'comprehension',
            skillIds: ['math-12-sk-02'],
            stem: 'Hàm số y = x^4 - 2x^2 + 3 có bao nhiêu điểm cực trị?',
            explanation: 'Có 3 điểm cực trị',
            studentAnswer: 'C',
            correctAnswerDisplay: 'C',
            isFullyCorrect: true,
            isPartiallyCorrect: false,
            isUnanswered: false,
            earnedPoints: 1,
            maxPoints: 1,
          },
          {
            questionId: 'math-12-c1-mc-05',
            questionType: 'multiple_choice',
            difficulty: 'hard',
            cognitiveLevel: 'application',
            skillIds: ['math-12-sk-01'],
            stem: 'Tìm tất cả giá trị thực của tham số m...',
            explanation: 'm >= 3',
            studentAnswer: 'D',
            correctAnswerDisplay: 'D',
            isFullyCorrect: true,
            isPartiallyCorrect: false,
            isUnanswered: false,
            earnedPoints: 1,
            maxPoints: 1,
          },
        ],
        skillBreakdown: [],
      }

      const mockResult2 = {
        ...mockResult1,
        id: 'res-p14-02',
        sessionId: 'sess-p14-02',
        submittedAt: '2026-11-07T11:00:00.000Z',
      }

      localStorage.setItem('study_ai_practice_results_v1', JSON.stringify([mockResult1, mockResult2]))
    })

    // Shot 2: Evidence Sufficiency View Desktop
    console.log('Capturing 02-analytics-evidence-sufficiency-desktop.png...')
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    await page.screenshot({
      path: path.join(PHASE14_DIR, '02-analytics-evidence-sufficiency-desktop.png'),
      fullPage: true,
    })

    // Shot 3: Mobile Viewport 390x844
    console.log('Capturing 03-analytics-mobile-390px.png...')
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
    })
    const mobilePage = await mobileContext.newPage()
    await mobilePage.goto(`${BASE_URL}/analytics`, { waitUntil: 'domcontentloaded' })
    await mobilePage.evaluate(() => {
      localStorage.setItem('study_ai_auth_user', JSON.stringify({
        id: 'student-phase14',
        name: 'Học sinh Nguyễn Văn An',
        email: 'an.nguyen@student.studyai.vn',
        role: 'student',
      }))
    })
    await mobilePage.reload({ waitUntil: 'networkidle' })
    await mobilePage.waitForTimeout(1000)
    await mobilePage.screenshot({
      path: path.join(PHASE14_DIR, '03-analytics-mobile-390px.png'),
      fullPage: true,
    })

    // Shot 4: Question Bank Page Desktop
    console.log('Capturing 04-question-bank-approved-desktop.png...')
    await page.goto(`${BASE_URL}/question-bank`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    await page.screenshot({
      path: path.join(PHASE14_DIR, '04-question-bank-approved-desktop.png'),
      fullPage: true,
    })

    // Shot 5: Admin Workspace Shell Desktop (RBAC)
    console.log('Capturing 05-admin-workspace-desktop.png...')
    await page.evaluate(() => {
      localStorage.setItem('study_ai_auth_user', JSON.stringify({
        id: 'admin-phase14',
        name: 'Quản trị viên Hệ thống',
        email: 'admin@studyai.vn',
        role: 'admin',
      }))
    })
    await page.goto(`${BASE_URL}/admin/dashboard`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    await page.screenshot({
      path: path.join(PHASE14_DIR, '05-admin-workspace-desktop.png'),
      fullPage: true,
    })

    await browser.close()
    console.log('=== PLAYWRIGHT QA CAPTURE COMPLETED SUCCESSFULLY ===')
  } finally {
    preview.kill()
  }
}

run().catch((err) => {
  console.error('Capture failed:', err)
  process.exit(1)
})
