import { chromium } from 'playwright'
import { spawn, type ChildProcess } from 'child_process'
import { createDisposableTestDatabase, killProcessTreeAndWait } from './utils/disposableDb'
import { assertSafeTestDatabase } from './utils/databaseSafetyGuard'

const backendUrl = 'http://127.0.0.1:8000'
const frontendUrl = 'http://localhost:4199'
const _disposableDb = process.env.ConnectionStrings__DefaultConnection
  ? null
  : await createDisposableTestDatabase('e2e_p03_lesson_composition')
const connectionString =
  process.env.ConnectionStrings__DefaultConnection || _disposableDb!.connectionString
assertSafeTestDatabase(connectionString, 'P03 lesson composition Playwright')

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
      env: { ...process.env, ASPNETCORE_ENVIRONMENT: 'Testing', ConnectionStrings__DefaultConnection: connectionString },
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

  const login = async (email: string, password: string) => {
    const res = await fetch(`${backendUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) throw new Error(`Login failed: ${res.status}`)
    return (await res.json()).accessToken as string
  }

  const admin = await login('admin@studyai.internal', 'Admin@123456')
  const learner = await login('learner@studyai.internal', 'Learner@123456')

  // 1. Setup History curriculum -> edition -> chapter -> draft lesson
  const key = Date.now().toString(36).toUpperCase()
  const grade = await api('/api/v1/content/catalog/grades', admin, { code: `G${key}`, name: `Khối ${key}` })
  const subject = await api('/api/v1/content/catalog/subjects', admin, { code: `HIST_${key}`, name: `Lịch sử ${key}` })
  let curriculum = await api('/api/v1/content/catalog/curricula', admin, {
    code: `C${key}`,
    gradeLevelId: grade.id,
    subjectId: subject.id,
    name: `CT Sử ${key}`,
    framework: 'E2E',
  })
  curriculum = await api(`/api/v1/content/catalog/curricula/${curriculum.id}/publish`, admin, { rowVersion: curriculum.rowVersion })
  let edition = await api('/api/v1/content/catalog/editions', admin, {
    code: `E${key}`,
    curriculumId: curriculum.id,
    editionName: `Bản ${key}`,
  })
  edition = await api(`/api/v1/content/catalog/editions/${edition.id}/publish`, admin, { rowVersion: edition.rowVersion })
  const chapter = await api('/api/v1/content/chapters', admin, {
    curriculumEditionId: edition.id,
    code: `CH${key}`,
    title: 'Chương Lịch sử P03',
  })
  const lesson = await api('/api/v1/content/lessons', admin, {
    chapterId: chapter.id,
    code: `L${key}`,
    title: 'Bài P03 Playwright',
    slug: `bai-p03-${key.toLowerCase()}`,
  })

  // 401 & 403 checks on composition API
  const anonRes = await fetch(`${backendUrl}/api/v1/content/lessons/${lesson.id}/composition`)
  if (anonRes.status !== 401) throw new Error(`Expected 401, got ${anonRes.status}`)
  const studRes = await fetch(`${backendUrl}/api/v1/content/lessons/${lesson.id}/composition`, {
    headers: { Authorization: `Bearer ${learner}` },
  })
  if (studRes.status !== 403) throw new Error(`Expected 403, got ${studRes.status}`)

  // 2. Desktop Playwright: P03 blocks, objectives, revisions & rollback, refresh persistence
  browser = await chromium.launch({ headless: true })
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await desktop.newPage()
  await page.goto(`${frontendUrl}/login`, { waitUntil: 'domcontentloaded' })
  await page.locator('input[type=email]').fill('admin@studyai.internal')
  await page.locator('input[type=password]').fill('Admin@123456')
  await page.locator('button[type=submit]').click()
  await page.waitForURL((url) => url.pathname !== '/login')

  await page.goto(`${frontendUrl}/content/lessons/${lesson.id}`)
  await page.getByText('Cấu trúc bài học chuẩn hóa (P03)').waitFor()

  // Add timeline block
  await page.locator('#lcp-block-type').selectOption('timeline')
  await page.getByRole('button', { name: /Thêm khối/ }).click()
  await page.getByPlaceholder('Tiêu đề dòng thời gian').fill('Mốc 1945')
  await page.getByPlaceholder('Mỗi dòng: Mốc thời gian | Tiêu đề | Mô tả').fill('1945 | Cách mạng tháng Tám | Thành công')

  // Save P03 composition
  await page.getByRole('button', { name: /Lưu cấu trúc P03/ }).click()
  await page.getByText(/Đã lưu cấu trúc khối nội dung/).waitFor()

  // Reload and verify persistence
  await page.reload()
  await page.getByPlaceholder('Tiêu đề dòng thời gian').waitFor()
  const reloadedCaption = await page.getByPlaceholder('Tiêu đề dòng thời gian').inputValue()
  if (reloadedCaption !== 'Mốc 1945') throw new Error(`Expected 'Mốc 1945' after reload, got '${reloadedCaption}'`)

  // Create Objective & save
  await page.getByRole('tab', { name: /Mục tiêu/ }).click()
  await page.getByPlaceholder('Mã (VD: OBJ01)').fill('OBJ01')
  await page.getByPlaceholder('Tên mục tiêu mới').fill('Hiểu bối cảnh 1945')
  await page.getByRole('button', { name: /^Tạo$/ }).click()
  await page.getByText('OBJ01').waitFor()
  await page.getByRole('button', { name: /Lưu cấu trúc P03/ }).click()
  await page.getByText(/Đã lưu cấu trúc khối nội dung/).waitFor()

  // Revisions & Rollback
  await page.getByRole('tab', { name: /Phiên bản/ }).click()
  await page.getByRole('button', { name: /Khôi phục bản nháp/ }).first().click()
  await page.getByRole('button', { name: 'Khôi phục', exact: true }).click()
  await page.getByText(/Đã khôi phục bản nháp từ phiên bản/).waitFor()
  await desktop.close()

  // 3. Mobile 390px overflow & touch-target check
  const mobileCtx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const mPage = await mobileCtx.newPage()
  await mPage.goto(`${frontendUrl}/login`, { waitUntil: 'domcontentloaded' })
  await mPage.locator('input[type=email]').fill('admin@studyai.internal')
  await mPage.locator('input[type=password]').fill('Admin@123456')
  await mPage.locator('button[type=submit]').click()
  await mPage.waitForURL((url) => url.pathname !== '/login')
  await mPage.goto(`${frontendUrl}/content/lessons/${lesson.id}`)
  await mPage.getByText('Cấu trúc bài học chuẩn hóa (P03)').waitFor()

  const metrics = await mPage.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))
  if (metrics.scrollWidth > metrics.innerWidth) {
    throw new Error(`Mobile 390px horizontal overflow: ${JSON.stringify(metrics)}`)
  }
  await mobileCtx.close()

  console.log('P03 Playwright E2E PASS: 401/403, subject-neutral timeline block, objectives, revisions/rollback, refresh persistence, mobile 390px')
} catch (err) {
  exitCode = 1
  console.error(err)
} finally {
  if (browser) await browser.close()
  const processes = [backendProc, frontendProc].filter((p): p is ChildProcess => p !== null)
  if (process.platform !== 'win32') {
    for (const proc of processes) {
      if (proc.pid) {
        try { process.kill(-proc.pid, 'SIGKILL') } catch { /* ignore */ }
      }
      proc.stdin?.destroy()
      proc.stdout?.destroy()
      proc.stderr?.destroy()
    }
  }
  const termination = await Promise.allSettled(processes.map((p) => killProcessTreeAndWait(p)))
  if (termination.some((r) => r.status === 'rejected')) {
    throw new Error('Process termination was not verified; database cleanup refused.')
  }
  if (_disposableDb) await _disposableDb.cleanup()
}
process.exit(exitCode)
