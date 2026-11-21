import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

const BASE_URL = 'http://localhost:5174'
const SCREENSHOT_DIR = path.join('docs', 'visual-qa')

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
}

async function runLessonRedesignAcceptance() {
  console.log('====================================================================')
  console.log('STARTING E2E ACCEPTANCE: LESSON REDESIGN & UNIFIED CONTEXTUAL AI')
  console.log('====================================================================')

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
    // 1. Check Sidebar: "AI Tutor" item MUST NOT exist in navigation
    // -------------------------------------------------------------
    console.log('\n[TEST 1] Visiting /subjects - Verifying Sidebar navigation...')
    await page.goto(`${BASE_URL}/subjects`, { waitUntil: 'networkidle' })

    const sidebarAiTutor = await page.locator('.sidebar-nav-link:has-text("AI Tutor")').count()
    console.log(`-> Sidebar "AI Tutor" item count: ${sidebarAiTutor} (Expected: 0)`)
    if (sidebarAiTutor !== 0) throw new Error('FAIL: AI Tutor link is still present in Sidebar!')

    // -------------------------------------------------------------
    // 2. Check Route /ai-tutor: Must redirect smoothly to /subjects
    // -------------------------------------------------------------
    console.log('\n[TEST 2] Visiting legacy /ai-tutor route...')
    await page.goto(`${BASE_URL}/ai-tutor`, { waitUntil: 'networkidle' })
    const currentUrl = page.url()
    console.log(`-> After visiting /ai-tutor, navigated to: ${currentUrl}`)
    if (!currentUrl.includes('/subjects')) {
      throw new Error(`FAIL: /ai-tutor did not redirect to /subjects! Got: ${currentUrl}`)
    }

    // -------------------------------------------------------------
    // 3. Visit Lesson Page: Check Layout structure (Video + Unified Overview)
    // -------------------------------------------------------------
    console.log('\n[TEST 3] Visiting Lesson page /subjects/sub_math12/lessons/les_math12_c1_b1...')
    await page.goto(`${BASE_URL}/subjects/sub_math12/lessons/les_math12_c1_b1`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    // Check elimination of old 5 tabs
    const tabNavCount = await page.locator('.lesson-tabs-nav').count()
    console.log(`-> Old .lesson-tabs-nav count: ${tabNavCount} (Expected: 0)`)
    if (tabNavCount !== 0) throw new Error('FAIL: Old lesson tabs navigation still exists!')

    // Check Video area
    const videoSection = page.locator('.lesson-video-container, .lesson-video-unavailable')
    const hasVideo = await videoSection.first().isVisible()
    console.log(`-> Video area present: ${hasVideo}`)
    if (!hasVideo) throw new Error('FAIL: Video area not found on lesson page!')

    // Check Video "Hỏi AI Tutor" button
    const videoAiBtn = page.locator('.lesson-video-container .btn-ask-ai-contextual, .lesson-video-unavailable .btn-ask-ai-contextual').first()
    const hasVideoAiBtn = await videoAiBtn.isVisible()
    console.log(`-> Video card "Hỏi AI Tutor" button visible: ${hasVideoAiBtn}`)

    // Check Unified Overview Card & 4 Sections
    const unifiedCard = page.locator('.lesson-unified-card')
    const hasUnifiedCard = await unifiedCard.isVisible()
    console.log(`-> Unified Overview card present: ${hasUnifiedCard}`)
    if (!hasUnifiedCard) throw new Error('FAIL: Unified Overview card not found!')

    const sectionA = await page.locator('.accordion-title:has-text("A. Giới thiệu & Kiến thức trọng tâm")').isVisible()
    const sectionB = await page.locator('.accordion-title:has-text("B. Lý thuyết & Công thức")').isVisible()
    const sectionC = await page.locator('.accordion-title:has-text("C. Ví dụ & Bài tập mẫu")').isVisible()
    const sectionD = await page.locator('.accordion-title:has-text("D. Luyện tập thu hoạch")').isVisible()

    console.log(`-> Section A present: ${sectionA}`)
    console.log(`-> Section B present: ${sectionB}`)
    console.log(`-> Section C present: ${sectionC}`)
    console.log(`-> Section D present: ${sectionD}`)

    if (!sectionA || !sectionB || !sectionC || !sectionD) {
      throw new Error('FAIL: Missing one of the 4 accordion sections (A, B, C, D)!')
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_redesigned_lesson_page_desktop.png'), fullPage: false })

    // -------------------------------------------------------------
    // 4. Test Accordion Toggle: Section C (Examples)
    // -------------------------------------------------------------
    console.log('\n[TEST 4] Toggling Accordion Section C (Examples)...')
    const sectionCHeader = page.locator('.accordion-header').filter({ hasText: 'C. Ví dụ & Bài tập mẫu' })
    await sectionCHeader.click()
    await page.waitForTimeout(400)

    const exampleBody = page.locator('.accordion-section').filter({ hasText: 'C. Ví dụ & Bài tập mẫu' }).locator('.accordion-body')
    const isExampleVisible = await exampleBody.isVisible()
    console.log(`-> Section C expanded successfully: ${isExampleVisible}`)
    if (!isExampleVisible) throw new Error('FAIL: Section C did not expand on click!')

    // -------------------------------------------------------------
    // 5. Test Contextual Ask AI: Click on Video Card "Hỏi AI Tutor"
    // -------------------------------------------------------------
    console.log('\n[TEST 5] Clicking "Hỏi AI Tutor" on Video Card...')
    await videoAiBtn.click()
    await page.waitForTimeout(500)

    // Chat panel should be open
    const chatPanel = page.locator('.ai-chat-panel')
    const isChatOpen = await chatPanel.isVisible()
    console.log(`-> Floating chat panel opened: ${isChatOpen}`)
    if (!isChatOpen) throw new Error('FAIL: Chat panel did not open on clicking Video Ask AI!')

    // Context indicator should show video/lesson title
    const contextIndicator = await page.locator('.ai-context-indicator').innerText()
    console.log(`-> Context indicator text: "${contextIndicator}"`)

    // Textarea should have suggested prompt: "Giải thích nội dung video này"
    const textareaValue = await page.locator('.ai-chat-textarea').inputValue()
    console.log(`-> Textarea prefilled prompt: "${textareaValue}"`)
    if (!textareaValue.includes('Giải thích nội dung video này')) {
      throw new Error(`FAIL: Expected prompt "Giải thích nội dung video này", got "${textareaValue}"`)
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_video_contextual_ai_opened.png') })

    // Close chat panel before next contextual trigger
    await page.locator('.ai-chat-panel .ai-header-action-btn').last().click()
    await page.waitForTimeout(300)

    // -------------------------------------------------------------
    // 6. Test Contextual Ask AI: Click on Theory Section "Hỏi AI Tutor"
    // -------------------------------------------------------------
    console.log('\n[TEST 6] Clicking "Hỏi AI Tutor" on Theory Section...')
    const theoryAiBtn = page.locator('.accordion-header').filter({ hasText: 'B. Lý thuyết & Công thức' }).locator('.btn-ask-ai-contextual')
    await theoryAiBtn.scrollIntoViewIfNeeded()
    await theoryAiBtn.click()
    await page.waitForTimeout(400)

    const theoryPrompt = await page.locator('.ai-chat-textarea').inputValue()
    console.log(`-> Theory prefilled prompt: "${theoryPrompt}"`)
    if (!theoryPrompt.includes('Giải thích công thức này dễ hiểu hơn')) {
      throw new Error(`FAIL: Expected prompt "Giải thích công thức này dễ hiểu hơn", got "${theoryPrompt}"`)
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_theory_contextual_ai_opened.png') })

    // Close chat panel before next contextual trigger
    await page.locator('.ai-chat-panel .ai-header-action-btn').last().click()
    await page.waitForTimeout(300)

    // -------------------------------------------------------------
    // 7. Test Contextual Ask AI: Click on Examples Section "Hỏi AI Tutor"
    // -------------------------------------------------------------
    console.log('\n[TEST 7] Clicking "Hỏi AI Tutor" on Examples Section...')
    const examplesAiBtn = page.locator('.accordion-header').filter({ hasText: 'C. Ví dụ & Bài tập mẫu' }).locator('.btn-ask-ai-contextual')
    await examplesAiBtn.scrollIntoViewIfNeeded()
    await examplesAiBtn.click()
    await page.waitForTimeout(400)

    const examplesPrompt = await page.locator('.ai-chat-textarea').inputValue()
    console.log(`-> Examples prefilled prompt: "${examplesPrompt}"`)
    if (!examplesPrompt.includes('Hướng dẫn em giải ví dụ này từng bước')) {
      throw new Error(`FAIL: Expected prompt "Hướng dẫn em giải ví dụ này từng bước", got "${examplesPrompt}"`)
    }

    // Close chat panel before next contextual trigger
    await page.locator('.ai-chat-panel .ai-header-action-btn').last().click()
    await page.waitForTimeout(300)

    // -------------------------------------------------------------
    // 8. Test Contextual Ask AI: Click on Practice Section "Hỏi AI Tutor"
    // -------------------------------------------------------------
    console.log('\n[TEST 8] Clicking "Hỏi AI Tutor" on Practice Section...')
    const practiceAiBtn = page.locator('.accordion-header').filter({ hasText: 'D. Luyện tập thu hoạch' }).locator('.btn-ask-ai-contextual')
    await practiceAiBtn.scrollIntoViewIfNeeded()
    await practiceAiBtn.click()
    await page.waitForTimeout(400)

    const practicePrompt = await page.locator('.ai-chat-textarea').inputValue()
    console.log(`-> Practice prefilled prompt: "${practicePrompt}"`)
    if (!practicePrompt.includes('Gợi ý cho em cách bắt đầu câu hỏi này')) {
      throw new Error(`FAIL: Expected prompt "Gợi ý cho em cách bắt đầu câu hỏi này", got "${practicePrompt}"`)
    }

    // -------------------------------------------------------------
    // 9. Mobile Responsive View Test (375x812)
    // -------------------------------------------------------------
    console.log('\n[TEST 9] Testing Mobile viewport (375x812)...')
    await page.setViewportSize({ width: 375, height: 812 })
    await page.waitForTimeout(500)

    const mobileMenuPresent = await page.locator('.mobile-outline-toggle').isVisible()
    console.log(`-> Mobile outline toggle button visible: ${mobileMenuPresent}`)

    const bottomBarVisible = await page.locator('.lesson-bottom-bar').isVisible()
    console.log(`-> Bottom action bar visible on mobile: ${bottomBarVisible}`)

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10_redesigned_lesson_mobile.png'), fullPage: false })

    console.log('\n====================================================================')
    console.log('ALL E2E ACCEPTANCE TESTS PASSED WITH 100% SUCCESS!')
    console.log('====================================================================')
    console.log(`Console Errors: ${consoleErrors.length}`)
    console.log(`Failed Requests: ${failedRequests.length}`)

  } catch (err) {
    console.error('\nE2E ACCEPTANCE FAILED:', err)
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'redesign_error.png') }).catch(() => {})
    process.exit(1)
  } finally {
    await browser.close()
  }
}

runLessonRedesignAcceptance()
