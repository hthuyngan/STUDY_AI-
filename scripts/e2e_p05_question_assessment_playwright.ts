import { chromium } from 'playwright'
import { spawn, type ChildProcess } from 'child_process'
import { createDisposableTestDatabase, killProcessTreeAndWait } from './utils/disposableDb'
import { assertSafeTestDatabase } from './utils/databaseSafetyGuard'

const backendUrl = 'http://127.0.0.1:8000'
const frontendUrl = 'http://localhost:4199'
const _disposableDb = process.env.ConnectionStrings__DefaultConnection
  ? null
  : await createDisposableTestDatabase('e2e_p05_question_assessment')
const connectionString =
  process.env.ConnectionStrings__DefaultConnection || _disposableDb!.connectionString
assertSafeTestDatabase(connectionString, 'P05 question mapping & assessment integrity Playwright')

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

  const login = async (email: string, password: string) => {
    const r = await fetch(`${backendUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!r.ok) throw new Error(`Login failed: ${r.status}`)
    return (await r.json()).accessToken as string
  }

  const adminToken = await login('admin@studyai.internal', 'Admin@123456')
  const reviewerToken = await login('content@studyai.internal', 'Content@123456')
  const studentToken = await login('learner@studyai.internal', 'Learner@123456')
  const teacherToken = await login('content2@studyai.internal', 'Content2@123456')
  const key = Date.now().toString(36).toUpperCase()

  // Seed published curriculum -> edition -> chapter -> lesson + skill
  const grade = await api('/api/v1/content/catalog/grades', adminToken, { code: `GP5_${key}`, name: `Khối P05 ${key}` })
  const subj = await api('/api/v1/content/catalog/subjects', adminToken, { code: `SP5_${key}`, name: `Hóa P05 ${key}` })
  const curr = await api('/api/v1/content/catalog/curricula', adminToken, {
    code: `CP5_${key}`,
    gradeLevelId: grade.id,
    subjectId: subj.id,
    name: `CT Hóa ${key}`,
    framework: 'E2E',
  })
  await api(`/api/v1/content/catalog/curricula/${curr.id}/publish`, adminToken, { rowVersion: curr.rowVersion })
  const ed = await api('/api/v1/content/catalog/editions', adminToken, {
    code: `EP5_${key}`,
    curriculumId: curr.id,
    editionName: `Bản P05 ${key}`,
  })
  await api(`/api/v1/content/catalog/editions/${ed.id}/publish`, adminToken, { rowVersion: ed.rowVersion })
  const ch = await api('/api/v1/content/chapters', adminToken, { curriculumEditionId: ed.id, code: `CHP5_${key}`, title: `Chương P05 ${key}` })
  const chSub = await api(`/api/v1/content/chapters/${ch.id}/submit-review`, adminToken, { rowVersion: ch.rowVersion })
  const chApp = await api(`/api/v1/content/chapters/${ch.id}/approve`, reviewerToken, { rowVersion: chSub.rowVersion })
  await api(`/api/v1/content/chapters/${ch.id}/publish`, reviewerToken, { rowVersion: chApp.rowVersion })

  const les = await api('/api/v1/content/lessons', adminToken, {
    chapterId: ch.id,
    code: `LP5_${key}`,
    title: `Bài học P05 ${key}`,
    slug: `bai-p05-${key.toLowerCase()}`,
    introduction: 'Mở đầu P05.',
    definitions: [{ term: 'Khái niệm P05', content: 'Nội dung P05' }],
    sourceName: 'SGK Hóa',
    sourceLicense: 'Internal-Approved',
  })
  const lesSub = await api(`/api/v1/content/lessons/${les.id}/submit-review`, adminToken, { rowVersion: les.rowVersion })
  const lesApp = await api(`/api/v1/content/lessons/${les.id}/approve`, reviewerToken, { rowVersion: lesSub.rowVersion })
  await api(`/api/v1/content/lessons/${les.id}/publish`, reviewerToken, { rowVersion: lesApp.rowVersion })

  const skill = await api(`/api/v1/content/curricula/${curr.id}/skills`, adminToken, {
    code: `SKP5_${key}`,
    title: 'Cân bằng phản ứng P05',
    sourceName: 'SGK Hóa',
    sourceLicense: 'Internal-Approved',
  })

  // Create question with skill mapping & publish
  const q = await api('/api/v1/content/questions', adminToken, {
    lessonId: les.id,
    prompt: `Nguyên tử khối của Oxi (P05 ${key})?`,
    options: ['12', '14', '16', '32'],
    correctAnswer: '16',
    explanation: 'O = 16',
    skillIds: [skill.id],
  })
  if (!q.questionKey?.startsWith('qkey_')) throw new Error('Missing durable questionKey')

  // Duplicate check -> 409
  const dupRes = await fetch(`${backendUrl}/api/v1/content/questions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lessonId: les.id,
      prompt: `  nguyên tử khối của oxi (p05 ${key})? `,
      options: ['12', '14', '16', '32'],
      correctAnswer: '16',
    }),
  })
  if (dupRes.status !== 409) throw new Error(`Expected 409 duplicate, got ${dupRes.status}`)

  await api(`/api/v1/content/questions/${q.id}/submit-review`, adminToken, {})
  await api(`/api/v1/content/questions/${q.id}/approve`, reviewerToken, {})
  await api(`/api/v1/content/questions/${q.id}/publish`, reviewerToken, {})

  const assess = await api('/api/v1/content/assessments', adminToken, {
    lessonId: les.id,
    title: `Kiểm tra P05 ${key}`,
    passScore: 60,
    durationMinutes: 10,
  })
  await api(`/api/v1/content/assessments/${assess.id}/questions`, adminToken, {
    items: [{ questionId: q.id, points: 1 }],
  }, 'PUT')

  // Zero answer-key leak check
  const learnerQsText = await (await fetch(`${backendUrl}/api/v1/curriculum/lessons/${les.id}/questions`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  })).text()
  if (/correctAnswer|explanation/i.test(learnerQsText)) throw new Error('Answer-key leaked in pre-submission endpoint')

  // Server-side attempt finalize + cross-user 403 + immutable 409
  const att = await api('/api/v1/me/assessment-attempts', studentToken, {
    assessmentId: assess.id,
    lessonId: les.id,
    subjectId: subj.id,
    completionStatus: 'incomplete',
  })
  const crossRes = await fetch(`${backendUrl}/api/v1/me/assessment-attempts/${att.id}/finalize`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${teacherToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers: { [q.id]: ['16'] } }),
  })
  if (crossRes.status !== 403) throw new Error(`Expected 403 cross-user finalize, got ${crossRes.status}`)

  const fin = await api(`/api/v1/me/assessment-attempts/${att.id}/finalize`, studentToken, {
    answers: { [q.id]: ['16'] },
  })
  if (!fin.isFinalized || fin.scoreRaw !== 1) throw new Error('Server grading failed')

  const reFinRes = await fetch(`${backendUrl}/api/v1/me/assessment-attempts/${att.id}/finalize`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers: { [q.id]: ['12'] } }),
  })
  if (reFinRes.status !== 409) throw new Error(`Expected 409 immutable finalized attempt, got ${reFinRes.status}`)

  // Browser UI check: Question Bank page & 390px mobile
  browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()
  await page.goto(`${frontendUrl}/login`, { waitUntil: 'domcontentloaded' })
  await page.locator('input[type=email]').fill('admin@studyai.internal')
  await page.locator('input[type=password]').fill('Admin@123456')
  await page.locator('button[type=submit]').click()
  await page.waitForURL((u) => u.pathname !== '/login' && u.pathname !== '/', { timeout: 15_000 })
  await page.waitForTimeout(400)

  await page.goto(`${frontendUrl}/content/questions`, { waitUntil: 'domcontentloaded' })
  await page.getByText(new RegExp(`Nguyên tử khối của Oxi \\(P05 ${key}\\)`)).first().waitFor({ timeout: 15_000 })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.getByText(new RegExp(`Nguyên tử khối của Oxi \\(P05 ${key}\\)`)).first().waitFor({ timeout: 15_000 })
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2)
  if (overflow) throw new Error('Horizontal overflow at 390px on /content/questions')

  console.log('P05_PLAYWRIGHT_PASS')
} catch (err) {
  console.error('P05_PLAYWRIGHT_FAIL', err)
  exitCode = 1
} finally {
  if (browser) await browser.close()
  const processes = [backendProc, frontendProc].filter((p): p is ChildProcess => p !== null)
  await Promise.allSettled(processes.map((p) => killProcessTreeAndWait(p)))
  if (_disposableDb) await _disposableDb.cleanup()
  process.exit(exitCode)
}
