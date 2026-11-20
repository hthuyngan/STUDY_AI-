import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

const BASE_URL = 'http://localhost:5174'
const QA_DIR = path.join('docs', 'visual-qa', 'admin-frontend-rebuild')

if (!fs.existsSync(QA_DIR)) {
  fs.mkdirSync(QA_DIR, { recursive: true })
}

async function verifyAdminRebuild() {
  console.log('=== VERIFYING ADMIN FRONTEND REBUILD ===')
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()

  try {
    // 1. Login as Admin
    console.log('1. Logging in as Admin...')
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' })
    await page.fill('input[type="email"]', 'admin@studyai.internal')
    await page.fill('input[type="password"]', 'Admin@123456')
    await page.click('button[type="submit"]')
    await page.waitForTimeout(2000)

    // 2. Admin Dashboard
    console.log('2. Navigating to Admin Dashboard (/admin)...')
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    await page.screenshot({ path: path.join(QA_DIR, '01_admin_dashboard.png'), fullPage: true })
    console.log('✓ Captured 01_admin_dashboard.png')

    // 3. Admin Users
    console.log('3. Navigating to Admin Users (/admin/users)...')
    await page.goto(`${BASE_URL}/admin/users`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    await page.screenshot({ path: path.join(QA_DIR, '02_admin_users.png'), fullPage: true })
    console.log('✓ Captured 02_admin_users.png')

    // 4. Content Workspace
    console.log('4. Navigating to Content Dashboard (/content)...')
    await page.goto(`${BASE_URL}/content`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    await page.screenshot({ path: path.join(QA_DIR, '03_content_dashboard.png'), fullPage: true })
    console.log('✓ Captured 03_content_dashboard.png')

    // 5. Question Bank
    console.log('5. Navigating to Question Bank (/content/questions)...')
    await page.goto(`${BASE_URL}/content/questions`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    await page.screenshot({ path: path.join(QA_DIR, '04_content_questions.png'), fullPage: true })
    console.log('✓ Captured 04_content_questions.png')

    // 6. Teacher Workspace
    console.log('6. Navigating to Teacher Dashboard (/teacher)...')
    await page.goto(`${BASE_URL}/teacher`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    await page.screenshot({ path: path.join(QA_DIR, '05_teacher_dashboard.png'), fullPage: true })
    console.log('✓ Captured 05_teacher_dashboard.png')

    // 7. Support Workspace
    console.log('7. Navigating to Support Dashboard (/support)...')
    await page.goto(`${BASE_URL}/support`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    await page.screenshot({ path: path.join(QA_DIR, '06_support_dashboard.png'), fullPage: true })
    console.log('✓ Captured 06_support_dashboard.png')

    // 8. Mobile view check (390px)
    console.log('8. Checking responsive mobile view (390px)...')
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    await page.screenshot({ path: path.join(QA_DIR, '07_admin_dashboard_mobile.png'), fullPage: true })
    console.log('✓ Captured 07_admin_dashboard_mobile.png')

    console.log('=== ALL SCREENSHOTS SUCCESSFULLY CAPTURED ===')
  } catch (err) {
    console.error('Error during verification:', err)
  } finally {
    await browser.close()
  }
}

verifyAdminRebuild()

