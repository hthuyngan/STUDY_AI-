import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

const BASE_URL = 'http://localhost:5174'
const QA_DIR = path.join('docs', 'visual-qa', 'admin-management-v2')

if (!fs.existsSync(QA_DIR)) {
  fs.mkdirSync(QA_DIR, { recursive: true })
}

async function verifyAdminV2() {
  console.log('=== VERIFYING ADMIN MANAGEMENT V2 (PRACTICAL — NO AI) ===')
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
    console.log('2. Capturing Admin Dashboard (/admin)...')
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    await page.screenshot({ path: path.join(QA_DIR, '01_admin_dashboard_v2.png'), fullPage: true })
    console.log('✓ Captured 01_admin_dashboard_v2.png')

    // 3. Admin Users
    console.log('3. Capturing Admin Users (/admin/users)...')
    await page.goto(`${BASE_URL}/admin/users`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    await page.screenshot({ path: path.join(QA_DIR, '02_admin_users_v2.png'), fullPage: true })
    console.log('✓ Captured 02_admin_users_v2.png')

    // 4. Content Workspace
    console.log('4. Capturing Content Dashboard (/content)...')
    await page.goto(`${BASE_URL}/content`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    await page.screenshot({ path: path.join(QA_DIR, '03_content_dashboard_v2.png'), fullPage: true })
    console.log('✓ Captured 03_content_dashboard_v2.png')

    // 5. Question Bank
    console.log('5. Capturing Question Bank (/content/questions)...')
    await page.goto(`${BASE_URL}/content/questions`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    await page.screenshot({ path: path.join(QA_DIR, '04_content_questions_v2.png'), fullPage: true })
    console.log('✓ Captured 04_content_questions_v2.png')

    // 6. Teacher Workspace
    console.log('6. Capturing Teacher Dashboard (/teacher)...')
    await page.goto(`${BASE_URL}/teacher`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    await page.screenshot({ path: path.join(QA_DIR, '05_teacher_dashboard_v2.png'), fullPage: true })
    console.log('✓ Captured 05_teacher_dashboard_v2.png')

    // 7. Support Workspace
    console.log('7. Capturing Support Dashboard (/support)...')
    await page.goto(`${BASE_URL}/support`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    await page.screenshot({ path: path.join(QA_DIR, '06_support_dashboard_v2.png'), fullPage: true })
    console.log('✓ Captured 06_support_dashboard_v2.png')

    // 8. Mobile view check (390px)
    console.log('8. Capturing mobile view (390px)...')
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    await page.screenshot({ path: path.join(QA_DIR, '07_admin_dashboard_mobile_v2.png'), fullPage: true })
    console.log('✓ Captured 07_admin_dashboard_mobile_v2.png')

    console.log('=== ALL SCREENSHOTS SUCCESSFULLY CAPTURED ===')
  } catch (err) {
    console.error('Error during verification:', err)
  } finally {
    await browser.close()
  }
}

verifyAdminV2()

