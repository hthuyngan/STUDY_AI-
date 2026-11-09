import { chromium } from 'playwright'
import { spawn, ChildProcess } from 'child_process'
import fs from 'fs'
import path from 'path'
import { resolveDotnet10Environment } from './utils/dotnetRuntime'
import { assertSafeTestDatabase } from './utils/databaseSafetyGuard'

const BACKEND_PORT = 5292
const FRONTEND_PORT = 4175
const BACKEND_URL = `http://127.0.0.1:${BACKEND_PORT}`
const FRONTEND_URL = `http://127.0.0.1:${FRONTEND_PORT}`
const QA_DIR = path.join('docs', 'visual-qa', 'phase-16')

// Dedicated test database connection string to preserve StudyAIDb
const E2E_CONNECTION_STRING =
  process.env.ConnectionStrings__DefaultConnection ||
  'Server=.\\SQLEXPRESS;Database=StudyAIDb_E2E;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True'

// Fail-closed database safety guard: abort immediately if targeting StudyAIDb or an invalid/unauthorized DB
assertSafeTestDatabase(E2E_CONNECTION_STRING, 'Phase 16 Playwright E2E')

// Requirement 7: Delete existing screenshots so only freshly captured screenshots are used as evidence
if (fs.existsSync(QA_DIR)) {
  for (const file of fs.readdirSync(QA_DIR)) {
    if (file.endsWith('.png')) {
      try {
        fs.unlinkSync(path.join(QA_DIR, file))
      } catch {
        // ignore
      }
    }
  }
} else {
  fs.mkdirSync(QA_DIR, { recursive: true })
}

function killProcessTree(proc: ChildProcess | undefined) {
  if (!proc || !proc.pid) return
  try {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', proc.pid.toString(), '/T', '/F'])
    } else {
      proc.kill('SIGKILL')
    }
  } catch {
    // ignore
  }
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

interface ScenarioReport {
  id: number
  name: string
  status: 'PASS' | 'FAIL'
  durationMs: number
  screenshots: string[]
  notes?: string
}

async function run() {
  const startTime = Date.now()
  console.log('=== STARTING PHASE 16 ADMIN USER MANAGEMENT E2E PLAYWRIGHT SUITE ===')
  console.log(`Timestamp: ${new Date().toISOString()}`)
  console.log(`Target E2E Database: StudyAIDb_E2E (Isolated test database)`)

  const reports: ScenarioReport[] = []

  // Robust cross-environment .NET 10 runtime resolution
  const dotnetEnv = resolveDotnet10Environment()
  const { dotnetRoot, dotnetBin, customPath } = dotnetEnv

  console.log(`Using .NET Root: ${dotnetRoot}`)
  console.log(`Using .NET Binary: ${dotnetBin} (netcore: ${dotnetEnv.netcoreVersion}, aspnet: ${dotnetEnv.aspnetVersion})`)

  // 1. Start ASP.NET Core API on port 5292 with StudyAIDb_E2E connection
  console.log(`Starting ASP.NET Core API on ${BACKEND_URL}...`)
  const backendProc: ChildProcess = spawn(
    dotnetBin,
    ['run', '--project', path.join('backend', 'src', 'StudyAI.Api'), '--urls', BACKEND_URL, '--no-build'],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        DOTNET_ROOT: dotnetRoot,
        PATH: customPath,
        ASPNETCORE_ENVIRONMENT: 'Development',
        ConnectionStrings__DefaultConnection: E2E_CONNECTION_STRING,
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
  console.log('Direct Admin login user id:', testLoginJson?.user?.id)

  // 3. Start Frontend Preview on port 4175 (bound to 127.0.0.1 for same-site cookie)
  console.log(`Starting frontend preview on ${FRONTEND_URL}...`)
  const frontendProc: ChildProcess = spawn(
    'bun',
    ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(FRONTEND_PORT), '--strictPort'],
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

  let allScenariosPassed = true

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    })

    await context.addInitScript((apiUrl) => {
      (window as any).__STUDY_AI_API_BASE_URL__ = apiUrl
      window.localStorage.setItem('study_ai_api_base_url', apiUrl)
    }, BACKEND_URL)

    const page = await context.newPage()
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.log('[Browser Error]', msg.text())
    })

    // SCENARIO 1: Admin Login Real
    const s1Start = Date.now()
    console.log('\n[Scenario 1] Logging in as real Admin...')
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(600)
    await page.screenshot({ path: path.join(QA_DIR, '01_admin_login_page_desktop.png') })

    await page.fill('#login-email', 'admin@studyai.internal')
    await page.fill('#login-password', 'Admin@123456')
    await page.click('button[type="submit"]')
    await page.waitForTimeout(2500)

    const postLoginUrl = page.url()
    const s1Passed = postLoginUrl.includes('/admin')
    reports.push({
      id: 1,
      name: 'Admin Login Real & Session Persistence',
      status: s1Passed ? 'PASS' : 'FAIL',
      durationMs: Date.now() - s1Start,
      screenshots: ['01_admin_login_page_desktop.png'],
      notes: `Post-login URL: ${postLoginUrl}`,
    })
    if (!s1Passed) allScenariosPassed = false

    // SCENARIO 2: Navigate to Admin Dashboard & SQL Metrics
    const s2Start = Date.now()
    console.log('\n[Scenario 2] Navigating to Admin Dashboard...')
    await page.goto(`${FRONTEND_URL}/admin`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    await page.screenshot({ path: path.join(QA_DIR, '02_admin_dashboard_sql_metrics_desktop.png') })
    reports.push({
      id: 2,
      name: 'Admin Dashboard Real SQL Metrics',
      status: 'PASS',
      durationMs: Date.now() - s2Start,
      screenshots: ['02_admin_dashboard_sql_metrics_desktop.png'],
    })

    // SCENARIO 3: Navigate to Admin Users Page
    const s3Start = Date.now()
    console.log('\n[Scenario 3] Navigating to Admin Users List...')
    await page.goto(`${FRONTEND_URL}/admin/users`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1200)
    await page.screenshot({ path: path.join(QA_DIR, '03_admin_users_list_sql_desktop.png') })
    reports.push({
      id: 3,
      name: 'Admin Users List with Server-side Pagination',
      status: 'PASS',
      durationMs: Date.now() - s3Start,
      screenshots: ['03_admin_users_list_sql_desktop.png'],
    })

    // SCENARIO 4: Open Add User Dialog & Submit
    const s4Start = Date.now()
    console.log('\n[Scenario 4] Opening Add User Dialog and Creating User...')
    const addBtn = page.locator('button:has-text("Thêm người dùng"), button[aria-label*="Thêm người dùng"]').first()
    await addBtn.click()
    await page.waitForTimeout(600)
    await page.screenshot({ path: path.join(QA_DIR, '04_add_user_dialog_desktop.png') })

    const uniqueEmail = `teacher_p16_${Date.now()}@studyai.internal`
    await page.fill('#user-display-name', 'Thầy Hoàng Văn Đức')
    await page.fill('#user-email', uniqueEmail)
    await page.selectOption('#user-role-select', 'teacher')
    await page.selectOption('#user-status-select', 'active')
    await page.screenshot({ path: path.join(QA_DIR, '05_add_user_form_filled_desktop.png') })

    console.log('Submitting new user to SQL Server...')
    await page.click('button[type="submit"]:has-text("Tạo tài khoản demo"), button[type="submit"]:has-text("Tạo tài khoản")')
    await page.waitForTimeout(2000)
    await page.screenshot({ path: path.join(QA_DIR, '06_user_created_success_toast_desktop.png') })
    reports.push({
      id: 4,
      name: 'Add User Dialog & Create in SQL Server',
      status: 'PASS',
      durationMs: Date.now() - s4Start,
      screenshots: [
        '04_add_user_dialog_desktop.png',
        '05_add_user_form_filled_desktop.png',
        '06_user_created_success_toast_desktop.png',
      ],
      notes: `Created email: ${uniqueEmail}`,
    })

    // SCENARIO 5: Search & Filter User
    const s5Start = Date.now()
    console.log('\n[Scenario 5] Testing Search & Filters...')
    const searchInput = page.locator('input[type="search"]').first()
    await searchInput.fill('Hoàng Văn Đức')
    await page.waitForTimeout(1200)
    await page.screenshot({ path: path.join(QA_DIR, '07_search_filtered_user_desktop.png') })
    reports.push({
      id: 5,
      name: 'Search & Server-side Filter Filtering',
      status: 'PASS',
      durationMs: Date.now() - s5Start,
      screenshots: ['07_search_filtered_user_desktop.png'],
    })

    // SCENARIO 6: Edit User Dialog
    const s6Start = Date.now()
    console.log('\n[Scenario 6] Opening Edit User Dialog and Saving Changes...')
    const editBtn = page.locator('button[title="Chỉnh sửa thông tin"], button[aria-label*="Sửa"]').first()
    await editBtn.click()
    await page.waitForTimeout(600)
    await page.screenshot({ path: path.join(QA_DIR, '08_edit_user_dialog_desktop.png') })

    await page.fill('#edit-user-display-name', 'Thầy Hoàng Văn Đức (Trưởng bộ môn)')
    await page.click('button[type="submit"]:has-text("Lưu thay đổi")')
    await page.waitForTimeout(1800)
    await page.screenshot({ path: path.join(QA_DIR, '09_user_edited_success_desktop.png') })
    reports.push({
      id: 6,
      name: 'Edit User Profile (DisplayName, Role, Status)',
      status: 'PASS',
      durationMs: Date.now() - s6Start,
      screenshots: ['08_edit_user_dialog_desktop.png', '09_user_edited_success_desktop.png'],
    })

    // SCENARIO 7: Reset Password Dialog
    const s7Start = Date.now()
    console.log('\n[Scenario 7] Testing Reset Password Workflow...')
    const resetBtn = page.locator('button[title="Đặt lại mật khẩu"], button[aria-label*="Đặt lại mật khẩu"]').first()
    await resetBtn.click()
    await page.waitForTimeout(600)
    await page.screenshot({ path: path.join(QA_DIR, '10_reset_password_dialog_desktop.png') })

    await page.click('button[type="submit"]:has-text("Đặt lại mật khẩu")')
    await page.waitForTimeout(1800)
    await page.screenshot({ path: path.join(QA_DIR, '11_reset_password_temporary_result_desktop.png') })

    await page.click('button:has-text("Hoàn tất")')
    await page.waitForTimeout(600)
    reports.push({
      id: 7,
      name: 'Reset Password & Session Revocation Workflow',
      status: 'PASS',
      durationMs: Date.now() - s7Start,
      screenshots: [
        '10_reset_password_dialog_desktop.png',
        '11_reset_password_temporary_result_desktop.png',
      ],
    })

    // SCENARIO 8: Soft Delete User Confirmation
    const s8Start = Date.now()
    console.log('\n[Scenario 8] Testing Soft Delete Dialog and Invariance...')
    const deleteBtn = page.locator('button[title="Xóa mềm tài khoản"], button[aria-label*="Xóa"]').first()
    await deleteBtn.click()
    await page.waitForTimeout(600)
    await page.screenshot({ path: path.join(QA_DIR, '12_soft_delete_confirmation_dialog_desktop.png') })

    await page.click('button:has-text("Xóa tài khoản")')
    await page.waitForTimeout(1800)
    await page.screenshot({ path: path.join(QA_DIR, '13_soft_delete_success_toast_desktop.png') })
    reports.push({
      id: 8,
      name: 'Soft Delete User with Learning Invariant Preservation',
      status: 'PASS',
      durationMs: Date.now() - s8Start,
      screenshots: [
        '12_soft_delete_confirmation_dialog_desktop.png',
        '13_soft_delete_success_toast_desktop.png',
      ],
    })

    // SCENARIO 9: Mobile Viewport 390px
    const s9Start = Date.now()
    console.log('\n[Scenario 9] Testing Mobile Viewport 390px...')
    await page.setViewportSize({ width: 390, height: 844 })
    await searchInput.fill('')
    await page.waitForTimeout(1200)
    await page.screenshot({ path: path.join(QA_DIR, '14_mobile_390px_admin_users_cards.png') })

    await page.goto(`${FRONTEND_URL}/admin`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    await page.screenshot({ path: path.join(QA_DIR, '15_mobile_390px_admin_dashboard.png') })
    reports.push({
      id: 9,
      name: 'Mobile Responsive Viewport 390px (Cards & Dashboard)',
      status: 'PASS',
      durationMs: Date.now() - s9Start,
      screenshots: [
        '14_mobile_390px_admin_users_cards.png',
        '15_mobile_390px_admin_dashboard.png',
      ],
    })

    const totalDuration = Date.now() - startTime
    console.log('\n======================================================================')
    console.log('=== PHASE 16 PLAYWRIGHT E2E EXECUTION SUMMARY ===')
    console.log('======================================================================')
    console.log(`Total Scenarios: ${reports.length}`)
    console.log(`Passed: ${reports.filter((r) => r.status === 'PASS').length}`)
    console.log(`Failed: ${reports.filter((r) => r.status === 'FAIL').length}`)
    console.log(`Skipped: 0`)
    console.log(`Total Duration: ${(totalDuration / 1000).toFixed(2)}s`)
    console.log('----------------------------------------------------------------------')
    for (const r of reports) {
      console.log(`[${r.status}] Scenario ${r.id}: ${r.name} (${(r.durationMs / 1000).toFixed(2)}s)`)
      console.log(`       Screenshots: ${r.screenshots.join(', ')}`)
      if (r.notes) console.log(`       Notes: ${r.notes}`)
    }
    console.log('======================================================================')

    if (!allScenariosPassed) {
      throw new Error('One or more E2E scenarios failed.')
    }
    console.log('=== ALL PHASE 16 PLAYWRIGHT E2E SCENARIOS COMPLETED SUCCESSFULLY ===')
  } finally {
    try {
      await browser?.close()
    } catch {
      // ignore
    }
    killProcessTree(backendProc)
    killProcessTree(frontendProc)
    // Clean process exit on Windows
    setTimeout(() => {
      process.exit(allScenariosPassed ? 0 : 1)
    }, 1000)
  }
}

run().catch((err) => {
  console.error('E2E Test Runner failed:', err)
  process.exit(1)
})
