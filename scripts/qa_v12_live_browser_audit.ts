import { chromium } from 'playwright'
import { spawn, ChildProcess } from 'child_process'
import fs from 'fs'
import path from 'path'
import { resolveDotnet10Environment } from './utils/dotnetRuntime'
import { assertSafeTestDatabase } from './utils/databaseSafetyGuard'
import { createDisposableTestDatabase, killProcessTreeAndWait } from './utils/disposableDb'

const BACKEND_PORT = 8012
const FRONTEND_PORT = 5175
const BACKEND_URL = `http://127.0.0.1:${BACKEND_PORT}`
const FRONTEND_URL = `http://127.0.0.1:${FRONTEND_PORT}`
const QA_DIR = path.join('docs', 'visual-qa', 'v12-audit')

if (!fs.existsSync(QA_DIR)) {
  fs.mkdirSync(QA_DIR, { recursive: true })
}

interface RouteAudit {
  role: string
  route: string
  status: 'PASS' | 'FAIL'
  finalUrl: string
  httpErrors: Array<{ url: string; status: number }>
  consoleErrors: string[]
  pageErrors: string[]
  requestFailures: string[]
  overflowDesktop: boolean
  overflowMobile: boolean
  bodyLength: number
  notes?: string
}

async function waitForUrl(url: string, timeoutMs = 45000): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok || res.status === 200 || res.status === 404) return
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`Service at ${url} did not become ready within ${timeoutMs}ms`)
}

async function loginApi(email: string, password: string): Promise<string> {
  const res = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    throw new Error(`Login API failed for ${email}: ${res.status} ${await res.text()}`)
  }
  const data = (await res.json()) as { accessToken?: string; token?: string }
  return data.accessToken || data.token || ''
}

async function ensureTeacherAccount(adminToken: string): Promise<{ email: string; password: string }> {
  const email = 'teacher.qa@studyai.internal'
  const password = 'Teacher@123456'
  const regRes = await fetch(`${BACKEND_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      displayName: 'Giáo viên QA Toán 12',
      grade: '12',
    }),
  })
  if (!regRes.ok && regRes.status !== 409) {
    throw new Error(`Register teacher failed: ${regRes.status} ${await regRes.text()}`)
  }
  const usersRes = await fetch(`${BACKEND_URL}/api/v1/admin/users?search=${encodeURIComponent(email)}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  })
  if (usersRes.ok) {
    const uData = (await usersRes.json()) as { items?: Array<{ id: string; role: string; email: string }> }
    const found = uData.items?.find((u) => u.email.toLowerCase() === email.toLowerCase())
    if (found && found.role !== 'teacher') {
      const roleRes = await fetch(`${BACKEND_URL}/api/v1/admin/users/${found.id}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ role: 'teacher' }),
      })
      if (!roleRes.ok) {
        throw new Error(`Promote teacher role failed: ${roleRes.status} ${await roleRes.text()}`)
      }
    }
  }
  return { email, password }
}

async function run() {
  const disposableDb = await createDisposableTestDatabase('qa_v12_live_audit')
  const connStr = disposableDb.connectionString
  assertSafeTestDatabase(connStr, 'V12 Live QA')

  const dotnetEnv = resolveDotnet10Environment()
  const apiExe = path.join(process.cwd(), 'backend', 'src', 'StudyAI.Api', 'bin', 'Debug', 'net10.0', 'StudyAI.Api.exe')
  const backendProc: ChildProcess = spawn(
    apiExe,
    ['--urls', BACKEND_URL],
    {
      cwd: path.join(process.cwd(), 'backend', 'src', 'StudyAI.Api'),
      env: {
        ...process.env,
        PATH: dotnetEnv.customPath,
        DOTNET_ROOT: dotnetEnv.dotnetRoot,
        ASPNETCORE_ENVIRONMENT: 'Testing',
        ConnectionStrings__DefaultConnection: connStr,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  )

  const frontendProc: ChildProcess = spawn(
    'bun',
    ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(FRONTEND_PORT), '--strictPort'],
    {
      cwd: path.join(process.cwd(), 'frontend'),
      env: {
        ...process.env,
        VITE_BACKEND_URL: BACKEND_URL,
        VITE_API_URL: BACKEND_URL,
        VITE_API_BASE_URL: BACKEND_URL,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  )

  const results: RouteAudit[] = []
  let sidebarCheck: { brandText: string; hasAiTutor: boolean; hasOldStudyAi: boolean; menuItems: string[] } = {
    brandText: '',
    hasAiTutor: false,
    hasOldStudyAi: false,
    menuItems: [],
  }

  try {
    await waitForUrl(`${BACKEND_URL}/health`, 45000)
    await waitForUrl(FRONTEND_URL, 30000)

    const adminToken = await loginApi('admin@studyai.internal', 'Admin@123456')
    const teacherCreds = await ensureTeacherAccount(adminToken)

    const browser = await chromium.launch({
      headless: true,
      executablePath: fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
        ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
        : undefined,
    })

    const roleSuites: Array<{
      role: string
      email: string
      password: string
      routes: string[]
      checkSidebar?: boolean
    }> = [
      {
        role: 'User',
        email: 'learner@studyai.internal',
        password: 'Learner@123456',
        checkSidebar: true,
        routes: [
          '/dashboard',
          '/ai-tutor',
          '/subjects/math',
          '/practice',
          '/exam-preparation',
          '/my-notes',
          '/assignments',
          '/schedule',
          '/subscriptions',
          '/support',
        ],
      },
      {
        role: 'Content',
        email: 'content@studyai.internal',
        password: 'Content@123456',
        routes: [
          '/content',
          '/content/curriculum',
          '/content/lessons',
          '/content/questions',
          '/content/assessments',
          '/content/materials',
          '/content/review',
          '/content/knowledge-base',
          '/content/error-reports',
          '/content/publications',
        ],
      },
      {
        role: 'Teacher',
        email: teacherCreds.email,
        password: teacherCreds.password,
        routes: [
          '/teacher',
          '/teacher/classes',
          '/teacher/assignments',
          '/teacher/exams',
          '/teacher/grades',
          '/teacher/materials',
          '/teacher/ai-assistant',
          '/teacher/schedule',
          '/teacher/announcements',
        ],
      },
      {
        role: 'Admin',
        email: 'admin@studyai.internal',
        password: 'Admin@123456',
        routes: [
          '/admin',
          '/admin/users',
          '/admin/roles',
          '/admin/api-management',
          '/admin/subscriptions',
          '/admin/tickets',
          '/admin/audit-logs',
        ],
      },
    ]

    for (const suite of roleSuites) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
      await context.addInitScript((apiUrl) => {
        localStorage.setItem('study_ai_api_base_url', apiUrl)
        ;(window as any).__STUDY_AI_API_BASE_URL__ = apiUrl
      }, BACKEND_URL)

      const page = await context.newPage()
      await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle' })
      await page.fill('#login-email', suite.email)
      await page.fill('#login-password', suite.password)
      await page.click('button[type="submit"]')
      await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 })
      await page.waitForTimeout(800)

      if (suite.checkSidebar) {
        sidebarCheck = await page.evaluate(() => {
          const sidebar = document.querySelector('aside.sidebar')
          const brand = sidebar?.querySelector('.sidebar-brand-text')?.textContent?.trim() || ''
          const items = Array.from(sidebar?.querySelectorAll('.sidebar-item, a') || [])
            .map((el) => el.textContent?.trim() || '')
            .filter(Boolean)
          return {
            brandText: brand,
            hasAiTutor: brand.includes('AI TUTOR') && brand.includes('TOÁN 12'),
            hasOldStudyAi: brand.includes('STUDY AI'),
            menuItems: items,
          }
        })
      }

      for (const route of suite.routes) {
        const httpErrors: Array<{ url: string; status: number }> = []
        const consoleErrors: string[] = []
        const pageErrors: string[] = []
        const requestFailures: string[] = []

        const onResponse = (res: any) => {
          if (res.status() >= 400) {
            httpErrors.push({ url: res.url(), status: res.status() })
          }
        }
        const onConsole = (msg: any) => {
          if (msg.type() === 'error') consoleErrors.push(msg.text())
        }
        const onPageError = (err: Error) => pageErrors.push(err.message)
        const onReqFailed = (req: any) => requestFailures.push(`${req.url()}: ${req.failure()?.errorText}`)

        page.on('response', onResponse)
        page.on('console', onConsole)
        page.on('pageerror', onPageError)
        page.on('requestfailed', onReqFailed)

        await page.setViewportSize({ width: 1440, height: 900 })
        await page.goto(`${FRONTEND_URL}${route}`, { waitUntil: 'networkidle' })
        await page.waitForTimeout(700)

        const bodyText = await page.evaluate(() => document.body.innerText.trim())
        const overflowDesktop = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2)

        await page.setViewportSize({ width: 390, height: 844 })
        await page.waitForTimeout(250)
        const overflowMobile = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2)

        if (route === '/dashboard' || route === '/content' || route === '/teacher' || route === '/admin') {
          await page.setViewportSize({ width: 1440, height: 900 })
          await page.screenshot({ path: path.join(QA_DIR, `${suite.role.toLowerCase()}_dashboard.png`) })
        }

        page.off('response', onResponse)
        page.off('console', onConsole)
        page.off('pageerror', onPageError)
        page.off('requestfailed', onReqFailed)

        const hasErrorBanner = bodyText.includes('Không thể tải dữ liệu bảng điều khiển')
        const status =
          httpErrors.some((e) => e.status >= 500) ||
          pageErrors.length > 0 ||
          bodyText.length < 20 ||
          hasErrorBanner
            ? 'FAIL'
            : 'PASS'

        results.push({
          role: suite.role,
          route,
          status,
          finalUrl: page.url(),
          httpErrors,
          consoleErrors,
          pageErrors,
          requestFailures,
          overflowDesktop,
          overflowMobile,
          bodyLength: bodyText.length,
          notes: hasErrorBanner ? 'Dashboard error banner visible' : undefined,
        })
      }

      await context.close()
    }

    await browser.close()
    const report = {
      auditedAt: new Date().toISOString(),
      database: disposableDb.dbName,
      sidebarCheck,
      totalRoutes: results.length,
      passed: results.filter((r) => r.status === 'PASS').length,
      failed: results.filter((r) => r.status === 'FAIL').length,
      results,
    }
    fs.writeFileSync(path.join(QA_DIR, 'live_audit_report.json'), JSON.stringify(report, null, 2), 'utf-8')
    console.log(JSON.stringify({ sidebarCheck, totalRoutes: report.totalRoutes, passed: report.passed, failed: report.failed }, null, 2))
  } catch (err) {
    console.error('AUDIT_RUNTIME_ERROR:', err)
    throw err
  } finally {
    await killProcessTreeAndWait(frontendProc.pid)
    await killProcessTreeAndWait(backendProc.pid)
    await new Promise((r) => setTimeout(r, 2500))
    await disposableDb.cleanup()
  }
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
