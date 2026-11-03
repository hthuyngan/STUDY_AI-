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
  console.log('=== STARTING PHASE 5 PLAYWRIGHT VISUAL QA & VERIFICATION ===')

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  })

  // Setup desktop context
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

    // Seed in-progress lesson with lastActiveSectionId
    const lessonProgressKey = 'study_ai.lesson_progress.v1'
    const progressData = {
      'lesson-math-01': {
        lessonId: 'lesson-math-01',
        subjectId: 'math',
        completedSectionIds: ['introduction'],
        contentProgress: 40,
        assessmentStatus: 'not-attempted',
        overallProgress: 40,
        updatedAt: new Date().toISOString(),
        lastActiveSectionId: 'formulas',
        lastActiveSectionTitle: 'Công thức trọng tâm',
      },
    }
    localStorage.setItem(lessonProgressKey, JSON.stringify(progressData))

    // Seed notes
    const notesKey = 'study_ai.study_notes.v1'
    const notesData = {
      version: 1,
      notes: [
        {
          id: 'note_demo_1',
          lessonId: 'lesson-math-01',
          subjectId: 'math',
          lessonTitle: 'Bài 01 · Sự đồng biến, nghịch biến của hàm số',
          subjectName: 'Toán học',
          sectionId: 'formulas',
          sectionTitle: 'Công thức trọng tâm',
          content: 'Lưu ý: f\'(x) >= 0 với mọi x thuộc K và f\'(x) = 0 chỉ tại hữu hạn điểm thì hàm số đồng biến trên K.',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'note_demo_2',
          lessonId: 'lesson-math-01',
          subjectId: 'math',
          lessonTitle: 'Bài 01 · Sự đồng biến, nghịch biến của hàm số',
          subjectName: 'Toán học',
          sectionId: 'definitions',
          sectionTitle: 'Khái niệm và Định nghĩa cơ bản',
          content: 'Ôn tập lại định lý Lagrange áp dụng cho hàm số liên tục trên [a, b].',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          updatedAt: new Date(Date.now() - 3600000).toISOString(),
        },
      ],
    }
    localStorage.setItem(notesKey, JSON.stringify(notesData))

    // Seed section bookmarks
    const bmKey = 'study_ai.section_bookmarks.v1'
    const bmData = {
      version: 1,
      bookmarks: [
        {
          id: 'bm_lesson-math-01_formulas',
          lessonId: 'lesson-math-01',
          subjectId: 'math',
          lessonTitle: 'Bài 01 · Sự đồng biến, nghịch biến của hàm số',
          subjectName: 'Toán học',
          sectionId: 'formulas',
          sectionTitle: 'Công thức trọng tâm',
          bookmarkedAt: new Date().toISOString(),
        },
      ],
    }
    localStorage.setItem(bmKey, JSON.stringify(bmData))
  })

  // SCREENSHOT 1: Dashboard with Continue Learning Card & Sổ tay link
  console.log('Capturing Dashboard Phase 5...')
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'learner_dashboard_phase5_desktop.png'),
    fullPage: false,
  })

  // SCREENSHOT 2: Learning Path with sequential subjects & recommendation
  console.log('Capturing Learning Path Page...')
  await page.goto(`${BASE_URL}/learning-path`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'learner_learning_path_phase5_desktop.png'),
    fullPage: false,
  })

  // SCREENSHOT 3: Lesson Page with LessonNotesPanel open (Desktop)
  console.log('Capturing Lesson Page with Notes Panel...')
  await page.goto(`${BASE_URL}/subjects/math/lessons/lesson-math-01`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)

  // Click "Ghi chú" button in header
  const notesBtn = page.getByRole('button', { name: /Ghi chú/i }).first()
  await notesBtn.click()
  await page.waitForTimeout(300)

  await page.screenshot({
    path: path.join(INTERACTIONS_DIR, 'learner_lesson_notes_panel_desktop.png'),
    fullPage: false,
  })

  // SCREENSHOT 4: Lesson Page with Bookmarks Tab in panel
  console.log('Capturing Lesson Page Bookmarks Tab...')
  const bookmarksTab = page.getByRole('tab', { name: /Đoạn lưu/i })
  await bookmarksTab.click()
  await page.waitForTimeout(300)

  await page.screenshot({
    path: path.join(INTERACTIONS_DIR, 'learner_lesson_bookmarks_panel_desktop.png'),
    fullPage: false,
  })

  // SCREENSHOT 5: Section Anchoring & Scroll Jump
  console.log('Capturing Lesson Page Section Anchoring (#formulas)...')
  await page.goto(`${BASE_URL}/subjects/math/lessons/lesson-math-01#formulas`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(700)
  await page.screenshot({
    path: path.join(INTERACTIONS_DIR, 'learner_lesson_section_anchoring_desktop.png'),
    fullPage: false,
  })

  // SCREENSHOT 6: Central My Notes Notebook Page (Desktop)
  console.log('Capturing My Notes Page...')
  await page.goto(`${BASE_URL}/my-notes`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'learner_my_notes_page_desktop.png'),
    fullPage: false,
  })

  // SCREENSHOT 7: Central My Notes Bookmarks Tab
  console.log('Capturing My Notes Bookmarks Tab...')
  const myNotesBookmarksTab = page.getByRole('tab', { name: /Đoạn lưu/i })
  await myNotesBookmarksTab.click()
  await page.waitForTimeout(300)
  await page.screenshot({
    path: path.join(INTERACTIONS_DIR, 'learner_my_notes_bookmarks_desktop.png'),
    fullPage: false,
  })

  // 8. Mobile Viewport 390x844
  console.log('Testing Mobile Viewport 390x844...')
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  })
  const mobilePage = await mobileContext.newPage()

  // Copy localstorage
  await mobilePage.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' })
  await mobilePage.evaluate(() => {
    localStorage.setItem(
      'study_ai_auth_user',
      JSON.stringify({
        id: 'student-demo-id',
        email: 'student@studyai.edu.vn',
        fullName: 'Nguyễn Văn Học Sinh',
        role: 'learner',
      })
    )
  })

  await mobilePage.goto(`${BASE_URL}/my-notes`, { waitUntil: 'networkidle' })
  await mobilePage.waitForTimeout(500)
  await mobilePage.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'learner_my_notes_mobile_390.png'),
    fullPage: false,
  })

  await mobilePage.goto(`${BASE_URL}/subjects/math/lessons/lesson-math-01`, { waitUntil: 'networkidle' })
  await mobilePage.waitForTimeout(500)

  // Open notes drawer on mobile via header button
  const mobileNotesBtn = mobilePage.getByRole('button', { name: /Ghi chú/i }).first()
  await mobileNotesBtn.click()
  await mobilePage.waitForTimeout(400)
  await mobilePage.screenshot({
    path: path.join(INTERACTIONS_DIR, 'learner_lesson_notes_mobile_390.png'),
    fullPage: false,
  })

  await browser.close()
  console.log('=== PLAYWRIGHT VISUAL QA COMPLETED SUCCESSFULLY ===')
}

run().catch((err) => {
  console.error('Playwright verification failed:', err)
  process.exit(1)
})

