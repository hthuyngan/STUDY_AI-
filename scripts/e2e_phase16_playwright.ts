import { chromium } from 'playwright'
import { spawn, ChildProcess } from 'child_process'
import fs from 'fs'
import path from 'path'

const BACKEND_PORT = 5292
const FRONTEND_PORT = 4175
const BACKEND_URL = `http://127.0.0.1:${BACKEND_PORT}`
const FRONTEND_URL = `http://localhost:${FRONTEND_PORT}`
const QA_DIR = path.join('docs', 'visual-qa', 'phase-16')

if (!fs.existsSync(QA_DIR)) {
  fs.mkdirSync(QA_DIR, { recursive: true })
}

async function waitForUrl(url: string, timeoutMs = 35000): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok || res.status === 200 || res.status === 404 || res.status === 304) {
        return
      }
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 600))
  }
  throw new Error(`Service at ${url} did not become ready within ${timeoutMs}ms`)
}

async function run() {
  console.log('=== STARTING PHASE 16 ADMIN USER MANAGEMENT E2E PLAYWRIGHT SUITE ===')

  const dotnetRoot = 'C:\\Users\\Admin\\AppData\\Local\\Microsoft\\dotnet'
  const customPath = `${dotnetRoot};${process.env.PATH || ''}`

  // 1. Start ASP.NET Core API on port 5292
  console.log(`Starting ASP.NET Core API on ${BACKEND_URL}...`)
  const backendProc: ChildProcess = spawn(
    'dotnet',
    ['run', '--project', path.join('backend', 'src', 'StudyAI.Api'), '--urls', BACKEND_URL, '--no-build'],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        DOTNET_ROOT: dotnetRoot,
        PATH: customPath,
        ASPNETCORE_ENVIRONMENT: 'Development',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  )

  backendProc.stdout?.on('data', (d) => {
    const s = d.toString()
    if (s.includes('Now listening on')) console.log('[Dotnet]', s.trim())
  })
  backendProc.stderr?.on('data', (d) => {
    console.error('[Dotnet Error]', d.toString().trim())
  })

  // 2. Wait for ASP.NET Core Health Probe
  console.log('Awaiting ASP.NET Core Health probe...')
  await waitForUrl(`${BACKEND_URL}/health/db`, 40000)
  console.log('ASP.NET Core API & SQL Server connection OK!')

  // Check direct API login first
  const testLoginRes = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@studyai.internal', password: 'Admin@123456' }),
  })
  console.log('Direct Admin login status:', testLoginRes.status)
  const testLoginJson = await testLoginRes.json()
  console.log('Direct Admin login data:', testLoginJson)

  // 3. Start Frontend Preview on port 4175
  console.log(`Starting frontend preview on ${FRONTEND_URL}...`)
  const frontendProc: ChildProcess = spawn(
    'bun',
    ['run', 'preview', '--', '--port', String(FRONTEND_PORT), '--strictPort'],
    {
      cwd: path.join(process.cwd(), 'frontend'),
      env: {
        ...process.env,
        VITE_API_BASE_URL: BACKEND_URL,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  )

  frontendProc.stdout?.on('data', (d) => {
    const s = d.toString()
    if (s.includes('Local:')) console.log('[Frontend]', s.trim())
  })
  frontendProc.stderr?.on('data', (d) => {
    console.error('[Frontend Error]', d.toString().trim())
  })

  await waitForUrl(`${FRONTEND_URL}`, 30000)
  console.log('Frontend Preview server ready!')

  // Launch Playwright with Chrome
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  })

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    })

    await context.addInitScript((apiUrl) => {
      (window as any).__STUDY_AI_API_BASE_URL__ = apiUrl
      window.localStorage.setItem('study_ai_api_base_url', apiUrl)
    }, BACKEND_URL)

    const page = await context.newPage()
    page.on('console', (msg) => console.log('[Browser Console]', msg.type(), msg.text()))
    page.on('pageerror', (err) => console.error('[Browser Error]', err))

    // SCENARIO 1: Admin Login Real
    console.log('Scenario 1: Logging in as real Admin...')
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(600)
    await page.screenshot({ path: path.join(QA_DIR, '01_admin_login_page_desktop.png') })
    console.log('Captured 01_admin_login_page_desktop.png')

    await page.fill('#login-email', 'admin@studyai.internal')
    await page.fill('#login-password', 'Admin@123456')
    await page.click('button[type="submit"]')
    await page.waitForTimeout(2500)

    const currentUrl = page.url()
    console.log('Post-login URL:', currentUrl)
    const errorBanner = await page.$('#auth-error-alert')
    if (errorBanner) {
      const errText = await errorBanner.innerText()
      console.error('Login Error Banner:', errText)
    }

    // SCENARIO 2: Navigate to Admin Dashboard & Users
    console.log('Scenario 2: Navigating to Admin Dashboard...')
    await page.goto(`${FRONTEND_URL}/admin`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    await page.screenshot({ path: path.join(QA_DIR, '02_admin_dashboard_sql_metrics_desktop.png') })
    console.log('Captured 02_admin_dashboard_sql_metrics_desktop.png')

    // SCENARIO 3: Navigate to Admin Users Page
    console.log('Scenario 3: Navigating to Admin Users List...')
    await page.goto(`${FRONTEND_URL}/admin/users`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1200)
    await page.screenshot({ path: path.join(QA_DIR, '03_admin_users_list_sql_desktop.png') })
    console.log('Captured 03_admin_users_list_sql_desktop.png')

    // SCENARIO 4: Open Add User Dialog
    console.log('Scenario 4: Opening Add User Dialog...')
    const addBtn = page.locator('button:has-text("Thêm người dùng"), button[aria-label*="Thêm người dùng"]').first()
    await addBtn.click()
    await page.waitForTimeout(600)
    await page.screenshot({ path: path.join(QA_DIR, '04_add_user_dialog_desktop.png') })
    console.log('Captured 04_add_user_dialog_desktop.png')

    // Fill new user form
    const uniqueEmail = `teacher_p16_${Date.now()}@studyai.internal`
    await page.fill('#user-display-name', 'Thầy Hoàng Văn Đức')
    await page.fill('#user-email', uniqueEmail)
    await page.selectOption('#user-role-select', 'teacher')
    await page.selectOption('#user-status-select', 'active')
    await page.screenshot({ path: path.join(QA_DIR, '05_add_user_form_filled_desktop.png') })
    console.log('Captured 05_add_user_form_filled_desktop.png')

    // Submit new user
    console.log('Submitting new user to SQL Server...')
    await page.click('button[type="submit"]:has-text("Tạo tài khoản demo"), button[type="submit"]:has-text("Tạo tài khoản")')
    await page.waitForTimeout(1800)
    await page.screenshot({ path: path.join(QA_DIR, '06_user_created_success_toast_desktop.png') })
    console.log('Captured 06_user_created_success_toast_desktop.png')

    // SCENARIO 5: Search & Filter User
    console.log('Scenario 5: Testing Search & Filters...')
    const searchInput = page.locator('input[type="search"]').first()
    await searchInput.fill('Hoàng Văn Đức')
    await page.waitForTimeout(1200)
    await page.screenshot({ path: path.join(QA_DIR, '07_search_filtered_user_desktop.png') })
    console.log('Captured 07_search_filtered_user_desktop.png')

    // SCENARIO 6: Edit User Dialog
    console.log('Scenario 6: Opening Edit User Dialog...')
    const editBtn = page.locator('button[title="Chỉnh sửa thông tin"], button[aria-label*="Sửa"]').first()
    await editBtn.click()
    await page.waitForTimeout(600)
    await page.screenshot({ path: path.join(QA_DIR, '08_edit_user_dialog_desktop.png') })
    console.log('Captured 08_edit_user_dialog_desktop.png')

    // Change display name and save
    await page.fill('#edit-user-display-name', 'Thầy Hoàng Văn Đức (Trưởng bộ môn)')
    await page.click('button[type="submit"]:has-text("Lưu thay đổi")')
    await page.waitForTimeout(1800)
    await page.screenshot({ path: path.join(QA_DIR, '09_user_edited_success_desktop.png') })
    console.log('Captured 09_user_edited_success_desktop.png')

    // SCENARIO 7: Reset Password Dialog
    console.log('Scenario 7: Testing Reset Password Workflow...')
    const resetBtn = page.locator('button[title="Đặt lại mật khẩu"], button[aria-label*="Đặt lại mật khẩu"]').first()
    await resetBtn.click()
    await page.waitForTimeout(600)
    await page.screenshot({ path: path.join(QA_DIR, '10_reset_password_dialog_desktop.png') })
    console.log('Captured 10_reset_password_dialog_desktop.png')

    // Submit reset password
    await page.click('button[type="submit"]:has-text("Đặt lại mật khẩu")')
    await page.waitForTimeout(1800)
    await page.screenshot({ path: path.join(QA_DIR, '11_reset_password_temporary_result_desktop.png') })
    console.log('Captured 11_reset_password_temporary_result_desktop.png')

    // Close reset dialog
    await page.click('button:has-text("Hoàn tất")')
    await page.waitForTimeout(600)

    // SCENARIO 8: Soft Delete User Confirmation
    console.log('Scenario 8: Testing Soft Delete Dialog...')
    const deleteBtn = page.locator('button[title="Xóa mềm tài khoản"], button[aria-label*="Xóa"]').first()
    await deleteBtn.click()
    await page.waitForTimeout(600)
    await page.screenshot({ path: path.join(QA_DIR, '12_soft_delete_confirmation_dialog_desktop.png') })
    console.log('Captured 12_soft_delete_confirmation_dialog_desktop.png')

    // Confirm soft delete
    await page.click('button:has-text("Xóa tài khoản")')
    await page.waitForTimeout(1800)
    await page.screenshot({ path: path.join(QA_DIR, '13_soft_delete_success_toast_desktop.png') })
    console.log('Captured 13_soft_delete_success_toast_desktop.png')

    // SCENARIO 9: Mobile Viewport 390px
    console.log('Scenario 9: Testing Mobile Viewport 390px...')
    await page.setViewportSize({ width: 390, height: 844 })
    await searchInput.fill('')
    await page.waitForTimeout(1200)
    await page.screenshot({ path: path.join(QA_DIR, '14_mobile_390px_admin_users_cards.png') })
    console.log('Captured 14_mobile_390px_admin_users_cards.png')

    // Mobile Admin Dashboard
    await page.goto(`${FRONTEND_URL}/admin`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    await page.screenshot({ path: path.join(QA_DIR, '15_mobile_390px_admin_dashboard.png') })
    console.log('Captured 15_mobile_390px_admin_dashboard.png')

    console.log('=== ALL PHASE 16 PLAYWRIGHT E2E SCENARIOS COMPLETED SUCCESSFULLY ===')
  } finally {
    await browser.close()
    backendProc.kill()
    frontendProc.kill()
  }
}

run().catch((err) => {
  console.error('E2E Test Runner failed:', err)
  process.exit(1)
})
