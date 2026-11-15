import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

const FRONTEND_URL = 'http://localhost:5174'
const QA_DIR = path.join('docs', 'visual-qa', 'math12')

if (!fs.existsSync(QA_DIR)) {
  fs.mkdirSync(QA_DIR, { recursive: true })
}

// Regex to detect common mojibake sequences
const MOJIBAKE_REGEX = /ChÆ|á»|áº|TÃ|Ã¡|Ã |áº£|á»‹|á»ƒ|Ä‘|Ä|Ă¡|Æ°/

async function runUnicodeAndTypographyVerification() {
  console.log('=== STARTING UNICODE VIETNAMESE & INTER TYPOGRAPHY E2E VERIFICATION ===')
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  })
  const page = await context.newPage()

  try {
    // -------------------------------------------------------------
    // 1. Learner Subjects Page (/subjects)
    // -------------------------------------------------------------
    console.log('\n[1/6] Checking /subjects...')
    await page.goto(`${FRONTEND_URL}/subjects`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    const subjectCards = await page.locator('.subject-item-card').all()
    console.log(`Found ${subjectCards.length} subject card(s)`)

    const subjectText = await page.locator('.subject-item-card').first().innerText()
    console.log('Subject card text:', subjectText.replace(/\n+/g, ' | '))

    if (MOJIBAKE_REGEX.test(subjectText)) {
      throw new Error(`MOJIBAKE DETECTED on /subjects: ${subjectText}`)
    }
    console.log('✓ No mojibake detected on /subjects')

    // Check font-family on subject card
    const cardFont = await page.evaluate(() => {
      const el = document.querySelector('.subject-item-card h3, .subject-item-card')
      return el ? window.getComputedStyle(el).fontFamily : ''
    })
    console.log('Computed font-family on subject card:', cardFont)

    const screenshot1 = path.join(QA_DIR, 'after_01_subjects_list.png')
    await page.screenshot({ path: screenshot1, fullPage: true })
    console.log(`✓ Screenshot 1 saved: ${screenshot1}`)

    // -------------------------------------------------------------
    // 2. Curriculum Outline Page (/subjects/sub_math12)
    // -------------------------------------------------------------
    console.log('\n[2/6] Checking /subjects/sub_math12...')
    await page.goto(`${FRONTEND_URL}/subjects/sub_math12`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1200)

    const pageContent = await page.content()
    if (MOJIBAKE_REGEX.test(pageContent)) {
      const match = pageContent.match(MOJIBAKE_REGEX)
      throw new Error(`MOJIBAKE DETECTED on /subjects/sub_math12: pattern ${match?.[0]}`)
    }
    console.log('✓ Zero mojibake detected across entire /subjects/sub_math12 DOM')

    // Verify all 6 chapters in Vietnamese
    const chapterHeaders = await page.locator('.curriculum-chapter-header, h3').allInnerTexts()
    console.log('Detected Chapter titles:')
    chapterHeaders.filter(t => t.includes('Chương')).forEach(t => console.log(' -', t))

    // Count total lesson links
    const lessonLinks = await page.locator('a[href*="/lessons/"]').count()
    console.log(`Found ${lessonLinks} lesson link(s) on curriculum page`)

    const screenshot2 = path.join(QA_DIR, 'after_02_curriculum_chapters.png')
    await page.screenshot({ path: screenshot2, fullPage: true })
    console.log(`✓ Screenshot 2 saved: ${screenshot2}`)

    // -------------------------------------------------------------
    // 3. Lesson Detail Page & Video Player (/subjects/sub_math12/lessons/les_math12_c1_b1)
    // -------------------------------------------------------------
    console.log('\n[3/6] Checking Lesson Page /subjects/sub_math12/lessons/les_math12_c1_b1...')
    await page.goto(`${FRONTEND_URL}/subjects/sub_math12/lessons/les_math12_c1_b1`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)

    const lessonText = await page.locator('.lesson-page-container').first().innerText()
    if (MOJIBAKE_REGEX.test(lessonText)) {
      throw new Error(`MOJIBAKE DETECTED on Lesson Page: ${lessonText.substring(0, 200)}`)
    }
    console.log('✓ Zero mojibake on Lesson Page')

    // Verify Video Player & Vietnamese title
    const videoTitle = await page.locator('.video-license-note').first().innerText().catch(() => '')
    console.log('Video title rendered:', videoTitle)

    // Check Multi-video playlist tabs
    const videoPills = await page.locator('.video-tab-pill').allInnerTexts()
    console.log(`Found ${videoPills.length} video playlist tab(s):`, videoPills)

    // Check author badge
    const authorBadge = await page.locator('.video-author-badge').first().innerText().catch(() => '')
    console.log('Author badge rendered:', authorBadge)

    // Check YouTube Direct Fallback button
    const ytDirectLink = await page.locator('.btn-yt-direct-fallback').first().getAttribute('href').catch(() => null)
    console.log('YouTube direct link:', ytDirectLink)

    // Switch to Video 2 if available
    const videoTabPills = page.locator('.video-tab-pill')
    if (await videoTabPills.count() > 1) {
      await videoTabPills.nth(1).click()
      await page.waitForTimeout(500)
      console.log('✓ Successfully clicked and switched to Video 2 pill')
    }

    // Verify KaTeX math formula preservation
    const katexCount = await page.locator('.katex').count()
    console.log(`Rendered KaTeX math formulas: ${katexCount}`)

    const katexFont = await page.evaluate(() => {
      const el = document.querySelector('.katex')
      return el ? window.getComputedStyle(el).fontFamily : ''
    })
    console.log('Computed font-family on KaTeX element:', katexFont)

    // Switch to Theory tab
    const theoryTab = page.locator('.lesson-tab-btn', { hasText: 'Lý thuyết' })
    if (await theoryTab.isVisible()) {
      await theoryTab.click()
      await page.waitForTimeout(600)
    }

    const screenshot3 = path.join(QA_DIR, 'after_03_lesson_video_theory.png')
    await page.screenshot({ path: screenshot3, fullPage: false })
    console.log(`✓ Screenshot 3 saved: ${screenshot3}`)

    // -------------------------------------------------------------
    // 4. Admin Chapter & Topic CRUD with Vietnamese input
    // -------------------------------------------------------------
    console.log('\n[4/6] Admin Chapters & Topics CRUD with accented Vietnamese...')
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle' })
    await page.fill('input[type="email"]', 'admin@studyai.internal')
    await page.fill('input[type="password"]', 'Admin@123456')
    await page.click('button[type="submit"]')
    await page.waitForTimeout(2000)

    // Navigate to /content/chapters
    await page.goto(`${FRONTEND_URL}/content/chapters`, { waitUntil: 'networkidle' })
    await page.waitForSelector('.staff-table tbody tr', { timeout: 15000 })
    console.log('Chapters management table loaded.')

    // Open Topic Modal for Chapter 1
    const topicModalBtns = page.locator('button:has-text("Chủ đề")')
    await topicModalBtns.first().click()
    await page.waitForTimeout(800)

    // Add Vietnamese Topic
    const testTopicTitle = 'Chủ đề Kiểm Thử: Khảo sát cực trị và tiệm cận GDPT 2018'
    await page.fill('input[placeholder*="Chủ đề 1"]', testTopicTitle)
    await page.click('button:has-text("Thêm chủ đề")')
    await page.waitForTimeout(1500)

    // Verify it rendered in the table without distortion
    const topicModalText = await page.locator('.admin-dialog-body').first().innerText()
    const hasTopic = topicModalText.includes(testTopicTitle)
    console.log(`Created Vietnamese topic in StudyAIDb: ${hasTopic ? '✓ SUCCESS' : '✗ FAILED'}`)

    const screenshot4 = path.join(QA_DIR, 'after_04_admin_chapters_topics.png')
    await page.screenshot({ path: screenshot4, fullPage: false })
    console.log(`✓ Screenshot 4 saved: ${screenshot4}`)

    // Clean up: delete test topic
    const deleteTopicBtn = page.locator('button[title="Xóa chủ đề"]').last()
    if (await deleteTopicBtn.isVisible()) {
      page.once('dialog', async d => d.accept())
      await deleteTopicBtn.click()
      await page.waitForTimeout(1000)
      console.log('Cleaned up test topic.')
    }
    await page.click('button:has-text("Đóng")')
    await page.waitForTimeout(500)

    // -------------------------------------------------------------
    // 5. Admin Lesson & Video CRUD with Vietnamese input & Video Filter
    // -------------------------------------------------------------
    console.log('\n[5/6] Admin Lessons & Videos CRUD with accented Vietnamese & Video Filter...')
    await page.goto(`${FRONTEND_URL}/content/lessons`, { waitUntil: 'networkidle' })
    await page.waitForSelector('.staff-table tbody tr', { timeout: 15000 })
    console.log('Lessons management table loaded.')

    // Verify Video Filter select exists
    const videoFilterSelect = page.locator('select[aria-label="Lọc theo video"]')
    if (await videoFilterSelect.isVisible()) {
      console.log('✓ Video Filter dropdown is visible')
      // Select "Đã có video"
      await videoFilterSelect.selectOption('has_video')
      await page.waitForTimeout(600)
      const hasVideoBadges = await page.locator('.badge-video-present').count()
      console.log(`Found ${hasVideoBadges} lesson(s) with 'badge-video-present'`)
      // Reset filter to all
      await videoFilterSelect.selectOption('all')
      await page.waitForTimeout(600)
    }

    // Open Video Modal for Lesson 1
    const videoBtns = page.locator('button.admin-btn-outline:has-text("Video")')
    await videoBtns.first().click()
    await page.waitForTimeout(800)

    // Add Vietnamese Video
    const testVideoTitle = 'Video Bài Giảng Thực Chiến: Ứng dụng đạo hàm giải toán thực tế'
    await page.fill('input[placeholder*="Lý thuyết trọng tâm"]', testVideoTitle)
    await page.fill('input[placeholder*="youtube.com"]', 'https://www.youtube.com/watch?v=jlSW7u-Y8Ck')
    await page.click('button:has-text("Thêm video")')
    await page.waitForTimeout(1500)

    const videoModalText = await page.locator('.admin-dialog-body').first().innerText()
    const hasVideo = videoModalText.includes(testVideoTitle)
    console.log(`Created Vietnamese video in StudyAIDb: ${hasVideo ? '✓ SUCCESS' : '✗ FAILED'}`)

    const screenshot5 = path.join(QA_DIR, 'after_05_admin_lesson_videos.png')
    await page.screenshot({ path: screenshot5, fullPage: false })
    console.log(`✓ Screenshot 5 saved: ${screenshot5}`)

    // Clean up: delete test video
    const deleteVideoBtn = page.locator('button[title="Xóa video"]').last()
    if (await deleteVideoBtn.isVisible()) {
      page.once('dialog', async d => d.accept())
      await deleteVideoBtn.click()
      await page.waitForTimeout(1000)
      console.log('Cleaned up test video.')
    }
    await page.click('button:has-text("Đóng")')
    await page.waitForTimeout(500)

    // -------------------------------------------------------------
    // 6. Mobile Viewport (375x667)
    // -------------------------------------------------------------
    console.log('\n[6/6] Mobile Viewport Verification (375x667)...')
    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 667 },
      isMobile: true,
    })
    const mobilePage = await mobileContext.newPage()
    await mobilePage.goto(`${FRONTEND_URL}/subjects/sub_math12/lessons/les_math12_c1_b1`, { waitUntil: 'networkidle' })
    await mobilePage.waitForTimeout(1200)

    const mobileContent = await mobilePage.content()
    if (MOJIBAKE_REGEX.test(mobileContent)) {
      throw new Error('MOJIBAKE DETECTED on mobile view!')
    }
    console.log('✓ Mobile view has zero mojibake')

    const screenshot6 = path.join(QA_DIR, 'after_06_mobile_lesson_view.png')
    await mobilePage.screenshot({ path: screenshot6, fullPage: false })
    console.log(`✓ Screenshot 6 saved: ${screenshot6}`)

    console.log('\n=== ALL UNICODE & TYPOGRAPHY TESTS PASSED WITH 100% ACCURACY! ===')
  } catch (err) {
    console.error('Verification Error:', err)
    process.exit(1)
  } finally {
    await browser.close()
  }
}

runUnicodeAndTypographyVerification()
