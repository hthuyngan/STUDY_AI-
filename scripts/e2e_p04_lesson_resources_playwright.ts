import { chromium } from 'playwright'
import { spawn, type ChildProcess } from 'child_process'
import { createDisposableTestDatabase, killProcessTreeAndWait } from './utils/disposableDb'
import { assertSafeTestDatabase } from './utils/databaseSafetyGuard'

const backendUrl = 'http://127.0.0.1:8000'
const frontendUrl = 'http://localhost:4199'
const _disposableDb = process.env.ConnectionStrings__DefaultConnection
  ? null
  : await createDisposableTestDatabase('e2e_p04_lesson_resources')
const connectionString =
  process.env.ConnectionStrings__DefaultConnection || _disposableDb!.connectionString
assertSafeTestDatabase(connectionString, 'P04 lesson resources Playwright')

async function waitFor(url: string, timeout = 90_000) {
  const started = Date.now()
  while (Date.now() - started < timeout) {
    try {
      if ((await fetch(url)).status < 500) return
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`Timeout waiting for ${url}`)
}

async function api(path: string, token: string, body?: object, method?: string) {
  const response = await fetch(`${backendUrl}${path}`, {
    method: method ?? (body ? 'POST' : 'GET'),
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!response.ok) throw new Error(`${path}: ${response.status} ${await response.text()}`)
  return response.json()
}

let backendProc: ChildProcess | null = null
let frontendProc: ChildProcess | null = null
let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null
let exitCode = 0

try {
  backendProc = spawn(
    'dotnet',
    ['run', '--project', 'backend/src/StudyAI.Api', '--urls', backendUrl, '--no-build', '--no-launch-profile'],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        ASPNETCORE_ENVIRONMENT: 'Testing',
        ConnectionStrings__DefaultConnection: connectionString,
      },
      stdio: 'pipe',
      detached: process.platform !== 'win32',
    }
  )
  await waitFor(`${backendUrl}/health/db`)

  frontendProc = spawn(
    'bun',
    ['run', 'preview', '--', '--host', 'localhost', '--port', '4199', '--strictPort'],
    {
      cwd: `${process.cwd()}/frontend`,
      env: { ...process.env, VITE_BACKEND_URL: backendUrl },
      stdio: 'pipe',
      shell: process.platform === 'win32',
      detached: process.platform !== 'win32',
    }
  )
  await waitFor(frontendUrl)

  const adminLogin = await fetch(`${backendUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@studyai.internal', password: 'Admin@123456' }),
  }).then((r) => r.json())

  const reviewerLogin = await fetch(`${backendUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'content@studyai.internal', password: 'Content@123456' }),
  }).then((r) => r.json())

  const studentLogin = await fetch(`${backendUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'learner@studyai.internal', password: 'Learner@123456' }),
  }).then((r) => r.json())

  const adminToken = adminLogin.accessToken as string
  const reviewerToken = reviewerLogin.accessToken as string
  const studentToken = studentLogin.accessToken as string
  const key = Date.now().toString(36).toUpperCase()

  // Seed a published lesson (with 0 videos initially)
  const grade = await api('/api/v1/content/catalog/grades', adminToken, { code: `GP4_${key}`, name: `Khối P04 ${key}` })
  const subj = await api('/api/v1/content/catalog/subjects', adminToken, { code: `SP4_${key}`, name: `Toán P04 ${key}` })
  const curr = await api('/api/v1/content/catalog/curricula', adminToken, {
    code: `CP4_${key}`,
    gradeLevelId: grade.id,
    subjectId: subj.id,
    name: `CT P04 ${key}`,
    framework: 'E2E',
  })
  await api(`/api/v1/content/catalog/curricula/${curr.id}/publish`, adminToken, { rowVersion: curr.rowVersion })
  const ed = await api('/api/v1/content/catalog/editions', adminToken, {
    code: `EP4_${key}`,
    curriculumId: curr.id,
    editionName: `Bản P04 ${key}`,
  })
  await api(`/api/v1/content/catalog/editions/${ed.id}/publish`, adminToken, { rowVersion: ed.rowVersion })

  const ch = await api('/api/v1/content/chapters', adminToken, {
    curriculumEditionId: ed.id,
    code: `CHP4_${key}`,
    title: `Chương P04 ${key}`,
  })
  const chSub = await api(`/api/v1/content/chapters/${ch.id}/submit-review`, adminToken, { rowVersion: ch.rowVersion })
  const chApp = await api(`/api/v1/content/chapters/${ch.id}/approve`, reviewerToken, { rowVersion: chSub.rowVersion })
  await api(`/api/v1/content/chapters/${ch.id}/publish`, reviewerToken, { rowVersion: chApp.rowVersion })

  const les = await api('/api/v1/content/lessons', adminToken, {
    chapterId: ch.id,
    code: `LP4_${key}`,
    title: `Bài học P04 ${key}`,
    slug: `bai-hoc-p04-${key.toLowerCase()}`,
    introduction: 'Mở đầu bài học P04.',
    definitions: [{ term: 'Khái niệm P04', content: 'Nội dung lý thuyết P04.' }],
    sourceName: 'SGK',
    sourceLicense: 'Internal-Approved',
  })
  const lesSub = await api(`/api/v1/content/lessons/${les.id}/submit-review`, adminToken, { rowVersion: les.rowVersion })
  const lesApp = await api(`/api/v1/content/lessons/${les.id}/approve`, reviewerToken, { rowVersion: lesSub.rowVersion })
  await api(`/api/v1/content/lessons/${les.id}/publish`, reviewerToken, { rowVersion: lesApp.rowVersion })

  browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await context.newPage()

  // 1. Login as admin (author + reviewer) in UI
  await page.goto(`${frontendUrl}/login`, { waitUntil: 'domcontentloaded' })
  await page.locator('input[type=email]').fill('admin@studyai.internal')
  await page.locator('input[type=password]').fill('Admin@123456')
  await page.locator('button[type=submit]').click()
  await page.waitForURL((u) => u.pathname !== '/login' && u.pathname !== '/', { timeout: 15_000 })
  await page.waitForTimeout(500)

  // 2. Navigate to Lesson Editor and verify empty optional-resource state
  await page.goto(`${frontendUrl}/content/lessons/${les.id}`, { waitUntil: 'domcontentloaded' })
  await page.getByText('Tài nguyên & Video bài học (Tùy chọn)').waitFor({ timeout: 20_000 })
  await page.getByText(/chưa có tài nguyên đính kèm/i).waitFor({ timeout: 15_000 })

  // 3. Reject unsafe URL
  await page.getByLabel('Tiêu đề tài nguyên').fill('Bad Link')
  await page.getByLabel('Đường dẫn URL tài nguyên').fill('https://127.0.0.1/evil.pdf')
  await page.getByRole('button', { name: 'Thêm tài nguyên' }).click()
  await page.getByRole('alert').waitFor({ timeout: 10_000 })

  // 4. Add valid YouTube video + Document
  await page.getByLabel('Loại tài nguyên').selectOption('video')
  await page.getByLabel('Tiêu đề tài nguyên').fill('Video Hàm Số')
  await page.getByLabel('Đường dẫn URL tài nguyên').fill('https://youtu.be/dQw4w9WgXcQ')
  await page.getByRole('button', { name: 'Thêm tài nguyên' }).click()
  await page.getByText(/Video Hàm Số/).waitFor({ timeout: 10_000 })

  await page.getByLabel('Loại tài nguyên').selectOption('document')
  await page.getByLabel('Tiêu đề tài nguyên').fill('Phiếu bài tập PDF')
  await page.getByLabel('Đường dẫn URL tài nguyên').fill('https://cdn.example.org/worksheet.pdf')
  await page.getByRole('button', { name: 'Thêm tài nguyên' }).click()
  await page.getByText(/Phiếu bài tập PDF/).waitFor({ timeout: 10_000 })

  // 5. Verify + Publish both via UI (wait for each async reload to settle)
  for (let i = 0; i < 2; i++) {
    await page.getByRole('button', { name: 'Xác minh', exact: true }).first().click()
    await page.getByText(/Đã xác minh tài nguyên/).waitFor({ timeout: 10_000 })
  }
  for (let i = 0; i < 2; i++) {
    await page.getByRole('button', { name: 'Xuất bản', exact: true }).first().click()
    await page.getByText(/Đã xuất bản tài nguyên/).waitFor({ timeout: 10_000 })
  }

  // 6. Refresh persistence & 390px mobile viewport
  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload()
  await page.getByText(/Video Hàm Số/).waitFor({ timeout: 15_000 })
  await page.getByText(/Phiếu bài tập PDF/).waitFor({ timeout: 15_000 })

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2)
  if (overflow) throw new Error('Horizontal overflow detected at 390px in LessonEditor resources')

  // 7. Learner view verification in a separate isolated browser context
  const learnerCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const learnerPage = await learnerCtx.newPage()
  await learnerPage.goto(`${frontendUrl}/login`, { waitUntil: 'domcontentloaded' })
  await learnerPage.locator('input[type=email]').fill('learner@studyai.internal')
  await learnerPage.locator('input[type=password]').fill('Learner@123456')
  await learnerPage.locator('button[type=submit]').click()
  await learnerPage.waitForURL((u) => u.pathname !== '/login' && u.pathname !== '/', { timeout: 15_000 })
  await learnerPage.waitForTimeout(400)
  await learnerPage.goto(`${frontendUrl}/subjects/edition/${ed.id}/lessons/${les.id}`, { waitUntil: 'domcontentloaded' })
  await learnerPage.getByText(/Phiếu bài tập PDF/).waitFor({ timeout: 15_000 })
  await learnerCtx.close()

  console.log('P04_PLAYWRIGHT_PASS')
} catch (err) {
  console.error('P04_PLAYWRIGHT_FAIL', err)
  exitCode = 1
} finally {
  if (browser) await browser.close()
  const processes = [backendProc, frontendProc].filter((p): p is ChildProcess => p !== null)
  await Promise.allSettled(processes.map((p) => killProcessTreeAndWait(p)))
  if (_disposableDb) await _disposableDb.cleanup()
  process.exit(exitCode)
}
