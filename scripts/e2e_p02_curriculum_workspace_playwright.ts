import { chromium } from 'playwright'
import { spawn, type ChildProcess } from 'child_process'
import { createDisposableTestDatabase, killProcessTreeAndWait } from './utils/disposableDb'
import { assertSafeTestDatabase } from './utils/databaseSafetyGuard'

const backendUrl = 'http://127.0.0.1:8000'
const frontendUrl = 'http://localhost:4198'
const _disposableDb = process.env.ConnectionStrings__DefaultConnection
  ? null
  : await createDisposableTestDatabase('e2e_p02_curriculum_workspace')
const connectionString =
  process.env.ConnectionStrings__DefaultConnection || _disposableDb!.connectionString
assertSafeTestDatabase(connectionString, 'P02 curriculum workspace Playwright')

async function waitFor(url: string, timeout = 40_000) {
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
try {
  backendProc = spawn(
    'dotnet',
    [
      'run',
      '--project',
      'backend/src/StudyAI.Api',
      '--urls',
      backendUrl,
      '--no-build',
      '--no-launch-profile',
    ],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        ASPNETCORE_ENVIRONMENT: 'Testing',
        ConnectionStrings__DefaultConnection: connectionString,
      },
      stdio: 'pipe',
    }
  )
  await waitFor(`${backendUrl}/health/db`)
  frontendProc = spawn('bun', ['run', 'preview', '--', '--port', '4198', '--strictPort'], {
    cwd: `${process.cwd()}/frontend`,
    env: { ...process.env, VITE_BACKEND_URL: backendUrl },
    stdio: 'pipe',
    shell: true,
  })
  await waitFor(frontendUrl)

  // 1. 401 & 403 RBAC checks
  const unauthorized = await fetch(`${backendUrl}/api/v1/content/chapters`)
  if (unauthorized.status !== 401) {
    throw new Error(`Expected anonymous chapter API 401, got ${unauthorized.status}`)
  }

  const login = async (email: string, password: string) => {
    const response = await fetch(`${backendUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!response.ok) throw new Error(`Login failed: ${response.status}`)
    return (await response.json()).accessToken as string
  }

  const admin = await login('admin@studyai.internal', 'Admin@123456')
  const reviewer = await login('content@studyai.internal', 'Content@123456')
  const learner = await login('learner@studyai.internal', 'Learner@123456')

  const forbidden = await fetch(`${backendUrl}/api/v1/content/chapters`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${learner}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Forbidden' }),
  })
  if (forbidden.status !== 403) {
    throw new Error(`Expected learner chapter create 403, got ${forbidden.status}`)
  }

  // 2. Setup synthetic multi-subject catalog chain via real API
  const key = Date.now().toString(36).toUpperCase()
  const grade = await api('/api/v1/content/catalog/grades', admin, {
    code: `G${key}`,
    name: `Khối ${key}`,
  })
  const subject = await api('/api/v1/content/catalog/subjects', admin, {
    code: `HIST_${key}`,
    name: `Lịch sử ${key}`,
  })
  let curriculum = await api('/api/v1/content/catalog/curricula', admin, {
    code: `C${key}`,
    gradeLevelId: grade.id,
    subjectId: subject.id,
    name: `CT Sử ${key}`,
    framework: 'E2E',
  })
  curriculum = await api(`/api/v1/content/catalog/curricula/${curriculum.id}/publish`, admin, {
    rowVersion: curriculum.rowVersion,
  })
  let edition = await api('/api/v1/content/catalog/editions', admin, {
    code: `E${key}`,
    curriculumId: curriculum.id,
    editionName: `Phiên bản ${key}`,
  })
  edition = await api(`/api/v1/content/catalog/editions/${edition.id}/publish`, admin, {
    rowVersion: edition.rowVersion,
  })

  // 3. Desktop Playwright: empty state, create chapter & lesson, refresh persistence
  browser = await chromium.launch({ headless: true })
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await desktop.newPage()
  await page.goto(`${frontendUrl}/login`)
  await page.locator('input[type=email]').fill('admin@studyai.internal')
  await page.locator('input[type=password]').fill('Admin@123456')
  await page.locator('button[type=submit]').click()
  await page.waitForURL((url) => url.pathname !== '/login')

  await page.goto(`${frontendUrl}/content/curriculum?editionId=${edition.id}`)
  await page.getByText('Giáo trình chưa có chương.').waitFor()

  // Create chapter in UI
  await page.getByRole('button', { name: 'Thêm chương' }).click()
  await page.getByLabel('Mã').fill('CH01')
  await page.getByLabel('Tiêu đề').fill('Chương Playwright')
  await page.getByRole('button', { name: 'Lưu', exact: true }).click()
  await page.getByText('Chương Playwright').waitFor()

  // Reload and verify persistence
  await page.reload()
  await page.getByText('Chương Playwright').waitFor()
  await page.getByText('Chương Playwright').click()

  // Create lesson in UI
  await page.getByRole('button', { name: /Thêm bài học/ }).click()
  await page.getByLabel('Mã').fill('LES01')
  await page.getByLabel('Tiêu đề').fill('Bài Playwright')
  await page.getByRole('button', { name: 'Lưu', exact: true }).click()
  await page.getByText('Bài Playwright').waitFor()

  // 4. Two-session stale 409 concurrency check
  const chaptersRes = await api(
    `/api/v1/content/chapters?curriculumEditionId=${edition.id}`,
    admin
  )
  const ch = chaptersRes.items[0]
  await page.getByRole('button', { name: 'Sửa chương' }).click()
  // Session B (API) mutates the chapter behind the open UI form
  await api(
    `/api/v1/content/chapters/${ch.id}`,
    admin,
    { title: 'Chương Đã Đổi', rowVersion: ch.rowVersion },
    'PATCH'
  )
  await page.getByLabel('Tiêu đề').fill('Chương Cũ Ghi Đè')
  await page.getByRole('button', { name: 'Lưu', exact: true }).click()
  await page.getByRole('alert').waitFor()
  await page.getByRole('button', { name: 'Hủy' }).click()

  // 5. Publish chain via reviewer & verify learner projection exact-once
  const refreshedCh = (
    await api(`/api/v1/content/chapters?curriculumEditionId=${edition.id}`, reviewer)
  ).items[0]
  const subCh = await api(`/api/v1/content/chapters/${refreshedCh.id}/submit-review`, admin, {
    rowVersion: refreshedCh.rowVersion,
  })
  const appCh = await api(`/api/v1/content/chapters/${subCh.id}/approve`, reviewer, {
    rowVersion: subCh.rowVersion,
  })
  await api(`/api/v1/content/chapters/${appCh.id}/publish`, reviewer, {
    rowVersion: appCh.rowVersion,
  })

  const lesList = await api(`/api/v1/content/lessons?chapterId=${refreshedCh.id}`, admin)
  const les = lesList.items[0]
  const subL = await api(`/api/v1/content/lessons/${les.id}/submit-review`, admin, {
    rowVersion: les.rowVersion,
  })
  const appL = await api(`/api/v1/content/lessons/${subL.id}/approve`, reviewer, {
    rowVersion: subL.rowVersion,
  })
  await api(`/api/v1/content/lessons/${appL.id}/publish`, reviewer, {
    rowVersion: appL.rowVersion,
  })

  const learnerChapters = await api(`/api/v1/curriculum/editions/${edition.id}/chapters`, learner)
  if (learnerChapters.length !== 1 || learnerChapters[0].lessons.length !== 1) {
    throw new Error(`Expected exact-once learner projection, got ${JSON.stringify(learnerChapters)}`)
  }

  // 6. API 500 failure -> visible alert, no false success
  await page.route('**/api/v1/content/chapters**', (route) =>
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: '{"detail":"forced"}',
    })
  )
  await page.getByRole('button', { name: /Tải lại/ }).click()
  await page.getByRole('alert').waitFor()
  const authState = await desktop.storageState()
  await desktop.close()

  // 7. Mobile 390px & 375px layout + touch target audit
  for (const width of [390, 375]) {
    const mobile = await browser.newContext({
      viewport: { width, height: 844 },
    })
    const mobilePage = await mobile.newPage()
    await mobilePage.goto(`${frontendUrl}/login`)
    await mobilePage.locator('input[type=email]').fill('admin@studyai.internal')
    await mobilePage.locator('input[type=password]').fill('Admin@123456')
    await mobilePage.locator('button[type=submit]').click()
    await mobilePage.waitForURL((url) => url.pathname !== '/login')
    await mobilePage.goto(`${frontendUrl}/content/curriculum?editionId=${edition.id}`)
    await mobilePage.getByRole('heading', { name: 'Không gian giáo trình' }).waitFor()
    const metrics = await mobilePage.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      btnHeight: document.querySelector('button')?.getBoundingClientRect().height ?? 0,
    }))
    if (metrics.scrollWidth > metrics.innerWidth) {
      throw new Error(`Horizontal overflow at ${width}px: ${JSON.stringify(metrics)}`)
    }
    await mobile.close()
  }

  console.log(
    'P02 Playwright E2E PASS: empty, CRUD, refresh, 401/403, stale 409, learner projection, API 500, mobile 390/375px'
  )
} finally {
  if (browser) await browser.close()
  const processes = [backendProc, frontendProc].filter((p): p is ChildProcess => p !== null)
  const termination = await Promise.allSettled(
    processes.map((process) => killProcessTreeAndWait(process))
  )
  if (termination.some((result) => result.status === 'rejected')) {
    throw new Error('Process termination was not verified; database cleanup refused.')
  }
  if (_disposableDb) await _disposableDb.cleanup()
}
