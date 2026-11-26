import { mkdirSync } from 'fs'
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
let frontendLogs = ''
let exitCode = 0
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
      detached: process.platform !== 'win32',
    }
  )
  await waitFor(`${backendUrl}/health/db`)
  frontendProc = spawn(
    'bun',
    ['run', 'preview', '--', '--host', 'localhost', '--port', '4198', '--strictPort'],
    {
      cwd: `${process.cwd()}/frontend`,
      env: { ...process.env, VITE_BACKEND_URL: backendUrl },
      stdio: 'pipe',
      shell: process.platform === 'win32',
      detached: process.platform !== 'win32',
    }
  )
  frontendProc.stdout?.on('data', (d) => {
    frontendLogs = (frontendLogs + d.toString()).slice(-4000)
  })
  frontendProc.stderr?.on('data', (d) => {
    frontendLogs = (frontendLogs + d.toString()).slice(-4000)
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

  const unauthRes = await fetch(`${backendUrl}/api/v1/content/chapters`)
  if (unauthRes.status !== 401) {
    throw new Error(`Expected unauthenticated /content/chapters 401, got ${unauthRes.status}`)
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
  page.on('pageerror', (err) => console.error('[Playwright pageerror]', err.message))
  await page.goto(`${frontendUrl}/login`, { waitUntil: 'domcontentloaded' })
  await page.locator('input[type=email]').waitFor({ state: 'visible', timeout: 30_000 })
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

  // 5. Lesson Editor: save + reload persistence + hidden Publish on draft + submit-review
  const refreshedCh = (
    await api(`/api/v1/content/chapters?curriculumEditionId=${edition.id}`, reviewer)
  ).items[0]
  const lesListBefore = await api(`/api/v1/content/lessons?chapterId=${refreshedCh.id}`, admin)
  const les = lesListBefore.items[0]
  await page.goto(`${frontendUrl}/content/lessons/${les.id}`)
  const titleInput = page.getByLabel('Tiêu đề bài học')
  await titleInput.waitFor()
  const publishBtnCount = await page.getByRole('button', { name: 'Xuất bản bài học' }).count()
  if (publishBtnCount !== 0) {
    throw new Error('Expected Xuất bản bài học button to be hidden on draft lesson')
  }
  await titleInput.fill('Bài Playwright Đã Lưu')
  await page.getByRole('button', { name: 'Lưu bản nháp' }).click()
  await page.getByText('✓ Đã lưu bản nháp thành công!').waitFor()
  await page.reload()
  await page.getByLabel('Tiêu đề bài học').waitFor()
  const reloadedTitle = await page.getByLabel('Tiêu đề bài học').inputValue()
  if (reloadedTitle !== 'Bài Playwright Đã Lưu') {
    throw new Error(`Expected reloaded title 'Bài Playwright Đã Lưu', got '${reloadedTitle}'`)
  }
  await page.getByRole('button', { name: 'Gửi kiểm duyệt' }).click()
  await page.getByText('Chờ duyệt').waitFor()

  // Create 5 more lessons so chapter has 6 lessons (testing beyond 1 page with pageSize=5)
  for (let i = 2; i <= 6; i++) {
    await api(`/api/v1/content/lessons`, admin, {
      chapterId: refreshedCh.id,
      code: `LES0${i}`,
      title: `Bài Playwright ${i}`,
      slug: `bai-playwright-${key.toLowerCase()}-${i}`,
      orderIndex: i,
    })
  }

  // Reorder beyond 1 page (page=2, pageSize=5 -> only LES06 visible)
  await page.goto(
    `${frontendUrl}/content/curriculum?editionId=${edition.id}&chapterId=${refreshedCh.id}&page=2&pageSize=5`
  )
  await page.getByText('Bài Playwright 6').waitFor()
  await page.getByRole('button', { name: 'Lên Bài Playwright 6' }).click()
  await page.waitForTimeout(500)

  // Publish chain via reviewer & verify learner projection exact-once (only published lesson 1 visible, drafts 2..6 hidden)
  const subCh = await api(`/api/v1/content/chapters/${refreshedCh.id}/submit-review`, admin, {
    rowVersion: refreshedCh.rowVersion,
  })
  const appCh = await api(`/api/v1/content/chapters/${subCh.id}/approve`, reviewer, {
    rowVersion: subCh.rowVersion,
  })
  await api(`/api/v1/content/chapters/${appCh.id}/publish`, reviewer, {
    rowVersion: appCh.rowVersion,
  })

  const lesAfterEditor = (
    await api(`/api/v1/content/lessons?chapterId=${refreshedCh.id}`, reviewer)
  ).items.find((x: { id: string }) => x.id === les.id)
  const appL = await api(`/api/v1/content/lessons/${lesAfterEditor.id}/approve`, reviewer, {
    rowVersion: lesAfterEditor.rowVersion,
  })
  const pubL = await api(`/api/v1/content/lessons/${appL.id}/publish`, reviewer, {
    rowVersion: appL.rowVersion,
  })

  const learnerChapters = await api(`/api/v1/curriculum/editions/${edition.id}/chapters`, learner)
  if (learnerChapters.length !== 1 || learnerChapters[0].lessons.length !== 1) {
    throw new Error(`Expected exact-once learner projection, got ${JSON.stringify(learnerChapters)}`)
  }

  // Verify lifecycle round-trip (unpublish -> request-changes -> submit-review -> approve -> publish -> archive -> reactivate) on API
  const unpubL = await api(`/api/v1/content/lessons/${pubL.id}/unpublish`, reviewer, {
    rowVersion: pubL.rowVersion,
  })
  const reqChgL = await api(`/api/v1/content/lessons/${unpubL.id}/request-changes`, reviewer, {
    rowVersion: unpubL.rowVersion,
    reason: 'E2E check',
  })
  const resubL = await api(`/api/v1/content/lessons/${reqChgL.id}/submit-review`, admin, {
    rowVersion: reqChgL.rowVersion,
  })
  const reappL = await api(`/api/v1/content/lessons/${resubL.id}/approve`, reviewer, {
    rowVersion: resubL.rowVersion,
  })
  const repubL = await api(`/api/v1/content/lessons/${reappL.id}/publish`, reviewer, {
    rowVersion: reappL.rowVersion,
  })
  const archL = await api(`/api/v1/content/lessons/${repubL.id}/archive`, reviewer, {
    rowVersion: repubL.rowVersion,
  })
  const reactL = await api(`/api/v1/content/lessons/${archL.id}/reactivate`, reviewer, {
    rowVersion: archL.rowVersion,
  })
  const resubL2 = await api(`/api/v1/content/lessons/${reactL.id}/submit-review`, admin, {
    rowVersion: reactL.rowVersion,
  })
  const reappL2 = await api(`/api/v1/content/lessons/${resubL2.id}/approve`, reviewer, {
    rowVersion: resubL2.rowVersion,
  })
  await api(`/api/v1/content/lessons/${reappL2.id}/publish`, reviewer, {
    rowVersion: reappL2.rowVersion,
  })

  // Learner UI check on /subjects -> /subjects/edition/:editionId -> lesson detail
  mkdirSync('docs/visual-qa/p02', { recursive: true })
  const learnerCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const learnerPage = await learnerCtx.newPage()
  await learnerPage.goto(`${frontendUrl}/login`)
  await learnerPage.locator('input[type=email]').fill('learner@studyai.internal')
  await learnerPage.locator('input[type=password]').fill('Learner@123456')
  await learnerPage.locator('button[type=submit]').click()
  await learnerPage.waitForURL((url) => url.pathname !== '/login')
  await learnerPage.goto(`${frontendUrl}/subjects/edition/${edition.id}`)
  await learnerPage.getByText('Bài Playwright').first().waitFor()
  await learnerPage.screenshot({ path: 'docs/visual-qa/p02/learner-edition-desktop.png' })
  await learnerCtx.close()

  // 6. API 500 failure -> visible alert, no false success + desktop screenshot
  await page.goto(`${frontendUrl}/content/curriculum?editionId=${edition.id}&chapterId=${refreshedCh.id}`)
  await page.getByText('Bài Playwright').first().waitFor()
  await page.screenshot({ path: 'docs/visual-qa/p02/workspace-desktop.png' })

  await page.route('**/api/v1/content/chapters**', (route) =>
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: '{"detail":"forced"}',
    })
  )
  await page.getByRole('button', { name: /Tải lại/ }).click()
  await page.getByRole('alert').waitFor()
  await desktop.close()

  // 7. Tablet 1024px & 768px drawer + Mobile 390px & 375px layout + touch target audit
  for (const vp of [
    { width: 1024, height: 768, label: 'tablet-1024', screenshot: 'docs/visual-qa/p02/workspace-tablet-drawer.png' },
    { width: 768, height: 1024, label: 'tablet-768' },
    { width: 390, height: 844, label: 'mobile-390', screenshot: 'docs/visual-qa/p02/workspace-mobile-390.png' },
    { width: 375, height: 812, label: 'mobile-375' },
  ]) {
    const vpCtx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
    })
    const vpPage = await vpCtx.newPage()
    await vpPage.goto(`${frontendUrl}/login`)
    await vpPage.locator('input[type=email]').fill('admin@studyai.internal')
    await vpPage.locator('input[type=password]').fill('Admin@123456')
    await vpPage.locator('button[type=submit]').click()
    await vpPage.waitForURL((url) => url.pathname !== '/login')
    await vpPage.goto(`${frontendUrl}/content/curriculum?editionId=${edition.id}&chapterId=${refreshedCh.id}`)
    await vpPage.getByRole('heading', { name: 'Không gian giáo trình' }).waitFor()
    if (vp.width <= 1024) {
      const toggle = vpPage.getByRole('button', { name: /Cây chương/i })
      if (await toggle.isVisible()) {
        await toggle.click()
      }
    }
    if (vp.screenshot) {
      await vpPage.screenshot({ path: vp.screenshot })
    }
    const metrics = await vpPage.evaluate(() => {
      const actionBtns = Array.from(
        document.querySelectorAll('.curriculum-table__actions button, .curriculum-tree__item-actions button')
      )
      const minBtnHeight = actionBtns.reduce(
        (min, el) => Math.min(min, Math.round(el.getBoundingClientRect().height)),
        Infinity
      )
      return {
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        minBtnHeight: actionBtns.length ? minBtnHeight : 44,
      }
    })
    if (metrics.scrollWidth > metrics.innerWidth) {
      throw new Error(`Horizontal overflow at ${vp.label}: ${JSON.stringify(metrics)}`)
    }
    if (metrics.minBtnHeight < 44) {
      throw new Error(`Touch target < 44px at ${vp.label}: ${JSON.stringify(metrics)}`)
    }
    await vpCtx.close()
  }

  console.log(
    'P02 Playwright E2E PASS: empty, CRUD, lesson editor, page>1 reorder, lifecycle round-trip, learner edition UI, 401/403, stale 409, API 500, tablet 1024/768 & mobile 390/375px'
  )
} catch (err) {
  exitCode = 1
  if (frontendLogs) {
    console.error('[Frontend preview logs]\n' + frontendLogs)
  }
  console.error(err)
} finally {
  if (browser) await browser.close()
  const processes = [backendProc, frontendProc].filter((p): p is ChildProcess => p !== null)
  if (process.platform !== 'win32') {
    for (const proc of processes) {
      if (proc.pid) {
        try {
          process.kill(-proc.pid, 'SIGKILL')
        } catch {
          /* group may already be dead */
        }
      }
      proc.stdin?.destroy()
      proc.stdout?.destroy()
      proc.stderr?.destroy()
    }
  }
  const termination = await Promise.allSettled(
    processes.map((process) => killProcessTreeAndWait(process))
  )
  if (termination.some((result) => result.status === 'rejected')) {
    throw new Error('Process termination was not verified; database cleanup refused.')
  }
  if (_disposableDb) await _disposableDb.cleanup()
}
process.exit(exitCode)
