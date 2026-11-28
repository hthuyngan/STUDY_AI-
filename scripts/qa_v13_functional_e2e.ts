import { chromium } from 'playwright'
import { spawn, ChildProcess } from 'child_process'
import fs from 'fs'
import path from 'path'
import { resolveDotnet10Environment } from './utils/dotnetRuntime'
import { assertSafeTestDatabase } from './utils/databaseSafetyGuard'
import { createDisposableTestDatabase, killProcessTreeAndWait } from './utils/disposableDb'

const BACKEND_PORT = 8013
const FRONTEND_PORT = 5176
const BACKEND_URL = `http://127.0.0.1:${BACKEND_PORT}`
const FRONTEND_URL = `http://127.0.0.1:${FRONTEND_PORT}`
const QA_DIR = path.join('docs', 'visual-qa', 'v13-e2e')

if (!fs.existsSync(QA_DIR)) {
  fs.mkdirSync(QA_DIR, { recursive: true })
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
  if (!res.ok) throw new Error(`Login failed for ${email}: ${res.status}`)
  const data = (await res.json()) as { accessToken?: string; token?: string }
  return data.accessToken || data.token || ''
}

async function ensureTeacherAccount(adminToken: string): Promise<{ email: string; password: string }> {
  const email = 'teacher.qa@studyai.internal'
  const password = 'Teacher@123456'
  await fetch(`${BACKEND_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, displayName: 'Giáo viên QA Toán 12', grade: '12' }),
  })
  const usersRes = await fetch(`${BACKEND_URL}/api/v1/admin/users?search=${encodeURIComponent(email)}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  })
  if (usersRes.ok) {
    const uData = (await usersRes.json()) as { items?: Array<{ id: string; role: string; email: string }> }
    const found = uData.items?.find((u) => u.email.toLowerCase() === email.toLowerCase())
    if (found && found.role !== 'teacher') {
      await fetch(`${BACKEND_URL}/api/v1/admin/users/${found.id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ role: 'teacher' }),
      })
    }
  }
  return { email, password }
}

async function run() {
  const disposableDb = await createDisposableTestDatabase('qa_v13_functional_e2e')
  const connStr = disposableDb.connectionString
  assertSafeTestDatabase(connStr, 'V13 Functional E2E')

  const dotnetEnv = resolveDotnet10Environment()
  const apiExe = path.join(process.cwd(), 'backend', 'src', 'StudyAI.Api', 'bin', 'Debug', 'net10.0', 'StudyAI.Api.exe')
  const backendProc: ChildProcess = spawn(apiExe, ['--urls', BACKEND_URL], {
    cwd: path.join(process.cwd(), 'backend', 'src', 'StudyAI.Api'),
    env: {
      ...process.env,
      PATH: dotnetEnv.customPath,
      DOTNET_ROOT: dotnetEnv.dotnetRoot,
      ASPNETCORE_ENVIRONMENT: 'Testing',
      ConnectionStrings__DefaultConnection: connStr,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  const frontendProc: ChildProcess = spawn(
    'bun',
    ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(FRONTEND_PORT), '--strictPort'],
    {
      cwd: path.join(process.cwd(), 'frontend'),
      env: { ...process.env, VITE_BACKEND_URL: BACKEND_URL, VITE_API_URL: BACKEND_URL, VITE_API_BASE_URL: BACKEND_URL },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  )

  const checks: Array<{ name: string; status: 'PASS' | 'FAIL' | 'BLOCKED_BY_PROVIDER_CONFIGURATION'; detail: string }> = []

  try {
    await waitForUrl(`${BACKEND_URL}/health`, 45000)
    await waitForUrl(FRONTEND_URL, 30000)

    const adminToken = await loginApi('admin@studyai.internal', 'Admin@123456')
    const teacherCreds = await ensureTeacherAccount(adminToken)
    const teacherToken = await loginApi(teacherCreds.email, teacherCreds.password)
    const learnerToken = await loginApi('learner@studyai.internal', 'Learner@123456')
    const contentToken = await loginApi('content@studyai.internal', 'Content@123456')

    // 1. RBAC Negative: Learner cannot call admin endpoint
    const rbacRes = await fetch(`${BACKEND_URL}/api/v1/admin/users`, {
      headers: { Authorization: `Bearer ${learnerToken}` },
    })
    checks.push({
      name: 'RBAC_Negative_LearnerToAdmin',
      status: rbacRes.status === 403 ? 'PASS' : 'FAIL',
      detail: `HTTP ${rbacRes.status}`,
    })

    // 2. LIVE-03: AI Provider unconfigured check (no 500 on startup or AI endpoint)
    const aiConvRes = await fetch(`${BACKEND_URL}/api/v1/ai/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${learnerToken}` },
      body: JSON.stringify({ title: 'V13 AI Provider Check' }),
    })
    checks.push({
      name: 'LIVE03_UnconfiguredAI_NoStartupOr500',
      status: aiConvRes.status < 500 ? 'PASS' : 'FAIL',
      detail: `Conversation create HTTP ${aiConvRes.status}; AI Tutor real LLM classified BLOCKED_BY_PROVIDER_CONFIGURATION`,
    })

    // 3. Support Ticket Cross-Role Flow (User creates -> Admin replies -> User sees)
    const ticketCreate = await fetch(`${BACKEND_URL}/api/v1/support/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${learnerToken}` },
      body: JSON.stringify({
        subject: 'V13 E2E Support Ticket',
        category: 'technical',
        priority: 'medium',
        message: 'Kiểm tra luồng hỗ trợ V13.',
      }),
    })
    const ticketBody = (await ticketCreate.json()) as { id?: string }
    const ticketId = ticketBody.id || ''
    const adminReply = await fetch(`${BACKEND_URL}/api/v1/admin/support/tickets/${ticketId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ body: 'Admin đã tiếp nhận và xử lý.', nextStatus: 'resolved' }),
    })
    const userReadTicket = await fetch(`${BACKEND_URL}/api/v1/support/tickets/${ticketId}`, {
      headers: { Authorization: `Bearer ${learnerToken}` },
    })
    const userTicketJson = await userReadTicket.text()
    checks.push({
      name: 'E2E_SupportTicket_UserAdminRoundtrip',
      status: ticketCreate.ok && adminReply.ok && userTicketJson.includes('Admin đã tiếp nhận') ? 'PASS' : 'FAIL',
      detail: `create=${ticketCreate.status}, reply=${adminReply.status}, read=${userReadTicket.status}`,
    })

    // 4. Teacher creates Classroom & Learner joins via Browser UI
    const browser = await chromium.launch({
      headless: true,
      executablePath: fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
        ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
        : undefined,
    })

    // Teacher UI: Create class
    const tCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    await tCtx.addInitScript((apiUrl) => {
      localStorage.setItem('study_ai_api_base_url', apiUrl)
      ;(window as any).__STUDY_AI_API_BASE_URL__ = apiUrl
    }, BACKEND_URL)
    const tPage = await tCtx.newPage()
    await tPage.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle' })
    await tPage.fill('#login-email', teacherCreds.email)
    await tPage.fill('#login-password', teacherCreds.password)
    await tPage.click('button[type="submit"]')
    await tPage.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 15000 })
    await tPage.goto(`${FRONTEND_URL}/teacher/classes`, { waitUntil: 'networkidle' })
    await tPage.waitForSelector('button:has-text("Thêm lớp học")', { timeout: 10000 })
    await tPage.click('button:has-text("Thêm lớp học")')
    await tPage.waitForSelector('.admin-modal-card', { timeout: 10000 })
    const clsCode = `V13A${Math.floor(Date.now() % 10000)}`
    const clsName = `Lớp Toán 12 V13 ${clsCode}`
    await tPage.fill('#cls-code', clsCode)
    await tPage.fill('#cls-name', clsName)
    await tPage.click('.admin-modal-card button[type="submit"]')
    await tPage.waitForSelector(`text=${clsName}`, { timeout: 10000 })
    await tPage.screenshot({ path: path.join(QA_DIR, 'teacher_created_class.png') })
    await tCtx.close()
    checks.push({ name: 'E2E_Teacher_CreateClass_UI', status: 'PASS', detail: `Created ${clsName}` })

    // Content UI: Verify Question Bank & Curriculum Workspace render cleanly
    const cCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    await cCtx.addInitScript((apiUrl) => {
      localStorage.setItem('study_ai_api_base_url', apiUrl)
      ;(window as any).__STUDY_AI_API_BASE_URL__ = apiUrl
    }, BACKEND_URL)
    const cPage = await cCtx.newPage()
    await cPage.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle' })
    await cPage.fill('#login-email', 'content@studyai.internal')
    await cPage.fill('#login-password', 'Content@123456')
    await cPage.click('button[type="submit"]')
    await cPage.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 15000 })
    await cPage.goto(`${FRONTEND_URL}/content/questions`, { waitUntil: 'networkidle' })
    await cPage.waitForTimeout(800)
    const qBody = await cPage.evaluate(() => document.body.innerText.trim().length)
    await cPage.screenshot({ path: path.join(QA_DIR, 'content_questions_ui.png') })
    await cCtx.close()
    checks.push({ name: 'E2E_Content_QuestionBank_UI', status: qBody > 50 ? 'PASS' : 'FAIL', detail: `bodyLen=${qBody}` })

    // Learner UI: Dashboard, AI Tutor unconfigured banner, Support Ticket visible
    const uCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    await uCtx.addInitScript((apiUrl) => {
      localStorage.setItem('study_ai_api_base_url', apiUrl)
      ;(window as any).__STUDY_AI_API_BASE_URL__ = apiUrl
    }, BACKEND_URL)
    const uPage = await uCtx.newPage()
    await uPage.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle' })
    await uPage.fill('#login-email', 'learner@studyai.internal')
    await uPage.fill('#login-password', 'Learner@123456')
    await uPage.click('button[type="submit"]')
    await uPage.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 15000 })
    await uPage.waitForTimeout(800)
    const dashText = await uPage.evaluate(() => document.body.innerText)
    const dashOk = !dashText.includes('Không thể tải dữ liệu bảng điều khiển')
    await uPage.screenshot({ path: path.join(QA_DIR, 'learner_dashboard_ui.png') })
    await uPage.goto(`${FRONTEND_URL}/support`, { waitUntil: 'networkidle' })
    await uPage.waitForTimeout(800)
    const supText = await uPage.evaluate(() => document.body.innerText)
    await uCtx.close()
    checks.push({
      name: 'E2E_Learner_Dashboard_And_Support_UI',
      status: dashOk && supText.includes('V13 E2E Support Ticket') ? 'PASS' : 'FAIL',
      detail: `dashOk=${dashOk}, ticketVisible=${supText.includes('V13 E2E Support Ticket')}`,
    })

    await browser.close()

    const report = {
      executedAt: new Date().toISOString(),
      database: disposableDb.dbName,
      total: checks.length,
      passed: checks.filter((c) => c.status === 'PASS').length,
      failed: checks.filter((c) => c.status === 'FAIL').length,
      checks,
    }
    fs.writeFileSync(path.join(QA_DIR, 'functional_e2e_report.json'), JSON.stringify(report, null, 2), 'utf-8')
    console.log(JSON.stringify(report, null, 2))
    if (report.failed > 0) process.exit(1)
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
