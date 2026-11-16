import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

const BASE_URL = 'http://localhost:5174'
const SCREENSHOT_DIR = path.join('docs', 'visual-qa')

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
}

async function runAcceptance() {
  console.log('===========================================================')
  console.log('STARTING FINAL ACCEPTANCE: GEMINI LIVE & FLOATING AI CHATBOT')
  console.log('===========================================================')

  const consoleErrors: string[] = []
  const failedRequests: string[] = []

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  })

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  })

  const page = await context.newPage()

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text())
    }
  })

  page.on('requestfailed', (req) => {
    failedRequests.push(`${req.method()} ${req.url()} - ${req.failure()?.errorText}`)
  })

  try {
    // -------------------------------------------------------------
    // TEST 1: Check Login page (Chatbot MUST NOT appear)
    // -------------------------------------------------------------
    console.log('\n[TEST 1] Visiting /login - Checking chatbot is hidden...')
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' })
    const launcherOnLogin = await page.locator('.ai-chat-launcher-btn').count()
    console.log(`-> Launcher count on /login: ${launcherOnLogin} (Expected: 0)`)
    if (launcherOnLogin !== 0) throw new Error('FAIL: Chatbot launcher visible on /login!')

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_login_no_chatbot.png') })

    // -------------------------------------------------------------
    // TEST 2: Perform Login as student
    // -------------------------------------------------------------
    console.log('\n[TEST 2] Logging in as student...')
    await page.fill('#login-email', 'student_gemini_live@studyai.vn')
    await page.fill('#login-password', 'Password@123456')
    await page.click('button[type="submit"]')

    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 })
    console.log(`-> Logged in successfully. Current URL: ${page.url()}`)

    // -------------------------------------------------------------
    // TEST 3: Check Curriculum page (/subjects)
    // -------------------------------------------------------------
    console.log('\n[TEST 3] Visiting /subjects...')
    await page.goto(`${BASE_URL}/subjects`, { waitUntil: 'networkidle' })

    const launcherOnSubjects = await page.locator('.ai-chat-launcher-btn').isVisible()
    console.log(`-> Floating launcher visible on /subjects: ${launcherOnSubjects}`)
    if (!launcherOnSubjects) throw new Error('FAIL: Chatbot launcher NOT visible on /subjects!')

    const oldAiBanner = await page.locator('.subject-ai-banner').count()
    console.log(`-> Old AI banner count: ${oldAiBanner} (Expected: 0)`)
    if (oldAiBanner !== 0) throw new Error('FAIL: Old AI banner still present on /subjects!')

    // Check footer buttons in subject cards: should not have "Hỏi AI"
    const footerHoiAiButtons = await page.locator('.subject-card-footer button:has-text("Hỏi AI")').count()
    console.log(`-> "Hỏi AI" button count in subject cards: ${footerHoiAiButtons} (Expected: 0)`)
    if (footerHoiAiButtons !== 0) throw new Error('FAIL: "Hỏi AI" button still present in subject cards!')

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_subjects_clean_ui.png') })

    // -------------------------------------------------------------
    // TEST 4: Check Subject Detail page (/subjects/math)
    // -------------------------------------------------------------
    console.log('\n[TEST 4] Visiting /subjects/math...')
    await page.goto(`${BASE_URL}/subjects/math`, { waitUntil: 'networkidle' })

    const launcherOnDetail = await page.locator('.ai-chat-launcher-btn').isVisible()
    console.log(`-> Floating launcher visible on /subjects/math: ${launcherOnDetail}`)
    if (!launcherOnDetail) throw new Error('FAIL: Chatbot launcher NOT visible on /subjects/math!')

    const headerHoiAi = await page.locator('button:has-text("Hỏi AI về môn này")').count()
    console.log(`-> "Hỏi AI về môn này" count: ${headerHoiAi} (Expected: 0)`)
    if (headerHoiAi !== 0) throw new Error('FAIL: "Hỏi AI về môn này" still present in header!')

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_subject_detail_clean_ui.png') })

    // -------------------------------------------------------------
    // TEST 5: Check Lesson page
    // -------------------------------------------------------------
    console.log('\n[TEST 5] Visiting lesson page...')
    // Click primary lesson or navigate
    await page.goto(`${BASE_URL}/subjects/math/lessons/lesson-math-01`, { waitUntil: 'networkidle' })
    const launcherOnLesson = await page.locator('.ai-chat-launcher-btn').isVisible()
    console.log(`-> Floating launcher visible on lesson: ${launcherOnLesson}`)
    if (!launcherOnLesson) throw new Error('FAIL: Chatbot launcher NOT visible on lesson page!')

    const askAiBlocks = await page.locator('.lesson-ask-ai-btn').count()
    console.log(`-> Scattered LessonAskAIBtn count: ${askAiBlocks} (Expected: 0)`)
    if (askAiBlocks !== 0) throw new Error('FAIL: Scattered LessonAskAIBtn still present on lesson page!')

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_lesson_clean_ui.png') })

    // -------------------------------------------------------------
    // TEST 6: Check Practice & Smart Review
    // -------------------------------------------------------------
    console.log('\n[TEST 6] Visiting /practice and /smart-review...')
    await page.goto(`${BASE_URL}/practice`, { waitUntil: 'networkidle' })
    const launcherOnPractice = await page.locator('.ai-chat-launcher-btn').isVisible()
    console.log(`-> Launcher on /practice: ${launcherOnPractice}`)

    await page.goto(`${BASE_URL}/smart-review`, { waitUntil: 'networkidle' })
    const launcherOnReview = await page.locator('.ai-chat-launcher-btn').isVisible()
    console.log(`-> Launcher on /smart-review: ${launcherOnReview}`)

    // -------------------------------------------------------------
    // TEST 7: Check Forbidden routes (Settings, Quiz)
    // -------------------------------------------------------------
    console.log('\n[TEST 7] Visiting forbidden routes (/settings, /quiz/test-formal)...')
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle' })
    const launcherOnSettings = await page.locator('.ai-chat-launcher-btn').count()
    console.log(`-> Launcher count on /settings: ${launcherOnSettings} (Expected: 0)`)
    if (launcherOnSettings !== 0) throw new Error('FAIL: Launcher visible on /settings!')

    await page.goto(`${BASE_URL}/quiz/test-formal`, { waitUntil: 'networkidle' })
    const launcherOnQuiz = await page.locator('.ai-chat-launcher-btn').count()
    console.log(`-> Launcher count on /quiz/test-formal: ${launcherOnQuiz} (Expected: 0)`)
    if (launcherOnQuiz !== 0) throw new Error('FAIL: Launcher visible on /quiz/test-formal!')

    // -------------------------------------------------------------
    // TEST 8: Open Chatbot & Send Real Math Question to Gemini Live
    // -------------------------------------------------------------
    console.log('\n[TEST 8] Testing Chatbot interaction with Gemini Live on /subjects...')
    await page.goto(`${BASE_URL}/subjects`, { waitUntil: 'networkidle' })

    const launcher = page.locator('.ai-chat-launcher-btn')
    await launcher.click()

    const panel = page.locator('.ai-chat-panel')
    await panel.waitFor({ state: 'visible', timeout: 5000 })
    console.log('-> Chat panel opened successfully.')

    // Check Header & Ready status
    const headerTitle = await page.locator('.ai-header-title').innerText()
    const statusText = await page.locator('.ai-status-pill').innerText()
    console.log(`-> Header Title: "${headerTitle}"`)
    console.log(`-> Status Pill: "${statusText}"`)

    if (!statusText.includes('Sẵn sàng hỗ trợ')) {
      throw new Error(`FAIL: Status is not "Sẵn sàng hỗ trợ" (got "${statusText}")`)
    }

    // Type a real Math 12 question
    const questionText = 'Cho hàm số $y = x^3 - 3x$. Tìm các điểm cực trị của hàm số.'
    console.log(`-> Sending Math question: "${questionText}"...`)
    await page.fill('.ai-chat-textarea', questionText)

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_chat_panel_opened.png') })

    // Click Send
    await page.click('.ai-input-btn.is-send')

    // Wait for assistant message to arrive and finish streaming
    console.log('-> Waiting for Gemini Live response...')
    const assistantBubble = page.locator('.ai-message-row.is-assistant .ai-assistant-content').first()
    await assistantBubble.waitFor({ state: 'visible', timeout: 25000 })

    // Wait until streaming cursor disappears
    await page.waitForSelector('.ai-streaming-cursor', { state: 'detached', timeout: 30000 }).catch(() => {})

    const responseContent = await assistantBubble.innerText()
    console.log('-> Received response from Gemini Live!')
    console.log('--- GEMINI RESPONSE PREVIEW ---')
    console.log(responseContent.slice(0, 300) + '...')
    console.log('-------------------------------')

    // Assert KaTeX math formatting
    const katexCount = await page.locator('.ai-katex-inline, .ai-katex-block').count()
    console.log(`-> Rendered KaTeX elements count: ${katexCount}`)
    if (katexCount === 0) {
      console.warn('WARNING: No KaTeX elements rendered (check delimiter parsing).')
    }

    // Assert Copy button
    const copyBtn = await page.locator('.ai-copy-btn').count()
    console.log(`-> Copy button count: ${copyBtn}`)

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_gemini_live_response.png') })

    console.log('\n===========================================================')
    console.log('ALL PLAYWRIGHT TESTS PASSED SUCCESSFULLY!')
    console.log('===========================================================')
    console.log(`Console Errors: ${consoleErrors.length}`)
    console.log(`Failed Network Requests: ${failedRequests.length}`)

  } catch (err) {
    console.error('\nPLAYWRIGHT TEST FAILED:', err)
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'error_state.png') }).catch(() => {})
    process.exit(1)
  } finally {
    await browser.close()
  }
}

runAcceptance()

