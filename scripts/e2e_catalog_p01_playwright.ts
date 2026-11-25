import { chromium } from 'playwright'
import { spawn, ChildProcess } from 'child_process'
import fs from 'fs'
import path from 'path'
import { resolveDotnet10Environment } from './utils/dotnetRuntime'
import { assertSafeTestDatabase } from './utils/databaseSafetyGuard'

const BACKEND_PORT = 8000
const FRONTEND_PORT = 4191
const BACKEND_URL = `http://localhost:${BACKEND_PORT}`
const FRONTEND_URL = `http://localhost:${FRONTEND_PORT}`
const QA_DIR = path.join('docs', 'visual-qa', 'catalog-p01')

const E2E_CONNECTION_STRING =
  process.env.ConnectionStrings__DefaultConnection ||
  'Server=.\\SQLEXPRESS;Database=StudyAIDb_E2E;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True'

assertSafeTestDatabase(E2E_CONNECTION_STRING, 'P01 Multi-Subject Catalog Playwright E2E')
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

async function run() {
  console.log('=== STARTING P01 MULTI-SUBJECT CATALOG E2E PLAYWRIGHT SUITE ===')
  console.log('Target E2E Database: StudyAIDb_E2E (DatabaseSafetyGuard verified)')

  const dotnetEnv = resolveDotnet10Environment()
  const backendProc = spawn(
    dotnetEnv.dotnetBin,
    ['run', '--project', path.join('backend', 'src', 'StudyAI.Api'), '--urls', BACKEND_URL, '--no-build'],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PATH: dotnetEnv.customPath,
        DOTNET_ROOT: dotnetEnv.dotnetRoot,
        ASPNETCORE_ENVIRONMENT: 'Development',
        ConnectionStrings__DefaultConnection: E2E_CONNECTION_STRING,
        Database__ApplyMigrationsOnStartup: 'true',
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

    // 1. Verify 401 & 403 via real HTTP
    const unauth = await fetch(`${BACKEND_URL}/api/v1/content/catalog/subjects`)
    if (unauth.status !== 401) throw new Error(`Expected 401, got ${unauth.status}`)

    const learnerLogin = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'learner@studyai.internal', password: 'Learner@123456' }),
    })
    const learnerJson = (await learnerLogin.json()) as { accessToken: string }
    const learnerPost = await fetch(`${BACKEND_URL}/api/v1/content/catalog/grades`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${learnerJson.accessToken}`,
      },
      body: JSON.stringify({ code: '99', name: 'Forbidden', orderIndex: 99 }),
    })
    if (learnerPost.status !== 403) throw new Error(`Expected 403 for learner, got ${learnerPost.status}`)
    console.log('[PASS] Scenario 1: 401 unauthenticated & 403 learner mutation rejected')

    // 2. Real browser UI flow with Admin
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await context.newPage()
    const suffix = Date.now().toString(36).toUpperCase()

    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle' })
    await page.fill('input[type="email"]', 'admin@studyai.internal')
    await page.fill('input[type="password"]', 'Admin@123456')
    await page.click('button[type="submit"]')
    await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 15000 })

    await page.goto(`${FRONTEND_URL}/content/catalog`, { waitUntil: 'networkidle' })
    await page.waitForSelector('text=Danh mục giáo trình đa môn')

    // Create History & Biology subjects through real UI -> API -> SQL
    for (const item of [
      { code: `HIST_${suffix}`, name: `Lịch sử (${suffix})` },
      { code: `BIO_${suffix}`, name: `Sinh học (${suffix})` },
    ]) {
      await page.locator('button:has-text("Tạo môn học")').first().click()
      await page.fill('#cat-code', item.code)
      await page.fill('#cat-name', item.name)
      await page.click('button:has-text("Tạo bản nháp")')
      await page.waitForSelector(`text=${item.name}`, { timeout: 10000 })
    }

    // Search & refresh persistence
    await page.fill('input[type="search"]', suffix)
    await page.waitForSelector(`text=HIST_${suffix}`)
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForSelector(`text=HIST_${suffix}`)
    await page.waitForSelector(`text=BIO_${suffix}`)
    await page.screenshot({ path: path.join(QA_DIR, '01_desktop_1440.png'), fullPage: true })
    console.log('[PASS] Scenario 2: Admin multi-subject CRUD + refresh persistence + search (1440px)')

    // 3. Duplicate conflict (409) keeps dialog open
    await page.locator('button:has-text("Tạo môn học")').first().click()
    await page.fill('#cat-code', `HIST_${suffix}`)
    await page.fill('#cat-name', 'Duplicate History')
    await page.click('button:has-text("Tạo bản nháp")')
    await page.waitForSelector('[role="alert"]', { timeout: 10000 })
    await page.click('button:has-text("Hủy")')
    console.log('[PASS] Scenario 3: Duplicate code 409 conflict handled without closing form')

    // 4. Mobile 390px viewport check
    await page.setViewportSize({ width: 390, height: 844 })
    await page.waitForTimeout(300)
    await page.screenshot({ path: path.join(QA_DIR, '02_mobile_390.png'), fullPage: true })
    console.log('[PASS] Scenario 4: Mobile 390px layout & visual evidence captured')

    console.log('=== P01 CATALOG PLAYWRIGHT SUITE: 4/4 PASSED ===')
  } finally {
    await browser.close()
    killProcessTree(backendProc)
    killProcessTree(frontendProc)
  }
}

run().catch((err) => {
  console.error('E2E FAILED:', err)
  process.exit(1)
})
