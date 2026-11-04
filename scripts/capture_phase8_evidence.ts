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
  console.log('=== STARTING PHASE 8 PLAYWRIGHT VISUAL QA EVIDENCE CAPTURE ===')

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
    const userId = 'student-phase8-qa'
    localStorage.clear()
    localStorage.setItem(
      'study_ai_auth_user',
      JSON.stringify({
        id: userId,
        email: 'student.phase8@studyai.edu.vn',
        fullName: 'Nguyễn Văn Học Sinh Phase 8',
        role: 'learner',
      })
    )

    // Seed Notes
    const notesKey = 'study_ai.study_notes.v1'
    const notesData = {
      version: 1,
      notes: [
        {
          id: 'note-01',
          lessonId: 'lesson-math-08',
          subjectId: 'math',
          subjectName: 'Toán học',
          lessonTitle: 'Đạo hàm và Khảo sát hàm số',
          sectionId: 'definitions',
          sectionTitle: 'Khái niệm và Định nghĩa cơ bản',
          content: 'Đạo hàm tại điểm uốn y\'\'(x) = 0 và đổi dấu khi qua điểm uốn.',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          updatedAt: new Date(Date.now() - 86400000).toISOString(),
        },
      ],
    }
    localStorage.setItem(notesKey, JSON.stringify(notesData))

    // Seed Knowledge Gaps
    const gapsKey = 'study_ai.knowledge_gaps.v1'
    const gapsData = {
      version: 1,
      gaps: [
        {
          id: 'gap-math-01',
          subjectId: 'math',
          subjectName: 'Toán học',
          lessonId: 'lesson-math-08',
          lessonTitle: 'Đạo hàm và Khảo sát hàm số',
          sectionId: 'definitions',
          sectionTitle: 'Khái niệm và Định nghĩa cơ bản',
          knowledgePointId: 'kp-inflection',
          title: 'Điểm uốn của đồ thị hàm số bậc 3',
          questionPrompt: 'Điểm uốn của hàm số y = ax^3 + bx^2 + cx + d xảy ra khi nào?',
          explanation: 'Điều kiện cần và đủ là đạo hàm cấp hai y\'\'(x) = 0 và đổi dấu khi qua điểm đó.',
          severity: 'medium',
          source: 'assessment_attempt',
          wrongAttemptsCount: 2,
          correctReviewCount: 0,
          status: 'needs-review',
          lastDetectedAt: new Date().toISOString(),
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    }
    localStorage.setItem(gapsKey, JSON.stringify(gapsData))

    // Seed Lesson Progress (80% reading complete)
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

    // Seed Initial Contextual Conversation
    const convs = [
      {
        id: 'conv-p8-01',
        title: 'Đạo hàm cực trị & tiếp tuyến',
        subject: 'toan-12',
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString(),
        assistanceMode: 'explain',
        learningContext: {
          source: 'lesson-section',
          subjectId: 'math',
          subjectName: 'Toán học',
          lessonId: 'lesson-math-08',
          lessonTitle: 'Đạo hàm và Khảo sát hàm số',
          sectionId: 'definitions',
          sectionTitle: 'Khái niệm và Định nghĩa cơ bản',
          title: 'Khái niệm và Định nghĩa cơ bản',
          returnUrl: '/subjects/math/lessons/lesson-math-08',
        },
        messages: [
          {
            id: 'msg-u1',
            role: 'user',
            content: 'Giải thích giúp em bản chất đạo hàm bằng 0 tại cực trị',
            createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
            status: 'done',
            assistanceMode: 'explain',
          },
          {
            id: 'msg-a1',
            role: 'assistant',
            content: `> **[Bản mô phỏng AI Tutor · Trải nghiệm học tập có ngữ cảnh]**

### 💡 Giải thích bản chất cực trị hàm số:

Theo định lý Fermat, nếu hàm số $f(x)$ có đạo hàm tại $x_0$ và đạt cực trị tại $x_0$, thì:
$$f'(x_0) = 0$$

1. **Ý nghĩa hình học:**
   Đạo hàm $f'(x_0)$ là hệ số góc tiếp tuyến. Tại đỉnh cực đại hoặc đáy cực tiểu, đồ thị đổi chiều biến thiên, do đó tiếp tuyến nằm ngang song song trục $Ox$ (hệ số góc $k = 0$).

2. **Công thức đạo hàm bậc nhất:**
   $$f'(x) = \\lim_{\\Delta x \\to 0} \\frac{f(x + \\Delta x) - f(x)}{\\Delta x}$$

3. **Lưu ý quan trọng:**
   Điều kiện $f'(x_0) = 0$ là điều kiện cần chứ chưa đủ. Điểm $x_0$ là cực trị khi và chỉ khi $f'(x)$ đổi dấu khi qua $x_0$.`,
            createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
            status: 'done',
            assistanceMode: 'explain',
            learningContextSnapshot: {
              source: 'lesson-section',
              subjectName: 'Toán học',
              title: 'Khái niệm và Định nghĩa cơ bản',
            },
          },
        ],
      },
    ]

    localStorage.setItem('study_ai.ai_conversations.v1', JSON.stringify(convs))
    localStorage.setItem(`study_ai.${userId}.ai_conversations.v2`, JSON.stringify(convs))
  })

  // SCREENSHOT 1: General Chat View (Desktop 1440x900)
  console.log('1. Capturing learner_ai_tutor_general_chat_desktop.png...')
  await page.goto(`${BASE_URL}/ai-tutor`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'learner_ai_tutor_general_chat_desktop.png'),
    fullPage: false,
  })

  // SCREENSHOT 2: With Lesson Context Banner (Desktop 1440x900)
  console.log('2. Capturing learner_ai_tutor_lesson_context_desktop.png...')
  await page.evaluate(() => {
    sessionStorage.setItem(
      'study_ai.pending_learning_context.v1',
      JSON.stringify({
        source: 'lesson-section',
        subjectId: 'math',
        subjectName: 'Toán học',
        lessonId: 'lesson-math-08',
        lessonTitle: 'Đạo hàm và Khảo sát hàm số',
        sectionId: 'definitions',
        sectionTitle: 'Khái niệm và Định nghĩa cơ bản',
        title: 'Khái niệm và Định nghĩa cơ bản',
        excerpt: 'Đạo hàm tại điểm uốn đồ thị đổi chiều lồi lõm...',
        returnUrl: '/subjects/math/lessons/lesson-math-08',
      })
    )
  })
  await page.goto(`${BASE_URL}/ai-tutor`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'learner_ai_tutor_lesson_context_desktop.png'),
    fullPage: false,
  })

  // SCREENSHOT 3: Hint Mode Active (Desktop 1440x900)
  console.log('3. Capturing learner_ai_tutor_hint_mode_desktop.png...')
  const hintRadio = page.locator('button.mode-pill-btn:has-text("Gợi ý")').first()
  await hintRadio.click()
  await page.waitForTimeout(500)
  const submitBtn = page.locator('button[type="submit"].composer-submit-btn').first()
  await submitBtn.click()
  // Wait for simulated streaming to finish
  await page.waitForTimeout(1600)
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'learner_ai_tutor_hint_mode_desktop.png'),
    fullPage: false,
  })

  // SCREENSHOT 4: Step-by-Step Mode Active (Desktop 1440x900)
  console.log('4. Capturing learner_ai_tutor_step_by_step_desktop.png...')
  const stepRadio = page.locator('button.mode-pill-btn:has-text("Từng bước")').first()
  await stepRadio.click()
  await page.waitForTimeout(500)
  const textarea = page.locator('textarea.composer-textarea').first()
  await textarea.fill('Hướng dẫn giải từng bước dạng toán đạo hàm hàm hợp')
  await page.locator('button[type="submit"].composer-submit-btn').first().click()
  await page.waitForTimeout(1800)
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'learner_ai_tutor_step_by_step_desktop.png'),
    fullPage: false,
  })

  // SCREENSHOT 5: LaTeX Response Display (Desktop 1440x900)
  console.log('5. Capturing learner_ai_tutor_latex_response_desktop.png...')
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'learner_ai_tutor_latex_response_desktop.png'),
    fullPage: false,
  })

  // SCREENSHOT 6: Conversation History With Context in Sidebar (Desktop 1440x900)
  console.log('6. Capturing learner_ai_tutor_conversation_history_desktop.png...')
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'learner_ai_tutor_conversation_history_desktop.png'),
    fullPage: false,
  })

  // SCREENSHOT 7: Lesson page with "Hỏi AI" button (Desktop 1440x900)
  console.log('7. Capturing learner_lesson_to_ai_tutor_desktop.png...')
  await page.goto(`${BASE_URL}/subjects/math/lessons/lesson-math-08`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(700)
  await page.screenshot({
    path: path.join(INTERACTIONS_DIR, 'learner_lesson_to_ai_tutor_desktop.png'),
    fullPage: false,
  })

  // SCREENSHOT 8: Knowledge Gaps with "Nhờ AI giải thích" button (Desktop 1440x900)
  console.log('8. Capturing learner_gap_to_ai_tutor_desktop.png...')
  await page.goto(`${BASE_URL}/knowledge-gaps`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(700)
  await page.screenshot({
    path: path.join(INTERACTIONS_DIR, 'learner_gap_to_ai_tutor_desktop.png'),
    fullPage: false,
  })

  // SCREENSHOT 9: My Notes with "Hỏi AI" button (Desktop 1440x900)
  console.log('9. Capturing learner_note_to_ai_tutor_desktop.png...')
  await page.goto(`${BASE_URL}/notes`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(700)
  await page.screenshot({
    path: path.join(INTERACTIONS_DIR, 'learner_note_to_ai_tutor_desktop.png'),
    fullPage: false,
  })

  // SCREENSHOT 10 & 11: Mobile (390x844) View of AI Tutor & Long Equation
  console.log('10. Capturing learner_ai_tutor_mobile_390.png...')
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  })
  const mobilePage = await mobileContext.newPage()
  await mobilePage.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' })
  await mobilePage.evaluate(() => {
    localStorage.setItem(
      'study_ai_auth_user',
      JSON.stringify({
        id: 'student-phase8-qa',
        email: 'student.phase8@studyai.edu.vn',
        fullName: 'Nguyễn Văn Học Sinh Phase 8',
        role: 'learner',
      })
    )
  })
  await mobilePage.goto(`${BASE_URL}/ai-tutor`, { waitUntil: 'networkidle' })
  await mobilePage.waitForTimeout(800)
  await mobilePage.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'learner_ai_tutor_mobile_390.png'),
    fullPage: false,
  })

  console.log('11. Capturing learner_ai_tutor_long_equation_mobile_390.png...')
  // Select first conversation that has math equation and scroll to equation
  const firstConv = mobilePage.locator('.assistant-message-row').first()
  if (await firstConv.isVisible()) {
    await firstConv.scrollIntoViewIfNeeded()
    await mobilePage.waitForTimeout(400)
  }
  await mobilePage.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'learner_ai_tutor_long_equation_mobile_390.png'),
    fullPage: false,
  })
  await mobileContext.close()

  await browser.close()
  console.log('=== ALL PHASE 8 VISUAL QA EVIDENCE CAPTURED SUCCESSFULLY ===')
}

run().catch((err) => {
  console.error('Phase 8 evidence capture failed:', err)
  process.exit(1)
})
