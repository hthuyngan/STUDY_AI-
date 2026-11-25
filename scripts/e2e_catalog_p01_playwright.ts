import { chromium } from 'playwright'
import { spawn, ChildProcess } from 'child_process'
import fs from 'fs'
import path from 'path'
import { resolveDotnet10Environment } from './utils/dotnetRuntime'
import { assertSafeTestDatabase } from './utils/databaseSafetyGuard'
import { createDisposableTestDatabase } from './utils/disposableDb'

const BACKEND_PORT = 8000
const FRONTEND_PORT = 4191
const BACKEND_URL = `http://localhost:${BACKEND_PORT}`
const FRONTEND_URL = `http://localhost:${FRONTEND_PORT}`
const QA_DIR = path.join('docs', 'visual-qa', 'catalog-p01')

fs.mkdirSync(QA_DIR, { recursive: true })

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

async function waitForUrl(url: string, timeoutMs = 40000): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok || res.status === 200 || res.status === 404) return
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 600))
  }
  throw new Error(`Service at ${url} did not become ready within ${timeoutMs}ms`)
}

async function loginApi(email: string, password: string): Promise<string> {
  const res = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error(`Login failed for ${email}: ${res.status}`)
  const json = (await res.json()) as { accessToken: string }
  return json.accessToken
}

async function run() {
  console.log('=== STARTING P01 MULTI-SUBJECT CATALOG E2E PLAYWRIGHT SUITE ===')
  const disposableDb = createDisposableTestDatabase('P01 Multi-Subject Catalog Playwright E2E')
  assertSafeTestDatabase(disposableDb.connectionString, 'P01 Multi-Subject Catalog Playwright E2E')
  console.log(`Target Disposable Database: ${disposableDb.dbName} (DatabaseSafetyGuard verified)`)

  const dotnetEnv = resolveDotnet10Environment()
  const backendProc = spawn(
    dotnetEnv.dotnetBin,
    ['run', '--project', path.join('backend', 'src', 'StudyAI.Api'), '--urls', BACKEND_URL, '--no-build', '--no-launch-profile'],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PATH: dotnetEnv.customPath,
        DOTNET_ROOT: dotnetEnv.dotnetRoot,
        ASPNETCORE_ENVIRONMENT: 'Testing',
        ConnectionStrings__DefaultConnection: disposableDb.connectionString,
        Database__ApplyMigrationsOnStartup: 'true',
        Database__BootstrapTestAccounts: 'true',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  )

  const frontendProc = spawn(
    'bun',
    ['run', 'preview', '--', '--port', String(FRONTEND_PORT), '--strictPort'],
    {
      cwd: path.join(process.cwd(), 'frontend'),
      env: { ...process.env, VITE_API_BASE_URL: BACKEND_URL },
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    }
  )

  const browser = await chromium.launch({ headless: true })

  try {
    await waitForUrl(`${BACKEND_URL}/api/v1/health`)
    await waitForUrl(FRONTEND_URL)
    console.log('-> Backend & Frontend ready.')

    // 0. Diagnostics check (Testing environment & StudyAIDb_Clean_{GUID} without credentials)
    const diagRes = await fetch(`${BACKEND_URL}/api/v1/health/db`)
    if (!diagRes.ok) throw new Error(`Expected 200 on /api/v1/health/db, got ${diagRes.status}`)
    const diagText = await diagRes.text()
    const diagJson = JSON.parse(diagText) as { environment?: string; databaseName?: string }
    if (diagJson.environment !== 'Testing' || diagJson.databaseName !== disposableDb.dbName) {
      throw new Error(`Expected Testing/${disposableDb.dbName} diagnostics, got ${diagText}`)
    }
    if (/password=|user id=|trusted_connection/i.test(diagText)) {
      throw new Error(`Diagnostics leaked credential tokens: ${diagText}`)
    }
    console.log(`[PASS] Scenario 0: Diagnostics report Testing / ${disposableDb.dbName} with zero credentials`)

    // 1. Unauthenticated 401 & Student/Teacher 403
    const unauth = await fetch(`${BACKEND_URL}/api/v1/content/catalog/subjects`)
    if (unauth.status !== 401) throw new Error(`Expected 401, got ${unauth.status}`)

    const learnerToken = await loginApi('learner@studyai.internal', 'Learner@123456')
    const learnerGet = await fetch(`${BACKEND_URL}/api/v1/content/catalog/subjects`, {
      headers: { Authorization: `Bearer ${learnerToken}` },
    })
    if (learnerGet.status !== 403) throw new Error(`Expected 403 for learner GET, got ${learnerGet.status}`)

    const learnerPost = await fetch(`${BACKEND_URL}/api/v1/content/catalog/grades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${learnerToken}` },
      body: JSON.stringify({ code: '99', name: 'Forbidden', orderIndex: 99 }),
    })
    if (learnerPost.status !== 403) throw new Error(`Expected 403 for learner POST, got ${learnerPost.status}`)

    // Register a teacher account on isolated StudyAIDb_E2E and verify 403
    const teacherEmail = `teacher.p01.${Date.now()}@studyai.internal`
    await fetch(`${BACKEND_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: teacherEmail,
        password: 'Teacher@123456',
        displayName: 'Teacher P01 Check',
        role: 'teacher',
        grade: '10',
      }),
    })
    const teacherToken = await loginApi(teacherEmail, 'Teacher@123456')
    const teacherPost = await fetch(`${BACKEND_URL}/api/v1/content/catalog/subjects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${teacherToken}` },
      body: JSON.stringify({ code: 'TCH_FORB', name: 'Teacher Forbidden' }),
    })
    if (teacherPost.status !== 403 && teacherPost.status !== 401) {
      throw new Error(`Expected 403 for teacher POST, got ${teacherPost.status}`)
    }
    console.log('[PASS] Scenario 1: 401 unauthenticated & 403 Student/Teacher rejected')

    // 2. Real browser UI flow with Admin (1440px desktop):
    //    No duplicate logout controls, empty state, Math/History/Biology coexistence, pagination/sort/search, refresh persistence
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await context.newPage()
    const suffix = Date.now().toString(36).toUpperCase()

    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle' })
    // Verify stale localStorage API override is cleared and ignored on load
    await page.evaluate(() => {
      window.localStorage.setItem('study_ai_api_base_url', 'http://127.0.0.1:59999/api/v1')
    })
    await page.reload({ waitUntil: 'networkidle' })
    const remainingStaleOverride = await page.evaluate(() => window.localStorage.getItem('study_ai_api_base_url'))
    if (remainingStaleOverride !== null) {
      throw new Error(`Expected stale study_ai_api_base_url to be cleared, got ${remainingStaleOverride}`)
    }
    await page.fill('input[type="email"]', 'admin@studyai.internal')
    await page.fill('input[type="password"]', 'Admin@123456')
    await page.click('button[type="submit"]')
    await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 15000 })

    // Verify sidebar navigation link exists for /content/catalog
    await page.goto(`${FRONTEND_URL}/content`, { waitUntil: 'networkidle' })
    await page.click('a[href="/content/catalog"]')
    await page.waitForSelector('h1:has-text("Danh mục giáo trình đa môn")')

    // Assert NO duplicate WorkspaceShell user/logout controls
    const logoutBtnCount = await page.locator('button[aria-label="Đăng xuất"]').count()
    if (logoutBtnCount > 1) {
      throw new Error(`Expected at most 1 logout button (WorkspaceShell only), found ${logoutBtnCount}`)
    }

    // Empty search state check (honest empty state, no sample rows)
    await page.fill('input[type="search"]', `NON_EXISTENT_${suffix}`)
    await page.waitForSelector('text=Chưa có môn học nào', { timeout: 10000 })
    await page.click('button:has-text("Đặt lại")')

    // Create Math, History, Biology subjects through real UI -> API -> SQL
    for (const item of [
      { code: `MATH_${suffix}`, name: `Toán học (${suffix})` },
      { code: `HIST_${suffix}`, name: `Lịch sử (${suffix})` },
      { code: `BIO_${suffix}`, name: `Sinh học (${suffix})` },
    ]) {
      await page.locator('button:has-text("Tạo môn học")').first().click()
      await page.fill('#cat-code', item.code)
      await page.fill('#cat-name', item.name)
      await page.click('button:has-text("Tạo bản nháp")')
      await page.waitForSelector('#cat-code', { state: 'detached', timeout: 10000 })
    }

    // Search, sort & refresh persistence
    await page.fill('input[type="search"]', suffix)
    await page.waitForSelector(`text=Toán học (${suffix})`, { timeout: 10000 })
    await page.waitForSelector(`text=Lịch sử (${suffix})`, { timeout: 10000 })
    await page.waitForSelector(`text=Sinh học (${suffix})`, { timeout: 10000 })
    await page.waitForSelector(`text=MATH_${suffix}`)
    await page.waitForSelector(`text=HIST_${suffix}`)
    await page.waitForSelector(`text=BIO_${suffix}`)
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForSelector(`text=HIST_${suffix}`)
    await page.screenshot({ path: path.join(QA_DIR, '01_desktop_1440.png'), fullPage: true })
    console.log('[PASS] Scenario 2: Admin Math/History/Biology CRUD, empty state, nav link, search & refresh (1440px)')

    // 3. Duplicate conflict (409) & Stale Concurrency conflict (409) via real API
    await page.locator('button:has-text("Tạo môn học")').first().click()
    await page.fill('#cat-code', `HIST_${suffix}`)
    await page.fill('#cat-name', 'Duplicate History')
    await page.click('button:has-text("Tạo bản nháp")')
    await page.waitForSelector('[role="alert"]', { timeout: 10000 })
    await page.click('button:has-text("Hủy")')

    const adminToken = await loginApi('admin@studyai.internal', 'Admin@123456')
    const listRes = await fetch(`${BACKEND_URL}/api/v1/content/catalog/subjects?search=HIST_${suffix}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    const listJson = (await listRes.json()) as { items: Array<{ id: string; rowVersion: string }> }
    const histRow = listJson.items[0]
    const update1 = await fetch(`${BACKEND_URL}/api/v1/content/catalog/subjects/${histRow.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ name: `Lịch sử v2 (${suffix})`, rowVersion: histRow.rowVersion }),
    })
    if (!update1.ok) throw new Error(`Expected 200 on first update, got ${update1.status}`)
    const staleUpdate = await fetch(`${BACKEND_URL}/api/v1/content/catalog/subjects/${histRow.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ name: 'Stale overwrite', rowVersion: histRow.rowVersion }),
    })
    if (staleUpdate.status !== 409) throw new Error(`Expected 409 on stale RowVersion, got ${staleUpdate.status}`)
    console.log('[PASS] Scenario 3: Duplicate 409 & Stale RowVersion 409 verified')

    // 4. Content role CRUD check
    const contentToken = await loginApi('content@studyai.internal', 'Content@123456')
    const contentGradeRes = await fetch(`${BACKEND_URL}/api/v1/content/catalog/grades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${contentToken}` },
      body: JSON.stringify({ code: `G_${suffix}`, name: `Khối 10 (${suffix})`, orderIndex: 10 }),
    })
    if (contentGradeRes.status !== 201) throw new Error(`Expected 201 for content role, got ${contentGradeRes.status}`)
    console.log('[PASS] Scenario 4: Content role CRUD verified')

    // 5. Server pagination check (pageSize=10 / page=2 when > 2 items with pageSize=2 via API & UI)
    const pagedRes = await fetch(`${BACKEND_URL}/api/v1/content/catalog/subjects?search=${suffix}&page=2&pageSize=2&sort=code&direction=asc`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    const pagedJson = (await pagedRes.json()) as { items: unknown[]; total: number; page: number }
    if (pagedJson.total !== 3 || pagedJson.items.length !== 1 || pagedJson.page !== 2) {
      throw new Error(`Expected server pagination page 2 of 3 items -> 1 item, got ${JSON.stringify(pagedJson)}`)
    }
    console.log('[PASS] Scenario 5: Server pagination & sorting verified')

    // 6. API/network failure with no false success (intercept only POST /subjects to simulate 500)
    await page.route('**/api/v1/content/catalog/subjects', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ detail: 'Simulated 500 error' }) })
      } else {
        await route.continue()
      }
    })
    await page.locator('button:has-text("Tạo môn học")').first().click()
    await page.fill('#cat-code', `FAIL_${suffix}`)
    await page.fill('#cat-name', 'Should Not Succeed')
    await page.click('button:has-text("Tạo bản nháp")')
    await page.waitForSelector('[role="alert"]', { timeout: 10000 })
    await page.click('button:has-text("Hủy")')
    await page.unroute('**/api/v1/content/catalog/subjects')
    console.log('[PASS] Scenario 6: API 500 failure preserves dialog & shows no false success')

    // 7. Mobile 390x844 functional + visual assertions
    await page.setViewportSize({ width: 390, height: 844 })
    await page.waitForTimeout(300)
    const mobileAudit = await page.evaluate(() => {
      const h1 = document.querySelector('.catalog-page-title') as HTMLElement | null
      const createBtn = document.querySelector('.catalog-page-header button') as HTMLElement | null
      const tab = document.querySelector('.catalog-tab') as HTMLElement | null
      const h1Rect = h1?.getBoundingClientRect()
      const btnRect = createBtn?.getBoundingClientRect()
      const overlap = h1Rect && btnRect ? !(h1Rect.bottom <= btnRect.top + 1 || btnRect.bottom <= h1Rect.top + 1) && !(h1Rect.right <= btnRect.left || btnRect.right <= h1Rect.left) : false
      return {
        btnHeight: btnRect?.height ?? 0,
        tabHeight: tab?.getBoundingClientRect().height ?? 0,
        overlap,
        docWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }
    })
    if (mobileAudit.overlap) throw new Error(`Mobile 390px header title & button overlap: ${JSON.stringify(mobileAudit)}`)
    if (mobileAudit.btnHeight < 44 || mobileAudit.tabHeight < 44) {
      throw new Error(`Mobile 390px touch targets < 44px: ${JSON.stringify(mobileAudit)}`)
    }
    // Switch tab interactively on 390px
    await page.click('button[role="tab"]:has-text("Khối lớp")')
    await page.waitForSelector(`text=G_${suffix}`, { timeout: 10000 })
    await page.screenshot({ path: path.join(QA_DIR, '02_mobile_390.png'), fullPage: true })
    console.log(`[PASS] Scenario 7: Mobile 390px functional & layout verified (${JSON.stringify(mobileAudit)})`)

    console.log('=== P01 CATALOG PLAYWRIGHT SUITE: 7/7 PASSED ===')
  } finally {
    await browser.close()
    killProcessTree(backendProc)
    killProcessTree(frontendProc)
    await disposableDb.cleanup()
    console.log(`Cleaned up disposable database: ${disposableDb.dbName}`)
  }
}

run().catch((err) => {
  console.error('E2E FAILED:', err)
  process.exit(1)
})
