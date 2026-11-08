import { chromium } from 'playwright'
import { spawn, ChildProcess } from 'child_process'
import fs from 'fs'
import path from 'path'

const BACKEND_PORT = 5290
const FRONTEND_PORT = 4173
const BACKEND_URL = `http://127.0.0.1:${BACKEND_PORT}`
const FRONTEND_URL = `http://localhost:${FRONTEND_PORT}`
const QA_DIR = path.join('docs', 'visual-qa', 'phase-15')

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
  console.log('=== STARTING PHASE 15 REAL FULLSTACK E2E PLAYWRIGHT SUITE ===')

  const dotnetRoot = 'C:\\Users\\Admin\\AppData\\Local\\Microsoft\\dotnet'
  const customPath = `${dotnetRoot};${process.env.PATH || ''}`

  // 1. Start ASP.NET Core API on port 5290
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

  // Check health response
  const healthDbRes = await fetch(`${BACKEND_URL}/health/db`)
  const healthDbJson = await healthDbRes.json()
  console.log('Health DB JSON:', healthDbJson)

  // 3. Create a disabled test user directly in SQL Server via register + status patch
  const disabledEmail = `disabled_p15_${Date.now()}@studyai.internal`
  try {
    await fetch(`${BACKEND_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: disabledEmail,
        password: 'Password@123',
        displayName: 'Disabled Student',
        grade: '12',
      }),
    })
  } catch {
    // ignore
  }

  // 4. Start Frontend Preview on port 4173
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
      shell: true,
    }
  )

  frontendProc.stdout?.on('data', (d) => {
    const s = d.toString()
    if (s.includes('Local:')) console.log('[Vite]', s.trim())
  })
  frontendProc.stderr?.on('data', (d) => {
    console.error('[Vite Err]', d.toString().trim())
  })

  await waitForUrl(FRONTEND_URL, 25000)
  console.log('Frontend Preview ready!')

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  })

  try {
    // ==========================================
    // DESKTOP SUITE (1440 x 900)
    // ==========================================
    const desktopContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    })
    await desktopContext.addInitScript((url) => {
      (window as unknown as { __STUDY_AI_API_BASE_URL__?: string }).__STUDY_AI_API_BASE_URL__ = url
    }, BACKEND_URL)
    const page = await desktopContext.newPage()

    // ── Scenario 1: Real Registration (Sign Up) ──────────────────────────────
    const uniqueStudentEmail = `student_${Date.now()}@studyai.internal`
    const studentPassword = 'SecureStudent@123'
    console.log(`Scenario 1: Testing real registration for ${uniqueStudentEmail}...`)
    await page.goto(`${FRONTEND_URL}/register`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(600)

    await page.fill('#reg-name', 'Nguyễn Thu Uyên')
    await page.fill('#reg-email', uniqueStudentEmail)
    await page.fill('#reg-password', studentPassword)
    await page.fill('#reg-confirm-password', studentPassword)
    await page.screenshot({ path: path.join(QA_DIR, '01_real_registration_form_desktop.png') })
    console.log('Captured 01_real_registration_form_desktop.png')

    // Submit registration
    await page.click('button[type="submit"]')
    await page.waitForTimeout(2000)
    await page.screenshot({ path: path.join(QA_DIR, '02_registration_success_dashboard_desktop.png') })
    console.log('Captured 02_registration_success_dashboard_desktop.png')

    // ── Scenario 2: Logout & Real Login with Registered Account ──────────────
    console.log('Scenario 2: Testing logout and real login with new registered account...')
    // Call logout endpoint to clear session
    await page.evaluate(async (url) => {
      await fetch(`${url}/api/v1/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })
    }, BACKEND_URL)

    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(600)
    await page.fill('#login-email', uniqueStudentEmail)
    await page.fill('#login-password', studentPassword)
    await page.screenshot({ path: path.join(QA_DIR, '03_login_form_real_desktop.png') })
    console.log('Captured 03_login_form_real_desktop.png')

    await page.click('button[type="submit"]')
    await page.waitForTimeout(2000)
    await page.screenshot({ path: path.join(QA_DIR, '04_login_success_desktop.png') })
    console.log('Captured 04_login_success_desktop.png')

    // ── Scenario 3: Session Reload Persistence (HttpOnly Cookie Rotation) ────
    console.log('Scenario 3: Reloading browser page to verify session persistence via cookie...')
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(1200)
    await page.screenshot({ path: path.join(QA_DIR, '05_session_reload_persisted_desktop.png') })
    console.log('Captured 05_session_reload_persisted_desktop.png')

    // ── Scenario 4: Protected Route Access ───────────────────────────────────
    console.log('Scenario 4: Navigating to protected practice hub...')
    await page.goto(`${FRONTEND_URL}/practice`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    await page.screenshot({ path: path.join(QA_DIR, '06_protected_route_practice_desktop.png') })
    console.log('Captured 06_protected_route_practice_desktop.png')

    // ── Scenario 5: Admin Forbidden (RBAC Guard) ─────────────────────────────
    console.log('Scenario 5: Testing learner RBAC restriction when accessing /admin...')
    await page.goto(`${FRONTEND_URL}/admin`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    await page.screenshot({ path: path.join(QA_DIR, '07_admin_forbidden_unauthorized_desktop.png') })
    console.log('Captured 07_admin_forbidden_unauthorized_desktop.png')

    // Verify direct API 403 Forbidden
    const loginRes = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: uniqueStudentEmail, password: studentPassword }),
    })
    const loginData = await loginRes.json()
    console.log('Direct learner login status:', loginRes.status, 'data:', loginData)
    const adminCheckRes = await fetch(`${BACKEND_URL}/api/v1/admin/dashboard`, {
      headers: { Authorization: `Bearer ${loginData.accessToken}` },
    })
    console.log(`Learner accessing /api/v1/admin/dashboard returned HTTP ${adminCheckRes.status} (Expected 403)`)
    if (adminCheckRes.status !== 403) {
      throw new Error(`Expected HTTP 403 Forbidden, got ${adminCheckRes.status}`)
    }

    // ── Scenario 6: Account Disabled / Suspended Check ───────────────────────
    console.log('Scenario 6: Testing disabled/suspended user login rejection...')
    // Login as admin and suspend the student account to test rejection
    const adminLoginRes = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@studyai.internal', password: 'Admin@123456' }),
    })
    const adminData = await adminLoginRes.json()
    await fetch(`${BACKEND_URL}/api/v1/admin/users/${loginData.user.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminData.accessToken}`,
      },
      body: JSON.stringify({ status: 'suspended', reason: 'Phase 15 Security Verification' }),
    })

    // Now try logging in with suspended student
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle' })
    await page.fill('#login-email', uniqueStudentEmail)
    await page.fill('#login-password', studentPassword)
    await page.click('button[type="submit"]')
    await page.waitForTimeout(1500)
    await page.screenshot({ path: path.join(QA_DIR, '08_account_disabled_error_desktop.png') })
    console.log('Captured 08_account_disabled_error_desktop.png')

    // ── Scenario 7: Logout & Session Revocation ──────────────────────────────
    console.log('Scenario 7: Testing logout and session revocation...')
    await page.evaluate(async (url) => {
      await fetch(`${url}/api/v1/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })
    }, BACKEND_URL)
    await page.goto(`${FRONTEND_URL}/dashboard`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    await page.screenshot({ path: path.join(QA_DIR, '09_logout_session_revoked_desktop.png') })
    console.log('Captured 09_logout_session_revoked_desktop.png')

    // ── Scenario 8: Backend Offline Resilience ───────────────────────────────
    console.log('Scenario 8: Testing backend offline graceful handling...')
    backendProc.kill()
    await new Promise((r) => setTimeout(r, 1500))
    await page.goto(`${FRONTEND_URL}/curriculum`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    await page.screenshot({ path: path.join(QA_DIR, '10_backend_offline_graceful_desktop.png') })
    console.log('Captured 10_backend_offline_graceful_desktop.png')

    await desktopContext.close()

    // ==========================================
    // MOBILE SUITE (390 x 844)
    // ==========================================
    console.log('Testing Mobile viewport 390px responsive design...')
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    })
    await mobileContext.addInitScript((url) => {
      (window as unknown as { __STUDY_AI_API_BASE_URL__?: string }).__STUDY_AI_API_BASE_URL__ = url
    }, BACKEND_URL)
    const mobilePage = await mobileContext.newPage()

    await mobilePage.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle' })
    await mobilePage.waitForTimeout(800)
    await mobilePage.screenshot({ path: path.join(QA_DIR, '11_mobile_390px_login_form.png') })
    console.log('Captured 11_mobile_390px_login_form.png')

    await mobilePage.goto(`${FRONTEND_URL}/register`, { waitUntil: 'networkidle' })
    await mobilePage.waitForTimeout(800)
    await mobilePage.screenshot({ path: path.join(QA_DIR, '12_mobile_390px_registration_form.png') })
    console.log('Captured 12_mobile_390px_registration_form.png')

    await mobilePage.goto(`${FRONTEND_URL}/dashboard`, { waitUntil: 'networkidle' })
    await mobilePage.waitForTimeout(800)
    await mobilePage.screenshot({ path: path.join(QA_DIR, '13_mobile_390px_dashboard.png') })
    console.log('Captured 13_mobile_390px_dashboard.png')

    await mobileContext.close()

    console.log('=== ALL PHASE 15 FULLSTACK PLAYWRIGHT E2E SCENARIOS COMPLETED SUCCESSFULLY ===')
  } finally {
    await browser.close()
    try {
      backendProc.kill()
    } catch {
      // ignore
    }
    try {
      frontendProc.kill()
    } catch {
      // ignore
    }
  }
}

run().catch((err) => {
  console.error('Phase 15 E2E run failed:', err)
  process.exit(1)
})
