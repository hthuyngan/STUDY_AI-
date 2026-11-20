/**
 * P01 LIVE BROWSER CONTRACT: no page.route(), no mocked responses, no screenshot-only PASS.
 * Run ONLY against a disposable, isolated StudyAIDb_E2E instance and a real ASP.NET API.
 *
 * Required: E2E_DB_NAME=StudyAIDb_E2E
 *           E2E_FRONTEND_URL=http://127.0.0.1:5174
 *           E2E_BACKEND_URL=http://127.0.0.1:8000
 *           E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD (test-only account)
 *
 * Start backend/SQL separately. This script never starts/migrates a database.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { chromium, type Browser, type Page, type Response } from 'playwright'

const baseUrl = process.env.E2E_FRONTEND_URL ?? ''
const backendUrl = process.env.E2E_BACKEND_URL ?? ''
const email = process.env.E2E_ADMIN_EMAIL ?? ''
const password = process.env.E2E_ADMIN_PASSWORD ?? ''
const artifacts = path.resolve('docs/visual-qa/p01-live-browser')

function requireLocal(urlText: string, name: string) {
  const u = new URL(urlText)
  if (!['localhost', '127.0.0.1', '::1'].includes(u.hostname) || !['http:', 'https:'].includes(u.protocol)) {
    throw new Error(`${name} must be a local HTTP endpoint; remote/production servers are forbidden`)
  }
}
if (process.env.E2E_DB_NAME !== 'StudyAIDb_E2E') throw new Error('E2E_DB_NAME must equal StudyAIDb_E2E')
if (!email || !password) throw new Error('Test-only E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD are required')
requireLocal(baseUrl, 'E2E_FRONTEND_URL')
requireLocal(backendUrl, 'E2E_BACKEND_URL')
if (new URL(baseUrl).origin === new URL(backendUrl).origin) {
  throw new Error('Frontend and backend origins must be distinct (Vite proxy expected)')
}

const settingsPath = '/api/v1/admin/settings'
function waitForSettingsSave(page: Page): Promise<Response> {
  return page.waitForResponse(r => r.url().includes(settingsPath) && r.request().method() === 'PUT', { timeout: 20000 })
}
async function login(page: Page) {
  await page.goto(`${baseUrl}/login`)
  await page.locator('#login-email').fill(email)
  await page.locator('#login-password').fill(password)
  await Promise.all([
    page.waitForURL(url => !url.pathname.endsWith('/login'), { timeout: 30000 }),
    page.locator('button[type="submit"]').click(),
  ])
  await page.goto(`${baseUrl}/admin/settings`)
  await page.locator('#set-sysname').waitFor({ state: 'visible', timeout: 30000 })
  await page.getByText('(Đang đồng bộ từ máy chủ...)').waitFor({ state: 'hidden', timeout: 30000 })
}
async function save(page: Page, name: string): Promise<Response> {
  await page.locator('#set-sysname').fill(name)
  const responsePromise = waitForSettingsSave(page)
  await page.getByRole('button', { name: 'Lưu thay đổi cấu hình' }).click()
  return responsePromise
}

async function browserClassTransfer(
  browser: Browser, teacherEmail: string, teacherPassword: string,
  adminHeaders: Record<string, string>,
) {
  const teacherLogin = await fetch(`${backendUrl}/api/v1/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: teacherEmail, password: teacherPassword }),
  })
  assert.equal(teacherLogin.status, 200)
  const teacherAuth = await teacherLogin.json() as { accessToken: string }
  const teacherHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${teacherAuth.accessToken}` }

  const suffix = Date.now().toString()
  const learnerName = `Live Transfer Learner ${suffix}`
  const learnerEmail = `live.learner.${suffix}@studyai.test`
  const register = await fetch(`${backendUrl}/api/v1/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName: learnerName, email: learnerEmail, password: `Test-Learner-${suffix}!Aa`, grade: '12' }),
  })
  assert.equal(register.status, 201, 'Learner fixture registration should persist to SQL')
  const learnerBody = await register.json() as { user?: { id: string } }
  const learnerId = learnerBody.user?.id
  assert.ok(learnerId, 'Register endpoint must return real learner ID')

  const createdClasses: string[] = []
  async function createClass(label: string) {
    const response = await fetch(`${backendUrl}/api/v1/classrooms`, {
      method: 'POST', headers: teacherHeaders,
      body: JSON.stringify({ name: `P01 E2E ${label} ${suffix}`, grade: '12', subject: 'Toán học' }),
    })
    assert.equal(response.status, 201, `Create classroom ${label} returned ${response.status}`)
    const classroom = await response.json() as { id: string; name: string }
    createdClasses.push(classroom.id)
    return classroom
  }
  let source: { id: string; name: string } | undefined
  let target: { id: string; name: string } | undefined
  try {
    source = await createClass('Source')
    target = await createClass('Target')
    const enrolled = await fetch(`${backendUrl}/api/v1/classrooms/${source.id}/students`, {
      method: 'POST', headers: teacherHeaders,
      body: JSON.stringify({ studentId: learnerId }),
    })
    assert.ok([200, 201].includes(enrolled.status), 'Test learner must be enrolled into source class')

    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    try {
      const page = await ctx.newPage()
      await page.goto(`${baseUrl}/login`)
      await page.locator('#login-email').fill(teacherEmail)
      await page.locator('#login-password').fill(teacherPassword)
      await Promise.all([
        page.waitForURL(url => !url.pathname.endsWith('/login'), { timeout: 30000 }),
        page.locator('button[type="submit"]').click(),
      ])
      await page.goto(`${baseUrl}/teacher/students`)
      await page.getByPlaceholder('Tìm theo tên học viên, mã học viên hoặc email...').fill(learnerName)
      const move = page.getByRole('button', { name: `Chuyển lớp cho học viên ${learnerName}` })
      await move.waitFor({ state: 'visible', timeout: 30000 })
      await move.click()
      await page.locator('#target-class-select').selectOption(target.id)
      const transferResponse = page.waitForResponse(r =>
        r.url().includes(`/api/v1/classrooms/${target!.id}/transfer-student`) &&
        r.request().method() === 'POST', { timeout: 20000 })
      await page.getByRole('button', { name: 'Xác nhận chuyển lớp' }).click()
      assert.equal((await transferResponse).status(), 200, 'Teacher UI transfer must persist via real API')

      // The same test must still hold after hard reload, not just local state update.
      await page.reload()
      await page.getByPlaceholder('Tìm theo tên học viên, mã học viên hoặc email...').fill(learnerName)
      await page.getByText(target.name, { exact: true }).first().waitFor({ state: 'visible', timeout: 30000 })

      const getStudents = async (classId: string) => {
        const res = await fetch(`${backendUrl}/api/v1/classrooms/${classId}/students`, { headers: teacherHeaders })
        assert.equal(res.status, 200)
        return res.json() as Promise<Array<{ studentId: string }>>
      }
      assert.ok(!(await getStudents(source.id)).some(x => x.studentId === learnerId),
        'Source enrollment must be removed from SQL')
      assert.ok((await getStudents(target.id)).some(x => x.studentId === learnerId),
        'Target enrollment must be saved in SQL')
      await page.screenshot({ path: path.join(artifacts, 'class-transfer-real-api-pass.png'), fullPage: true })
      console.log('[PASS] Live browser Classroom: teacher UI transfer, SQL API enrollments and hard-reload persistence')
    } finally { await ctx.close() }
  } finally {
    // Cleanup runs on isolated E2E SQL only.
    for (const classId of createdClasses) {
      await fetch(`${backendUrl}/api/v1/classrooms/${classId}/students/${learnerId}`, {
        method: 'DELETE', headers: teacherHeaders,
      }).catch(() => {})
      await fetch(`${backendUrl}/api/v1/classrooms/${classId}`, {
        method: 'DELETE', headers: teacherHeaders,
      }).catch(() => {})
    }
    await fetch(`${backendUrl}/api/v1/admin/users/${learnerId}`, {
      method: 'DELETE', headers: adminHeaders,
    }).catch(() => {})
  }
}

async function browserTeacherLock(browser: Browser, adminPage: Page) {
  // A unique test-only teacher is created through the actual backend API. Cleanup is soft delete.
  const adminLogin = await fetch(`${backendUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  assert.equal(adminLogin.status, 200, 'Real admin API login must succeed')
  const adminAuth = await adminLogin.json() as { accessToken: string }
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminAuth.accessToken}`,
  }
  const teacherName = `Live E2E Teacher ${Date.now()}`
  const teacherEmail = `live.teacher.${Date.now()}@studyai.test`
  const teacherPassword = `E2E-Test-${Date.now()}!aA`
  const createResponse = await fetch(`${backendUrl}/api/v1/admin/teachers`, {
    method: 'POST', headers,
    body: JSON.stringify({ name: teacherName, email: teacherEmail, password: teacherPassword, subject: 'Toán 12', status: 'active' }),
  })
  assert.equal(createResponse.status, 201, 'Create teacher fixture must succeed on real backend')
  const teacher = await createResponse.json() as { id: string }
  assert.ok(teacher.id, 'Teacher fixture needs persisted ID')
  let locked = false
  try {
    await browserClassTransfer(browser, teacherEmail, teacherPassword, headers)
    await adminPage.goto(`${baseUrl}/admin/teachers`)
    await adminPage.getByRole('searchbox', { name: 'Tìm kiếm giáo viên' }).fill(teacherEmail)
    const lockButton = adminPage.getByRole('button', { name: `Khóa ${teacherName}` })
    await lockButton.waitFor({ state: 'visible', timeout: 30000 })
    await lockButton.click()
    const lockResponsePromise = adminPage.waitForResponse(r =>
      r.url().includes(`/api/v1/admin/teachers/${teacher.id}`) &&
      ['PATCH', 'PUT'].includes(r.request().method()), { timeout: 20000 })
    await adminPage.getByRole('button', { name: 'Khóa tài khoản', exact: true }).click()
    const lockResponse = await lockResponsePromise
    assert.equal(lockResponse.status(), 200, 'Teacher lock must persist via API')
    locked = true
    await adminPage.getByRole('button', { name: `Mở khóa ${teacherName}` })
      .waitFor({ state: 'visible', timeout: 20000 })

    const lockedContext = await browser.newContext()
    try {
      const lockedPage = await lockedContext.newPage()
      await lockedPage.goto(`${baseUrl}/login`)
      await lockedPage.locator('#login-email').fill(teacherEmail)
      await lockedPage.locator('#login-password').fill(teacherPassword)
      const denied = lockedPage.waitForResponse(r => r.url().includes('/api/v1/auth/login') && r.request().method() === 'POST')
      await lockedPage.locator('button[type="submit"]').click()
      assert.equal((await denied).status(), 403, 'Locked teacher must be rejected by real login API')
      assert.ok(new URL(lockedPage.url()).pathname.endsWith('/login'), 'Locked teacher must stay on login page')
    } finally {
      await lockedContext.close()
    }

    await adminPage.getByRole('button', { name: `Mở khóa ${teacherName}` }).click()
    const unlockResponsePromise = adminPage.waitForResponse(r =>
      r.url().includes(`/api/v1/admin/teachers/${teacher.id}`) &&
      ['PATCH', 'PUT'].includes(r.request().method()), { timeout: 20000 })
    await adminPage.getByRole('button', { name: 'Mở khóa', exact: true }).click()
    assert.equal((await unlockResponsePromise).status(), 200)
    locked = false

    const unlockedContext = await browser.newContext()
    try {
      const unlockedPage = await unlockedContext.newPage()
      await unlockedPage.goto(`${baseUrl}/login`)
      await unlockedPage.locator('#login-email').fill(teacherEmail)
      await unlockedPage.locator('#login-password').fill(teacherPassword)
      const accepted = unlockedPage.waitForResponse(r => r.url().includes('/api/v1/auth/login') && r.request().method() === 'POST')
      await unlockedPage.locator('button[type="submit"]').click()
      assert.equal((await accepted).status(), 200, 'Unlocked teacher should log in successfully')
    } finally {
      await unlockedContext.close()
    }
    await adminPage.screenshot({ path: path.join(artifacts, 'teacher-lock-real-api-pass.png'), fullPage: true })
    console.log('[PASS] Live browser Teacher: UI lock/unlock persisted, real login rejected 403 then accepted 200')
  } finally {
    // Never leave an E2E teacher locked or active in test DB on failure.
    const cleanup = await fetch(`${backendUrl}/api/v1/admin/teachers/${teacher.id}`, {
      method: 'DELETE', headers,
    }).catch(() => null)
    if (!cleanup || cleanup.status !== 204) {
      console.error(`[WARN] Failed to delete test teacher fixture ${teacher.id}, locked=${locked}`)
    }
  }
}

async function browserAssessmentFailAndRetry(browser: Browser) {
  const suffix = Date.now().toString()
  const learnerEmail = `assessment.live.${suffix}@studyai.test`
  const learnerPassword = `Assessment-E2E-${suffix}!Aa`
  const lessonId = 'les_math12_c1_b1' // Seeded, published lesson with 2 real questions.
  const register = await fetch(`${backendUrl}/api/v1/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName: `Assessment Live Learner ${suffix}`, email: learnerEmail, password: learnerPassword, grade: '12' }),
  })
  assert.equal(register.status, 201, 'Learner test account must register on real SQL backend')
  const registered = await register.json() as { accessToken: string; user?: { id: string } }
  assert.ok(registered.accessToken && registered.user?.id)

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  try {
    const page = await ctx.newPage()
    await page.goto(`${baseUrl}/login`)
    await page.locator('#login-email').fill(learnerEmail)
    await page.locator('#login-password').fill(learnerPassword)
    await Promise.all([
      page.waitForURL(url => !url.pathname.endsWith('/login'), { timeout: 30000 }),
      page.locator('button[type="submit"]').click(),
    ])
    await page.goto(`${baseUrl}/subjects/sub_math12/lessons/${lessonId}`)
    await page.locator('.harvest-header').waitFor({ state: 'visible', timeout: 30000 })
    await page.locator('.harvest-header').click()
    await page.getByRole('button', { name: 'Bắt đầu làm bài' }).waitFor({ state: 'visible', timeout: 30000 })
    await page.getByRole('button', { name: 'Bắt đầu làm bài' }).click()

    for (let question = 1; question <= 2; question++) {
      const group = page.getByRole('radiogroup', { name: `Các lựa chọn cho câu ${question}` })
      await group.getByRole('radio').first().click()
      if (question < 2) await page.getByRole('button', { name: 'Câu tiếp' }).click()
    }

    // Fault-inject ONLY the real assessment write endpoint. No fabricated 200/201 responses.
    const pattern = '**/api/v1/me/assessment-attempts'
    let blocked = 0
    await page.route(pattern, async route => {
      if (route.request().method() === 'POST') {
        blocked++
        await route.abort('failed')
      } else {
        await route.continue()
      }
    })
    await page.getByRole('button', { name: 'Nộp bài', exact: true }).click()
    const dialogPromise = page.waitForEvent('dialog', { timeout: 20000 })
    await page.getByRole('alertdialog').getByRole('button', { name: 'Xác nhận nộp bài' }).click()
    const dialog = await dialogPromise
    assert.match(dialog.message(), /Nộp bài không thành công/, 'Browser must show failed submission warning')
    await dialog.accept()
    assert.equal(blocked, 1, 'Real assessment POST must be attempted and interrupted exactly once')

    await page.reload()
    await page.locator('.harvest-header').waitFor({ state: 'visible', timeout: 30000 })
    await page.locator('.harvest-header').click()
    const resume = page.getByRole('button', { name: 'Tiếp tục bài tập' })
    await resume.waitFor({ state: 'visible', timeout: 30000 })
    await page.screenshot({ path: path.join(artifacts, 'assessment-failed-resumable.png'), fullPage: true })

    await page.unroute(pattern)
    await resume.click()
    const submitButton = page.getByRole('button', { name: 'Nộp bài', exact: true })
    await submitButton.waitFor({ state: 'visible', timeout: 30000 })
    assert.ok(await submitButton.isEnabled(), 'Previously answered assessment must be resumable after refresh')
    await submitButton.click()
    const acceptedPromise = page.waitForResponse(r =>
      r.url().includes('/api/v1/me/assessment-attempts') &&
      r.request().method() === 'POST', { timeout: 20000 })
    await page.getByRole('alertdialog').getByRole('button', { name: 'Xác nhận nộp bài' }).click()
    const accepted = await acceptedPromise
    assert.equal(accepted.status(), 201, 'Retried assessment submission must persist to real backend')

    // Verify the actual SQL-backed GET endpoint, not localStorage.
    const persisted = await fetch(`${backendUrl}/api/v1/me/assessment-attempts?lessonId=${lessonId}`, {
      headers: { Authorization: `Bearer ${registered.accessToken}` },
    })
    assert.equal(persisted.status, 200)
    const attempts = await persisted.json() as Array<{ lessonId: string; completionStatus: string }>
    assert.equal(attempts.filter(a => a.lessonId === lessonId && a.completionStatus === 'completed').length, 1,
      'Exactly one completed assessment must be persisted in SQL after successful retry')
    await page.screenshot({ path: path.join(artifacts, 'assessment-real-retry-pass.png'), fullPage: true })
    console.log('[PASS] Live browser Assessment: actual POST network fault, resumable after reload, retry 201 and one SQL-backed completion')
  } finally {
    await ctx.close()
    // Use a fresh real Admin bearer token for cleanup; test-only SQL server only.
    const adminLogin = await fetch(`${backendUrl}/api/v1/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }).catch(() => null)
    if (adminLogin?.status === 200) {
      const auth = await adminLogin.json() as { accessToken: string }
      await fetch(`${backendUrl}/api/v1/admin/users/${registered.user!.id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${auth.accessToken}` },
      }).catch(() => {})
    }
  }
}

async function main() {
  // Fail closed if backend is unavailable. Never silently swap in a stub.
  const authProbe = await fetch(`${backendUrl}/api/v1/auth/refresh`).catch(() => null)
  if (!authProbe || authProbe.status === 404 || authProbe.status >= 500) {
    throw new Error("Real backend auth endpoint unavailable; live browser test cannot proceed")
  }
  fs.mkdirSync(artifacts, { recursive: true })

  let browser: Browser | undefined
  let pageA: Page | undefined
  let previousName = ''
  let changed = false
  try {
    browser = await chromium.launch({ headless: true })
    const adminA = await browser.newContext()
    const adminB = await browser.newContext()
    pageA = await adminA.newPage()
    const pageB = await adminB.newPage()
    await login(pageA)
    await login(pageB)

    // Both sessions must show the same value before either save.
    previousName = await pageA.locator('#set-sysname').inputValue()
    assert.equal(await pageB.locator('#set-sysname').inputValue(), previousName)

    const unique = `LIVE-P01-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const first = await save(pageA, unique)
    assert.equal(first.status(), 200, `First Settings PUT: expected 200, got ${first.status()}`)
    changed = true
    const second = await save(pageB, `${unique}-STALE`)
    assert.equal(second.status(), 409, `Second Settings PUT: expected 409, got ${second.status()}`)
    await pageB.getByText(/Xung đột: Cấu hình/).waitFor({ timeout: 10000 })

    await pageA.reload()
    await pageA.locator('#set-sysname').waitFor({ state: 'visible' })
    assert.equal(await pageA.locator('#set-sysname').inputValue(), unique, 'Winner was not preserved after reload')
    await pageB.reload()
    await pageB.locator('#set-sysname').waitFor({ state: 'visible' })
    assert.equal(await pageB.locator('#set-sysname').inputValue(), unique, 'Stale client overwrote persisted Settings')
    await pageA.screenshot({ path: path.join(artifacts, 'settings-real-api-pass.png'), fullPage: true })
    console.log('[PASS] Live browser Settings: 2 admin contexts, PUT 200, stale PUT 409, persisted value after reload')
    await browserTeacherLock(browser, pageA)
    await browserAssessmentFailAndRetry(browser)
  } catch (err) {
    if (pageA) await pageA.screenshot({ path: path.join(artifacts, 'settings-real-api-fail.png'), fullPage: true }).catch(() => {})
    throw err
  } finally {
    // Restore shared E2E settings only. Never restore/write to a non-E2E database.
    if (changed && pageA && previousName) {
      try {
        await pageA.goto(`${baseUrl}/admin/settings`)
        await pageA.locator('#set-sysname').waitFor({ state: 'visible', timeout: 30000 })
        await pageA.getByText('(Đang đồng bộ từ máy chủ...)').waitFor({ state: 'hidden', timeout: 30000 })
        const restore = await save(pageA, previousName)
        if (restore.status() !== 200) console.error(`[WARN] Test Settings restore failed: ${restore.status()}`)
      } catch (err) {
        console.error('[WARN] Test Settings restore failed:', err)
      }
    }
    await browser?.close()
  }
}
main().catch(err => { console.error('[FAIL] P01 live-browser:', err); process.exitCode = 1 })
