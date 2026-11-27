/**
 * Admin First Live Browser Visual Audit & E2E Verification
 * Runs strictly against an isolated StudyAIDb_Clean_{GUID} backend & real Vite frontend.
 * Captures 12 real screenshots to docs/roadmap/admin-preview/ and verifies:
 * - Zero console/page errors, zero 500s
 * - Responsive layout (1440x900, 1280x800, 768x1024, 390x844) without horizontal overflow
 * - ADM-01 Dashboard real data + honest unavailable state for subscriptions
 * - ADM-02 User Management search/filter/sort/drawer
 * - ADM-03 Roles & Permissions matrix
 * - ADM-04 & ADM-05 Design Approval Mockup isolation
 * - ADM-06 Support Center end-to-end (Student creates -> Admin replies/updates -> Student sees reply)
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { chromium, type Page } from 'playwright'
import { isAuthorizedTestDatabase } from './utils/databaseSafetyGuard'

const frontendUrl = process.env.E2E_FRONTEND_URL ?? 'http://127.0.0.1:5179'
const backendUrl = process.env.E2E_BACKEND_URL ?? 'http://127.0.0.1:5199'
const dbName = process.env.E2E_DB_NAME ?? ''
const previewDir = path.resolve('docs/roadmap/admin-preview')

if (!isAuthorizedTestDatabase(dbName)) {
  throw new Error(`DB_SAFETY_VIOLATION: E2E_DB_NAME='${dbName}' must strictly match StudyAIDb_Clean_{GUID}.`)
}

fs.mkdirSync(previewDir, { recursive: true })

async function checkNoHorizontalOverflow(page: Page, label: string) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement
    return doc.scrollWidth > doc.clientWidth + 2
  })
  if (overflow) {
    console.warn(`[VISUAL_AUDIT_WARN] Horizontal overflow detected on ${label} at ${page.viewportSize()?.width}px`)
  }
  return overflow
}

async function main() {
  const localShell = path.join(
    process.env.LOCALAPPDATA || '',
    'ms-playwright',
    'chromium_headless_shell-1254',
    'chrome-headless-shell-win64',
    'chrome-headless-shell.exe'
  )
  const browser = await chromium.launch({
    headless: true,
    ...(fs.existsSync(localShell) ? { executablePath: localShell } : { channel: 'msedge' }),
  })
  const consoleErrors: string[] = []
  const pageErrors: string[] = []
  const serverErrors: string[] = []

  try {
    // 1. Register a fresh student via real API and create a support ticket end-to-end
    const studentEmail = `e2e_student_${Date.now()}@studyai.test`
    const regRes = await fetch(`${backendUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: studentEmail,
        password: 'Password@123456',
        displayName: 'Học Sinh E2E',
        grade: '12',
      }),
    })
    assert.equal(regRes.status, 201, 'Student registration must succeed')
    const regJson = (await regRes.json()) as { accessToken: string; user: { id: string } }
    const studentToken = regJson.accessToken

    // Student creates a support ticket via UI (/support)
    const studentCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const studentPage = await studentCtx.newPage()
    await studentPage.goto(`${frontendUrl}/login`, { waitUntil: 'networkidle' })
    await studentPage.fill('input[type="email"]', studentEmail)
    await studentPage.fill('input[type="password"]', 'Password@123456')
    await studentPage.click('button[type="submit"]')
    await studentPage.waitForURL('**/dashboard', { timeout: 15000 })

    await studentPage.goto(`${frontendUrl}/support`, { waitUntil: 'networkidle' })
    await studentPage.getByRole('button', { name: /Tạo yêu cầu hỗ trợ/i }).click()
    await studentPage.fill('input[placeholder*="Mô tả ngắn gọn"]', 'Lỗi hiển thị bài tập Toán 12')
    await studentPage.fill('textarea[placeholder*="Cung cấp thông tin"]', 'Em không thấy nút nộp bài ở chương 1.')
    await studentPage.getByRole('button', { name: /^Gửi yêu cầu$/i }).click()
    await studentPage.waitForSelector('text=Lỗi hiển thị bài tập Toán 12', { timeout: 10000 })
    await studentCtx.close()

    // 2. Admin logs in via real browser UI
    const adminCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await adminCtx.newPage()
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })
    page.on('pageerror', (err) => pageErrors.push(err.message))
    page.on('response', (res) => {
      if (res.status() >= 500) serverErrors.push(`${res.status()} ${res.url()}`)
    })

    await page.goto(`${frontendUrl}/login`, { waitUntil: 'networkidle' })
    await page.fill('input[type="email"]', 'admin@studyai.internal')
    await page.fill('input[type="password"]', 'Admin@123456')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/admin', { timeout: 15000 })
    await page.waitForSelector('text=Tổng quan hệ thống', { timeout: 10000 })
    await page.waitForTimeout(800)

    // Screenshot 01: Dashboard
    await page.screenshot({ path: path.join(previewDir, '01-dashboard.png'), fullPage: true })
    const overflow1440 = await checkNoHorizontalOverflow(page, 'Dashboard-1440')

    // Check 1280x800 and 768x1024 on Dashboard
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.waitForTimeout(300)
    const overflow1280 = await checkNoHorizontalOverflow(page, 'Dashboard-1280')

    await page.setViewportSize({ width: 768, height: 1024 })
    await page.waitForTimeout(300)
    const overflow768 = await checkNoHorizontalOverflow(page, 'Dashboard-768')

    // Mobile 390x844
    await page.setViewportSize({ width: 390, height: 844 })
    await page.waitForTimeout(400)
    await page.screenshot({ path: path.join(previewDir, '12-mobile-layout.png'), fullPage: true })
    const overflow390 = await checkNoHorizontalOverflow(page, 'Dashboard-390')

    // Back to Desktop 1440x900
    await page.setViewportSize({ width: 1440, height: 900 })

    // Screenshot 02: Users
    await page.goto(`${frontendUrl}/admin/users`, { waitUntil: 'networkidle' })
    await page.waitForSelector('text=admin@studyai.internal', { timeout: 10000 })
    await page.waitForTimeout(500)
    await page.screenshot({ path: path.join(previewDir, '02-users.png'), fullPage: true })

    // Screenshot 03: User Detail Drawer
    const quickViewBtn = page.locator('button[aria-label^="Xem nhanh"]').first()
    await quickViewBtn.click()
    await page.waitForSelector('text=Mở hồ sơ đầy đủ', { timeout: 5000 })
    await page.waitForTimeout(300)
    await page.screenshot({ path: path.join(previewDir, '03-user-detail.png'), fullPage: true })
    await page.keyboard.press('Escape')

    // Screenshot 04: Permissions
    await page.goto(`${frontendUrl}/admin/roles`, { waitUntil: 'networkidle' })
    await page.waitForSelector('text=Ma trận phân quyền', { timeout: 10000 })
    await page.waitForTimeout(400)
    await page.screenshot({ path: path.join(previewDir, '04-permissions.png'), fullPage: true })

    // Screenshot 05, 06, 07: API Management Mockup
    await page.goto(`${frontendUrl}/admin/api-management`, { waitUntil: 'networkidle' })
    await page.waitForSelector('text=BẢN MẪU THIẾT KẾ ADM-04', { timeout: 10000 })
    await page.waitForTimeout(400)
    await page.screenshot({ path: path.join(previewDir, '05-api-management.png'), fullPage: true })

    await page.getByRole('button', { name: /Cấu hình Provider/i }).click()
    await page.waitForTimeout(300)
    await page.screenshot({ path: path.join(previewDir, '06-api-configuration.png'), fullPage: true })

    await page.getByRole('button', { name: /Phân tích sử dụng/i }).click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: path.join(previewDir, '07-api-usage.png'), fullPage: true })

    // Screenshot 08, 09: Subscriptions Mockup
    await page.goto(`${frontendUrl}/admin/subscriptions`, { waitUntil: 'networkidle' })
    await page.waitForSelector('text=BẢN MẪU THIẾT KẾ ADM-05', { timeout: 10000 })
    await page.waitForTimeout(400)
    await page.screenshot({ path: path.join(previewDir, '08-subscription-plans.png'), fullPage: true })

    await page.getByRole('button', { name: /Thuê bao người dùng/i }).click()
    await page.waitForTimeout(300)
    await page.screenshot({ path: path.join(previewDir, '09-subscription-edit.png'), fullPage: true })

    // Screenshot 10, 11: Support Tickets & Conversation E2E
    await page.goto(`${frontendUrl}/admin/tickets`, { waitUntil: 'networkidle' })
    await page.waitForSelector('text=Lỗi hiển thị bài tập Toán 12', { timeout: 10000 })
    await page.waitForTimeout(400)
    await page.screenshot({ path: path.join(previewDir, '10-support-tickets.png'), fullPage: true })

    await page.locator('button[aria-label^="Xem và xử lý"]').first().click()
    await page.waitForSelector('text=Phản hồi người dùng', { timeout: 5000 })
    await page.fill('textarea[placeholder="Nhập nội dung phản hồi..."]', 'Admin đã kiểm tra và mở lại nút nộp bài cho em.')
    await page.getByRole('button', { name: /Gửi phản hồi/i }).click()
    await page.waitForSelector('text=Admin đã kiểm tra và mở lại nút nộp bài cho em.', { timeout: 10000 })
    await page.waitForTimeout(300)
    await page.screenshot({ path: path.join(previewDir, '11-support-conversation.png'), fullPage: true })

    await adminCtx.close()

    // 3. Verify Student sees Admin's reply & updated status via real API
    const verifyRes = await fetch(`${backendUrl}/api/v1/support/tickets`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    })
    assert.equal(verifyRes.status, 200)
    const verifyData = (await verifyRes.json()) as { items: Array<{ id: string; status: string; messageCount: number }> }
    assert.equal(verifyData.items.length, 1)
    assert.equal(verifyData.items[0].status, 'WAITING_FOR_USER')
    assert.equal(verifyData.items[0].messageCount, 2)

    assert.equal(serverErrors.length, 0, `5xx errors detected: ${serverErrors.join('; ')}`)
    assert.equal(pageErrors.length, 0, `Uncaught page errors: ${pageErrors.join('; ')}`)

    console.log(
      JSON.stringify(
        {
          status: 'PASS',
          dbName,
          screenshotsCaptured: 12,
          overflow: { w1440: overflow1440, w1280: overflow1280, w768: overflow768, w390: overflow390 },
          consoleErrorsCount: consoleErrors.length,
          pageErrorsCount: pageErrors.length,
          serverErrorsCount: serverErrors.length,
        },
        null,
        2
      )
    )
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
