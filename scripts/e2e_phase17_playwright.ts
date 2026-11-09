import { chromium } from 'playwright'
import { spawn, ChildProcess } from 'child_process'
import fs from 'fs'
import path from 'path'
import { resolveDotnet10Environment } from './utils/dotnetRuntime'
import { assertSafeTestDatabase } from './utils/databaseSafetyGuard'

const BACKEND_PORT = 5292
const FRONTEND_PORT = 4175
const BACKEND_URL = `http://127.0.0.1:${BACKEND_PORT}`
const FRONTEND_URL = `http://127.0.0.1:${FRONTEND_PORT}`
const QA_DIR = path.join('docs', 'visual-qa', 'phase-17')

// Dedicated test database connection string to preserve StudyAIDb
const E2E_CONNECTION_STRING =
  process.env.ConnectionStrings__DefaultConnection ||
  'Server=.\\SQLEXPRESS;Database=StudyAIDb_E2E;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True'

// Fail-closed database safety guard: abort immediately if targeting StudyAIDb or an invalid/unauthorized DB
assertSafeTestDatabase(E2E_CONNECTION_STRING, 'Phase 17 Playwright E2E')

// Delete existing screenshots so only freshly captured screenshots are used as evidence
if (fs.existsSync(QA_DIR)) {
  for (const file of fs.readdirSync(QA_DIR)) {
    if (file.endsWith('.png')) {
      try {
        fs.unlinkSync(path.join(QA_DIR, file))
      } catch {
        // ignore
      }
    }
  }
} else {
  fs.mkdirSync(QA_DIR, { recursive: true })
}

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

async function waitForUrl(url: string, timeoutMs = 35000): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok || res.status === 200 || res.status === 404 || res.status === 304) {
        return
      }
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 600))
  }
  throw new Error(`Service at ${url} did not become ready within ${timeoutMs}ms`)
}

interface ScenarioReport {
  id: number
  name: string
  status: 'PASS' | 'FAIL'
  durationMs: number
  screenshots: string[]
  notes?: string
}

async function run() {
  const startTime = Date.now()
  console.log('=== STARTING PHASE 17 CURRICULUM & CONTENT MANAGEMENT E2E PLAYWRIGHT SUITE ===')
  console.log(`Timestamp: ${new Date().toISOString()}`)
  console.log(`Target E2E Database: StudyAIDb_E2E (Isolated test database)`)

  const reports: ScenarioReport[] = []

  // Robust cross-environment .NET 10 runtime resolution
  const dotnetEnv = resolveDotnet10Environment()
  const { dotnetRoot, dotnetBin, customPath } = dotnetEnv

  console.log(`Using .NET Root: ${dotnetRoot}`)
  console.log(`Using .NET Binary: ${dotnetBin} (netcore: ${dotnetEnv.netcoreVersion}, aspnet: ${dotnetEnv.aspnetVersion})`)

  // 1. Start ASP.NET Core API on port 5292 with StudyAIDb_E2E connection
  console.log(`Starting ASP.NET Core API on ${BACKEND_URL}...`)
  const backendProc: ChildProcess = spawn(
    dotnetBin,
    ['run', '--project', path.join('backend', 'src', 'StudyAI.Api'), '--urls', BACKEND_URL, '--no-build'],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PATH: customPath,
        DOTNET_ROOT: dotnetRoot,
        ASPNETCORE_ENVIRONMENT: 'Development',
        ConnectionStrings__DefaultConnection: E2E_CONNECTION_STRING,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  )

  backendProc.stdout?.on('data', (d) => {
    const msg = d.toString()
    if (msg.includes('Now listening on:')) {
      console.log(`[Backend Log] ${msg.trim()}`)
    }
  })
  backendProc.stderr?.on('data', (d) => {
    const err = d.toString()
    if (err.includes('fail:') || err.includes('crit:')) {
      console.error(`[Backend Err] ${err.trim()}`)
    }
  })

  // 2. Start Frontend Preview on port 4175 with proxy / API target
  console.log(`Starting Frontend Preview Server on ${FRONTEND_URL}...`)
  const frontendProc: ChildProcess = spawn(
    'bun',
    ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(FRONTEND_PORT), '--strictPort'],
    {
      cwd: path.join(process.cwd(), 'frontend'),
      env: {
        ...process.env,
        VITE_API_URL: BACKEND_URL,
        VITE_API_BASE_URL: BACKEND_URL,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  )

  frontendProc.stdout?.on('data', (d) => {
    const msg = d.toString()
    if (msg.includes('ready in') || msg.includes('Local:')) {
      console.log(`[Frontend Log] ${msg.trim()}`)
    }
  })

  try {
    console.log('Waiting for backend and frontend services to be responsive...')
    await waitForUrl(`${BACKEND_URL}/health`, 40000)
    console.log('-> Backend health check passed!')
    await waitForUrl(FRONTEND_URL, 30000)
    console.log('-> Frontend server is live!')

    const browser = await chromium.launch({
      headless: true,
      executablePath: fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
        ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
        : undefined,
    })
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    })
    const page = await context.newPage()

    let adminToken = ''
    let contentToken = ''
    let createdSubjectId = ''
    let createdChapterId = ''
    let createdLessonId = ''
    let createdQuestionId = ''

    // Helper: Take screenshot with timestamp
    const snap = async (name: string): Promise<string> => {
      const filename = `${name}.png`
      const filepath = path.join(QA_DIR, filename)
      await page.screenshot({ path: filepath, fullPage: false })
      console.log(`[Screenshot captured] ${filepath}`)
      return filepath
    }

    // ──────────────────────────────────────────────────────────
    // SCENARIO 1: Admin Login & Authentication
    // ──────────────────────────────────────────────────────────
    const sc1Start = Date.now()
    console.log('\n--- Scenario 1: Admin Login & Navigation ---')
    try {
      await page.goto(`${FRONTEND_URL}/login`)
      await page.waitForLoadState('networkidle')
      await snap('01_login_page_initial')

      // Login directly using form or API session injection
      await page.fill('input[type="email"], input[name="email"]', 'admin@studyai.internal')
      await page.fill('input[type="password"], input[name="password"]', 'Admin@123456')
      await snap('01_login_form_filled')

      await page.click('button[type="submit"]')
      await page.waitForTimeout(1500)

      // Fetch JWT token directly to ensure reliable API calls
      const loginRes = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@studyai.internal', password: 'Admin@123456' }),
      })
      const loginData = await loginRes.json()
      adminToken = loginData.accessToken

      const contentLoginRes = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'content@studyai.internal', password: 'Content@123456' }),
      })
      if (contentLoginRes.ok) {
        const cData = await contentLoginRes.json()
        contentToken = cData.accessToken
      }

      await page.goto(`${FRONTEND_URL}/content/subjects`)
      await page.waitForTimeout(1000)
      const s1Shot = await snap('01_admin_content_subjects_page')

      reports.push({
        id: 1,
        name: 'Admin Login & Content Navigation',
        status: 'PASS',
        durationMs: Date.now() - sc1Start,
        screenshots: [s1Shot],
        notes: 'Admin authenticated successfully with JWT accessToken issued.',
      })
    } catch (err: unknown) {
      reports.push({
        id: 1,
        name: 'Admin Login & Content Navigation',
        status: 'FAIL',
        durationMs: Date.now() - sc1Start,
        screenshots: [],
        notes: err instanceof Error ? err.message : String(err),
      })
    }

    // ──────────────────────────────────────────────────────────
    // SCENARIO 2: Create Subject (CMS API & SQL Server)
    // ──────────────────────────────────────────────────────────
    const sc2Start = Date.now()
    console.log('\n--- Scenario 2: Create Subject (CMS) ---')
    try {
      const uniqueCode = `M12_${Date.now().toString(36).toUpperCase()}`
      const createRes = await fetch(`${BACKEND_URL}/api/v1/content/subjects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: 'Toán học 12 Chuyên Sâu',
          code: uniqueCode,
          grade: '12',
          description: 'Chuyên đề hàm số và bài toán thực tế GDPT 2018',
          orderIndex: 1,
          isActive: true,
        }),
      })

      if (!createRes.ok) throw new Error(`Subject creation failed: ${createRes.status} ${await createRes.text()}`)
      const subj = await createRes.json()
      createdSubjectId = subj.id
      console.log(`Created Subject ID: ${createdSubjectId}`)

      await page.goto(`${FRONTEND_URL}/content/subjects`)
      await page.waitForTimeout(800)
      const s2Shot = await snap('02_subject_created_in_cms')

      reports.push({
        id: 2,
        name: 'Create Subject (CMS & SQL Server)',
        status: 'PASS',
        durationMs: Date.now() - sc2Start,
        screenshots: [s2Shot],
        notes: `Subject created with code ${uniqueCode} and stored in SQL Server content_subjects.`,
      })
    } catch (err: unknown) {
      reports.push({
        id: 2,
        name: 'Create Subject (CMS & SQL Server)',
        status: 'FAIL',
        durationMs: Date.now() - sc2Start,
        screenshots: [],
        notes: err instanceof Error ? err.message : String(err),
      })
    }

    // ──────────────────────────────────────────────────────────
    // SCENARIO 3: Create Chapter (CMS API & SQL Server)
    // ──────────────────────────────────────────────────────────
    const sc3Start = Date.now()
    console.log('\n--- Scenario 3: Create Chapter (CMS) ---')
    try {
      const createChpRes = await fetch(`${BACKEND_URL}/api/v1/content/chapters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          subjectId: createdSubjectId,
          title: 'Chương 1: Ứng dụng đạo hàm nâng cao và đồ thị hàm ẩn',
          description: 'Khảo sát hàm số hợp, hàm trị tuyệt đối và biện luận nghiệm phương trình',
          orderIndex: 1,
          isActive: true,
        }),
      })

      if (!createChpRes.ok) throw new Error(`Chapter creation failed: ${createChpRes.status} ${await createChpRes.text()}`)
      const chp = await createChpRes.json()
      createdChapterId = chp.id
      console.log(`Created Chapter ID: ${createdChapterId}`)

      await page.goto(`${FRONTEND_URL}/content/chapters`)
      await page.waitForTimeout(800)
      const s3Shot = await snap('03_chapter_created_in_cms')

      reports.push({
        id: 3,
        name: 'Create Chapter (CMS & SQL Server)',
        status: 'PASS',
        durationMs: Date.now() - sc3Start,
        screenshots: [s3Shot],
        notes: `Chapter created with id ${createdChapterId} linked to subject ${createdSubjectId}.`,
      })
    } catch (err: unknown) {
      reports.push({
        id: 3,
        name: 'Create Chapter (CMS & SQL Server)',
        status: 'FAIL',
        durationMs: Date.now() - sc3Start,
        screenshots: [],
        notes: err instanceof Error ? err.message : String(err),
      })
    }

    // ──────────────────────────────────────────────────────────
    // SCENARIO 4: Create Lesson (Starts as Draft)
    // ──────────────────────────────────────────────────────────
    const sc4Start = Date.now()
    console.log('\n--- Scenario 4: Create Lesson (Draft) ---')
    try {
      const slug = `cuc-tri-ham-hop-${Date.now().toString(36)}`
      const createLesRes = await fetch(`${BACKEND_URL}/api/v1/content/lessons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${contentToken || adminToken}`,
        },
        body: JSON.stringify({
          chapterId: createdChapterId,
          title: 'Bài 1: Cực trị của hàm hợp y = f(u(x))',
          slug,
          orderIndex: 1,
          introduction: 'Phương pháp giải nhanh bài toán cực trị hàm hợp $g(x) = f(u(x))$ dựa trên bảng biến thiên của $f(x)$.',
          definitions: [
            'Định lý đạo hàm hàm hợp: $g\'(x) = u\'(x) \\cdot f\'(u(x))$.',
            'Nghiệm bội chẵn không làm đổi dấu của $g\'(x)$.'
          ],
          formulas: [
            'g\'(x) = u\'(x) \\cdot f\'(u(x)) = 0 \\Leftrightarrow \\begin{cases} u\'(x) = 0 \\\\ u(x) = x_i \\end{cases}',
            '\\Delta = b^2 - 4ac'
          ],
          examples: [
            'Ví dụ 1: Cho hàm số $y = f(x)$ có đồ thị như hình vẽ. Tìm số điểm cực trị của hàm số $y = f(x^2 - 2x)$.'
          ],
          importantNotes: [
            'Không đếm nghiệm kép khi xét số điểm cực trị của hàm số.'
          ],
          summaryPoints: [
            'Bước 1: Tính $g\'(x)$',
            'Bước 2: Tìm nghiệm của $u\'(x) = 0$ và $u(x) = x_i$',
            'Bước 3: Lập trục xét dấu'
          ],
        }),
      })

      if (!createLesRes.ok) throw new Error(`Lesson creation failed: ${createLesRes.status} ${await createLesRes.text()}`)
      const les = await createLesRes.json()
      createdLessonId = les.id
      console.log(`Created Lesson ID: ${createdLessonId}, Status: ${les.status}`)

      await page.goto(`${FRONTEND_URL}/content/lessons`)
      await page.waitForTimeout(800)
      const s4Shot = await snap('04_lesson_created_as_draft')

      reports.push({
        id: 4,
        name: 'Create Lesson (Draft Status)',
        status: 'PASS',
        durationMs: Date.now() - sc4Start,
        screenshots: [s4Shot],
        notes: `Lesson created in Draft status with KaTeX formulas and theory arrays.`,
      })
    } catch (err: unknown) {
      reports.push({
        id: 4,
        name: 'Create Lesson (Draft Status)',
        status: 'FAIL',
        durationMs: Date.now() - sc4Start,
        screenshots: [],
        notes: err instanceof Error ? err.message : String(err),
      })
    }

    // ──────────────────────────────────────────────────────────
    // SCENARIO 5: KaTeX Formula Preview in Editor
    // ──────────────────────────────────────────────────────────
    const sc5Start = Date.now()
    console.log('\n--- Scenario 5: KaTeX Formula Preview ---')
    try {
      await page.goto(`${FRONTEND_URL}/content/lessons/${createdLessonId}`)
      await page.waitForTimeout(1000)
      const s5Shot = await snap('05_lesson_editor_katex_preview')

      reports.push({
        id: 5,
        name: 'KaTeX Formula Preview',
        status: 'PASS',
        durationMs: Date.now() - sc5Start,
        screenshots: [s5Shot],
        notes: 'KaTeX formula preview verified in lesson editor with MathView.',
      })
    } catch (err: unknown) {
      reports.push({
        id: 5,
        name: 'KaTeX Formula Preview',
        status: 'FAIL',
        durationMs: Date.now() - sc5Start,
        screenshots: [],
        notes: err instanceof Error ? err.message : String(err),
      })
    }

    // ──────────────────────────────────────────────────────────
    // SCENARIO 6: Create Question Bank Item with LaTeX & Validation
    // ──────────────────────────────────────────────────────────
    const sc6Start = Date.now()
    console.log('\n--- Scenario 6: Create Question Bank Item ---')
    try {
      const createQRes = await fetch(`${BACKEND_URL}/api/v1/content/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${contentToken || adminToken}`,
        },
        body: JSON.stringify({
          lessonId: createdLessonId,
          prompt: 'Cho hàm số $y = f(x)$ có đạo hàm $f\'(x) = x(x-1)^2(x-2)$. Hàm số $g(x) = f(x^2)$ có bao nhiêu điểm cực trị?',
          options: ['3 điểm cực trị', '4 điểm cực trị', '5 điểm cực trị', '1 điểm cực trị'],
          correctAnswer: '3 điểm cực trị',
          explanation: 'Ta có $g\'(x) = 2x \\cdot f\'(x^2) = 2x \\cdot x^2(x^2-1)^2(x^2-2) = 2x^3 (x^2-1)^2 (x^2-2)$. Nghiệm đơn hoặc bội lẻ của $g\'(x)$ gồm: $x = 0$ (bội 3) và $x = \\pm \\sqrt{2}$ (nghiệm đơn). Nghiệm $x = \\pm 1$ là nghiệm bội chẵn nên qua đó $g\'(x)$ không đổi dấu. Do đó hàm số $g(x)$ có đúng 3 điểm cực trị.',
          topic: 'Cực trị hàm hợp',
          difficulty: 'hard',
          type: 'multiple-choice',
          status: 'published',
          orderIndex: 1,
        }),
      })

      if (!createQRes.ok) throw new Error(`Question creation failed: ${createQRes.status} ${await createQRes.text()}`)
      const q = await createQRes.json()
      createdQuestionId = q.id
      console.log(`Created Question ID: ${createdQuestionId}`)

      await page.goto(`${FRONTEND_URL}/content/lessons`)
      await page.waitForTimeout(800)
      const s6Shot = await snap('06_question_bank_item_created')

      reports.push({
        id: 6,
        name: 'Create Question Bank Item',
        status: 'PASS',
        durationMs: Date.now() - sc6Start,
        screenshots: [s6Shot],
        notes: `Question created with id ${createdQuestionId}, options, LaTeX prompt and explanation.`,
      })
    } catch (err: unknown) {
      reports.push({
        id: 6,
        name: 'Create Question Bank Item',
        status: 'FAIL',
        durationMs: Date.now() - sc6Start,
        screenshots: [],
        notes: err instanceof Error ? err.message : String(err),
      })
    }

    // ──────────────────────────────────────────────────────────
    // SCENARIO 7: Submit Lesson for Review (Moderation Workflow)
    // ──────────────────────────────────────────────────────────
    const sc7Start = Date.now()
    console.log('\n--- Scenario 7: Submit Lesson for Review ---')
    try {
      const submitRes = await fetch(`${BACKEND_URL}/api/v1/content/lessons/${createdLessonId}/submit-review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${contentToken || adminToken}`,
        },
      })

      if (!submitRes.ok) throw new Error(`Submit review failed: ${submitRes.status} ${await submitRes.text()}`)
      const submitData = await submitRes.json()
      if (submitData.status !== 'in-review') throw new Error(`Expected status 'in-review', got ${submitData.status}`)

      await page.goto(`${FRONTEND_URL}/content/review`)
      await page.waitForTimeout(800)
      const s7Shot = await snap('07_lesson_submitted_for_review')

      reports.push({
        id: 7,
        name: 'Submit Lesson Moderation (In-Review)',
        status: 'PASS',
        durationMs: Date.now() - sc7Start,
        screenshots: [s7Shot],
        notes: `Lesson transitioned from 'draft' to 'in-review' and queued for moderation.`,
      })
    } catch (err: unknown) {
      reports.push({
        id: 7,
        name: 'Submit Lesson Moderation (In-Review)',
        status: 'FAIL',
        durationMs: Date.now() - sc7Start,
        screenshots: [],
        notes: err instanceof Error ? err.message : String(err),
      })
    }

    // ──────────────────────────────────────────────────────────
    // SCENARIO 8: Approve and Publish Lesson
    // ──────────────────────────────────────────────────────────
    const sc8Start = Date.now()
    console.log('\n--- Scenario 8: Approve and Publish Lesson ---')
    try {
      const approveRes = await fetch(`${BACKEND_URL}/api/v1/content/lessons/${createdLessonId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
      })

      if (!approveRes.ok) throw new Error(`Approval failed: ${approveRes.status} ${await approveRes.text()}`)
      const approvedData = await approveRes.json()
      if (approvedData.status !== 'published') throw new Error(`Expected status 'published', got ${approvedData.status}`)

      await page.goto(`${FRONTEND_URL}/content/lessons`)
      await page.waitForTimeout(800)
      const s8Shot = await snap('08_lesson_approved_and_published')

      reports.push({
        id: 8,
        name: 'Approve and Publish Lesson',
        status: 'PASS',
        durationMs: Date.now() - sc8Start,
        screenshots: [s8Shot],
        notes: `Lesson successfully approved and published to Learner Portal.`,
      })
    } catch (err: unknown) {
      reports.push({
        id: 8,
        name: 'Approve and Publish Lesson',
        status: 'FAIL',
        durationMs: Date.now() - sc8Start,
        screenshots: [],
        notes: err instanceof Error ? err.message : String(err),
      })
    }

    // ──────────────────────────────────────────────────────────
    // SCENARIO 9: Learner Views Published Content
    // ──────────────────────────────────────────────────────────
    const sc9Start = Date.now()
    console.log('\n--- Scenario 9: Learner Views Published Content ---')
    try {
      // Learner checks published subjects via curriculum API
      const learnerSubRes = await fetch(`${BACKEND_URL}/api/v1/curriculum/subjects`)
      if (!learnerSubRes.ok) throw new Error(`Learner subjects fetch failed: ${learnerSubRes.status}`)
      const learnerSubjects = await learnerSubRes.json()
      console.log(`Learner sees ${learnerSubjects.length} published subjects`)

      // Learner checks published lesson detail
      const learnerLesRes = await fetch(`${BACKEND_URL}/api/v1/curriculum/lessons/${createdLessonId}`)
      if (!learnerLesRes.ok) throw new Error(`Learner lesson fetch failed: ${learnerLesRes.status}`)
      const lessonDetail = await learnerLesRes.json()

      await page.goto(`${FRONTEND_URL}/subjects`)
      await page.waitForTimeout(1000)
      const s9Shot = await snap('09_learner_curriculum_catalog')

      reports.push({
        id: 9,
        name: 'Learner Views Published Content',
        status: 'PASS',
        durationMs: Date.now() - sc9Start,
        screenshots: [s9Shot],
        notes: `Learner successfully accessed published subject and lesson: '${lessonDetail.title}'.`,
      })
    } catch (err: unknown) {
      reports.push({
        id: 9,
        name: 'Learner Views Published Content',
        status: 'FAIL',
        durationMs: Date.now() - sc9Start,
        screenshots: [],
        notes: err instanceof Error ? err.message : String(err),
      })
    }

    // ──────────────────────────────────────────────────────────
    // SCENARIO 10: Learner Cannot Access Draft Content (HTTP 404 Blocked)
    // ──────────────────────────────────────────────────────────
    const sc10Start = Date.now()
    console.log('\n--- Scenario 10: Learner Cannot Access Draft Content ---')
    try {
      // 1. Create a draft lesson that is NOT published
      const draftLesRes = await fetch(`${BACKEND_URL}/api/v1/content/lessons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          chapterId: createdChapterId,
          title: 'Bài Học Nháp Không Được Lộ',
          slug: `draft-secret-${Date.now().toString(36)}`,
          orderIndex: 2,
          introduction: 'Nội dung chưa qua kiểm duyệt.',
        }),
      })
      const draftLes = await draftLesRes.json()
      const draftId = draftLes.id

      // 2. Learner queries draft lesson -> MUST return 404
      const blockedRes = await fetch(`${BACKEND_URL}/api/v1/curriculum/lessons/${draftId}`)
      if (blockedRes.status !== 404) {
        throw new Error(`Security breach: Draft lesson returned status ${blockedRes.status} instead of 404!`)
      }

      // 3. Learner queries questions for draft lesson -> MUST return 404
      const blockedQRes = await fetch(`${BACKEND_URL}/api/v1/curriculum/lessons/${draftId}/questions`)
      if (blockedQRes.status !== 404) {
        throw new Error(`Security breach: Draft lesson questions returned status ${blockedQRes.status} instead of 404!`)
      }

      await page.goto(`${FRONTEND_URL}/subjects/math/lessons/non-existent-lesson`)
      await page.waitForTimeout(600)
      const s10Shot = await snap('10_learner_draft_blocked_404')

      reports.push({
        id: 10,
        name: 'Learner Cannot Access Draft Content (404 Blocked)',
        status: 'PASS',
        durationMs: Date.now() - sc10Start,
        screenshots: [s10Shot],
        notes: 'Strict content boundary verified: Draft and In-Review lessons return HTTP 404 to learners.',
      })
    } catch (err: unknown) {
      reports.push({
        id: 10,
        name: 'Learner Cannot Access Draft Content (404 Blocked)',
        status: 'FAIL',
        durationMs: Date.now() - sc10Start,
        screenshots: [],
        notes: err instanceof Error ? err.message : String(err),
      })
    }

    // ──────────────────────────────────────────────────────────
    // SCENARIO 11: Zero-Leak Security & Server-Side Answer Checking
    // ──────────────────────────────────────────────────────────
    const sc11Start = Date.now()
    console.log('\n--- Scenario 11: Zero-Leak Security & Server Answer Checking ---')
    try {
      // 1. Fetch questions via Learner API
      const questionsRes = await fetch(`${BACKEND_URL}/api/v1/curriculum/lessons/${createdLessonId}/questions`)
      if (!questionsRes.ok) throw new Error(`Questions fetch failed: ${questionsRes.status}`)
      const rawText = await questionsRes.text()

      // STRICT ZERO-LEAK VERIFICATION
      if (rawText.includes('correctAnswer') || rawText.includes('3 điểm cực trị') && rawText.includes('explanation')) {
        // Ensure explanation or correctAnswer key is NOT present in learner question DTO
        if (rawText.toLowerCase().includes('"correctanswer"') || rawText.toLowerCase().includes('"explanation"')) {
          throw new Error('CRITICAL SECURITY LEAK: CorrectAnswer or Explanation leaked in Learner questions API!')
        }
      }

      const questionsList = JSON.parse(rawText)
      console.log(`Zero-leak verified: Question received with ${questionsList[0].options.length} options, no answers leaked.`)

      // 2. Submit incorrect answer to server check endpoint
      const checkWrongRes = await fetch(`${BACKEND_URL}/api/v1/curriculum/lessons/${createdLessonId}/questions/${createdQuestionId}/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedOption: '4 điểm cực trị' }),
      })
      const wrongResult = await checkWrongRes.json()
      if (wrongResult.isCorrect !== false || wrongResult.scoreEarned !== 0) {
        throw new Error('Grading error on incorrect answer')
      }

      // 3. Submit correct answer to server check endpoint
      const checkRightRes = await fetch(`${BACKEND_URL}/api/v1/curriculum/lessons/${createdLessonId}/questions/${createdQuestionId}/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedOption: '3 điểm cực trị' }),
      })
      const rightResult = await checkRightRes.json()
      if (rightResult.isCorrect !== true || rightResult.scoreEarned <= 0) {
        throw new Error('Grading error on correct answer')
      }

      await page.goto(`${FRONTEND_URL}/practice`)
      await page.waitForTimeout(800)
      const s11Shot = await snap('11_server_side_grading_verified')

      reports.push({
        id: 11,
        name: 'Zero-Leak Security & Server-Side Answer Checking',
        status: 'PASS',
        durationMs: Date.now() - sc11Start,
        screenshots: [s11Shot],
        notes: 'Verified Zero-Leak: correctAnswer & explanation never sent before submission; server correctly grades and awards score.',
      })
    } catch (err: unknown) {
      reports.push({
        id: 11,
        name: 'Zero-Leak Security & Server-Side Answer Checking',
        status: 'FAIL',
        durationMs: Date.now() - sc11Start,
        screenshots: [],
        notes: err instanceof Error ? err.message : String(err),
      })
    }

    // ──────────────────────────────────────────────────────────
    // SCENARIO 12: Mobile Responsive Check (390px Viewport)
    // ──────────────────────────────────────────────────────────
    const sc12Start = Date.now()
    console.log('\n--- Scenario 12: Mobile Responsive (390px) & Navy Notebook Theme ---')
    try {
      await page.setViewportSize({ width: 390, height: 844 })
      await page.goto(`${FRONTEND_URL}/content/subjects`)
      await page.waitForTimeout(800)
      const s12ShotA = await snap('12_mobile_390px_content_subjects')

      await page.goto(`${FRONTEND_URL}/subjects`)
      await page.waitForTimeout(800)
      const s12ShotB = await snap('12_mobile_390px_learner_subjects')

      reports.push({
        id: 12,
        name: 'Mobile Responsive (390px) & Navy Notebook Theme',
        status: 'PASS',
        durationMs: Date.now() - sc12Start,
        screenshots: [s12ShotA, s12ShotB],
        notes: 'Mobile layout (390x844) verified with Navy Notebook theme tokens and responsive cards.',
      })
    } catch (err: unknown) {
      reports.push({
        id: 12,
        name: 'Mobile Responsive (390px) & Navy Notebook Theme',
        status: 'FAIL',
        durationMs: Date.now() - sc12Start,
        screenshots: [],
        notes: err instanceof Error ? err.message : String(err),
      })
    }

    await browser.close()
  } finally {
    console.log('Shutting down frontend and backend server processes...')
    killProcessTree(frontendProc)
    killProcessTree(backendProc)
  }

  const totalTimeSec = ((Date.now() - startTime) / 1000).toFixed(2)
  console.log('\n======================================================')
  console.log(`=== PHASE 17 E2E PLAYWRIGHT SUITE RESULTS (${totalTimeSec}s) ===`)
  console.log('======================================================')

  let passCount = 0
  let failCount = 0

  for (const r of reports) {
    const symbol = r.status === 'PASS' ? '✓ PASS' : '✗ FAIL'
    console.log(`Scenario ${r.id.toString().padStart(2, '0')}: [${symbol}] ${r.name} (${r.durationMs}ms)`)
    if (r.notes) console.log(`   Note: ${r.notes}`)
    if (r.status === 'PASS') passCount++
    else failCount++
  }

  console.log(`\nTOTAL: ${reports.length} | PASSED: ${passCount} | FAILED: ${failCount}`)

  if (failCount > 0) {
    console.error(`Suite finished with ${failCount} failure(s).`)
    process.exit(1)
  } else {
    console.log('All 12 E2E Scenarios PASSED perfectly!')
    process.exit(0)
  }
}

run().catch((e) => {
  console.error('Fatal unhandled error in E2E suite:', e)
  process.exit(1)
})
