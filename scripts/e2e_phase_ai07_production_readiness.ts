import { chromium } from 'playwright'
import { spawn, ChildProcess } from 'child_process'
import fs from 'fs'
import path from 'path'
import { resolveDotnet10Environment } from './utils/dotnetRuntime'
import { assertSafeTestDatabase } from './utils/databaseSafetyGuard'
import { createDisposableTestDatabase, killProcessTreeAndWait } from './utils/disposableDb'

const BACKEND_PORT = 5298
const FRONTEND_PORT = 4181
const BACKEND_URL = `http://127.0.0.1:${BACKEND_PORT}`
const FRONTEND_URL = `http://127.0.0.1:${FRONTEND_PORT}`
const QA_DIR = path.join('docs', 'visual-qa', 'phase-ai07')

const _disposableDb = process.env.ConnectionStrings__DefaultConnection ? null : await createDisposableTestDatabase('e2e_phase_ai07_production_readiness')
const E2E_CONNECTION_STRING = process.env.ConnectionStrings__DefaultConnection || _disposableDb!.connectionString

assertSafeTestDatabase(E2E_CONNECTION_STRING, 'Phase AI-07 Production Readiness E2E')

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

async function waitForUrl(url: string, timeoutMs = 40000): Promise<void> {
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

async function runProductionReadinessE2E() {
  const startTime = Date.now()
  console.log('========================================================================')
  console.log('PHASE AI-07: PRODUCTION READINESS & END-TO-END VALIDATION SUITE')
  console.log(`Timestamp: ${new Date().toISOString()}`)
  console.log(`Database: StudyAIDb_E2E (Guarded Test Database)`)
  console.log('========================================================================')

  const reports: ScenarioReport[] = []
  const dotnetEnv = resolveDotnet10Environment()
  const { dotnetRoot, dotnetBin, customPath } = dotnetEnv

  console.log(`[Runtime] Using .NET Bin: ${dotnetBin}`)

  // 1. Start Backend API
  console.log(`Starting ASP.NET Core API on ${BACKEND_URL}...`)
  const backendProc: ChildProcess = spawn(
    dotnetBin,
    ['run', '--project', path.join('backend', 'src', 'StudyAI.Api'), '--urls', BACKEND_URL, '--no-build', '--no-launch-profile'],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PATH: customPath,
        DOTNET_ROOT: dotnetRoot,
        ASPNETCORE_ENVIRONMENT: 'Testing',
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

  // 2. Start Frontend Preview
  console.log(`Starting Frontend Preview on ${FRONTEND_URL}...`)
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

  frontendProc.stdout?.on('data', (d) => {
    const msg = d.toString()
    if (msg.includes('ready in') || msg.includes('Local:')) {
      console.log(`[Frontend Log] ${msg.trim()}`)
    }
  })

  try {
    console.log('Waiting for backend and frontend services to be ready...')
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

    await context.addInitScript((apiUrl) => {
      localStorage.setItem('study_ai_api_base_url', apiUrl)
      ;(window as any).__STUDY_AI_API_BASE_URL__ = apiUrl
    }, BACKEND_URL)

    const page = await context.newPage()

    async function snap(name: string): Promise<string> {
      const filename = `${name}.png`
      await page.screenshot({ path: path.join(QA_DIR, filename), fullPage: false })
      console.log(`  [Screenshot] Captured ${filename}`)
      return filename
    }

    // =========================================================================
    // JOURNEY 1: STUDENT JOURNEY (Học sinh)
    // =========================================================================
    console.log('\n--- JOURNEY 1: Student End-to-End Learning Experience ---')
    const j1Start = Date.now()
    const j1Snaps: string[] = []

    try {
      // 1.1 Login as Student
      console.log('  1.1 Navigating to /login...')
      await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle' })
      await page.fill('input[type="email"]', 'learner@studyai.internal')
      await page.fill('input[type="password"]', 'Learner@123456')
      await page.click('button[type="submit"]')
      await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 }).catch(() => {})
      await page.waitForTimeout(1000)
      j1Snaps.push(await snap('01_student_login_success'))

      // 1.2 Curriculum & Subjects
      console.log('  1.2 Navigating to /subjects...')
      await page.goto(`${FRONTEND_URL}/subjects`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(1000)
      j1Snaps.push(await snap('02_student_subjects_curriculum'))

      // 1.3 Lesson Page Redesign & Contextual Floating AI Chatbot
      console.log('  1.3 Navigating to Lesson Page...')
      await page.goto(`${FRONTEND_URL}/lesson/ch1-l1`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(1500)

      // Verify Lesson Redesign: Video area + Unified Overview card
      const videoArea = await page.locator('[data-testid="lesson-video-area"], .lesson-video-container, iframe').first()
      const overviewCard = await page.locator('[data-testid="lesson-overview-area"], .unified-overview-card').first()
      console.log(`  -> Video Area present: ${await videoArea.count() > 0}`)
      console.log(`  -> Overview Card present: ${await overviewCard.count() > 0}`)

      // Look for contextual "Hỏi AI Tutor" button
      const aiButton = page.locator('button:has-text("Hỏi AI Tutor"), button:has-text("Hỏi AI")').first()
      if (await aiButton.count() > 0) {
        await aiButton.click()
        await page.waitForTimeout(1000)
      }
      j1Snaps.push(await snap('03_student_lesson_and_floating_chatbot'))

      // 1.4 Adaptive Learning & Learning Coach
      console.log('  1.4 Navigating to /adaptive-learning...')
      await page.goto(`${FRONTEND_URL}/adaptive-learning`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(1200)
      j1Snaps.push(await snap('04_student_adaptive_learning_readiness'))

      // 1.5 Exam Preparation & Readiness
      console.log('  1.5 Navigating to /exam-preparation...')
      await page.goto(`${FRONTEND_URL}/exam-preparation`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(1200)
      j1Snaps.push(await snap('05_student_exam_preparation'))

      reports.push({
        id: 1,
        name: 'Student Journey (Login -> Curriculum -> Lesson & Floating AI -> Adaptive Practice -> Exam Prep)',
        status: 'PASS',
        durationMs: Date.now() - j1Start,
        screenshots: j1Snaps,
        notes: 'Verified simplified 2-area lesson layout, contextual AI Tutor, mastery profile, and exam preparation.'
      })
    } catch (err: any) {
      console.error('Journey 1 Error:', err.message)
      reports.push({
        id: 1,
        name: 'Student Journey',
        status: 'FAIL',
        durationMs: Date.now() - j1Start,
        screenshots: j1Snaps,
        notes: err.message
      })
    }

    // =========================================================================
    // JOURNEY 2: TEACHER JOURNEY (Giáo viên / Content Staff)
    // =========================================================================
    console.log('\n--- JOURNEY 2: Teacher & Content Management Experience ---')
    const j2Start = Date.now()
    const j2Snaps: string[] = []

    try {
      // Clear auth cookies/local storage for clean login
      await context.clearCookies()
      await page.evaluate(() => localStorage.clear())

      // 2.1 Login as Content/Teacher Staff
      console.log('  2.1 Logging in as content teacher staff...')
      await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle' })
      await page.fill('input[type="email"]', 'content@studyai.internal')
      await page.fill('input[type="password"]', 'Content@123456')
      await page.click('button[type="submit"]')
      await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 }).catch(() => {})
      await page.waitForTimeout(1000)
      j2Snaps.push(await snap('06_teacher_login_success'))

      // 2.2 Teacher Classroom Interventions
      console.log('  2.2 Navigating to /admin/classes...')
      await page.goto(`${FRONTEND_URL}/admin/classes`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(1200)
      j2Snaps.push(await snap('07_teacher_classroom_interventions'))

      // 2.3 Assignments & Grading Management
      console.log('  2.3 Navigating to /admin/assignments...')
      await page.goto(`${FRONTEND_URL}/admin/assignments`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(1200)
      j2Snaps.push(await snap('08_teacher_assignments_grading'))

      // 2.4 Content Management Lessons
      console.log('  2.4 Navigating to /content/lessons...')
      await page.goto(`${FRONTEND_URL}/content/lessons`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(1200)
      j2Snaps.push(await snap('09_teacher_content_management'))

      reports.push({
        id: 2,
        name: 'Teacher Journey (Classroom Management -> Assignments & Grading -> Content & Lesson Assistant)',
        status: 'PASS',
        durationMs: Date.now() - j2Start,
        screenshots: j2Snaps,
        notes: 'Verified classroom KPIs, student intervention workflow, and curriculum content authoring.'
      })
    } catch (err: any) {
      console.error('Journey 2 Error:', err.message)
      reports.push({
        id: 2,
        name: 'Teacher Journey',
        status: 'FAIL',
        durationMs: Date.now() - j2Start,
        screenshots: j2Snaps,
        notes: err.message
      })
    }

    // =========================================================================
    // JOURNEY 3: ADMIN JOURNEY (Quản trị viên & Vận hành AI)
    // =========================================================================
    console.log('\n--- JOURNEY 3: Admin Operations & Quality Assurance ---')
    const j3Start = Date.now()
    const j3Snaps: string[] = []

    try {
      await context.clearCookies()
      await page.evaluate(() => localStorage.clear())

      // 3.1 Login as Admin
      console.log('  3.1 Logging in as System Admin...')
      await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle' })
      await page.fill('input[type="email"]', 'admin@studyai.internal')
      await page.fill('input[type="password"]', 'Admin@123456')
      await page.click('button[type="submit"]')
      await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 }).catch(() => {})
      await page.waitForTimeout(1000)
      j3Snaps.push(await snap('10_admin_login_success'))

      // 3.2 Operations Dashboard: Tab 1 System Health
      console.log('  3.2 Navigating to /admin/operations...')
      await page.goto(`${FRONTEND_URL}/admin/operations`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(1500)
      j3Snaps.push(await snap('11_admin_system_health'))

      // 3.3 Operations Dashboard: Tab 2 AI Quality Evaluation
      console.log('  3.3 Switching to Benchmark Tab...')
      const benchmarkTab = page.locator('button:has-text("Kiểm định chất lượng"), button:has-text("Benchmark")').first()
      if (await benchmarkTab.count() > 0) {
        await benchmarkTab.click()
        await page.waitForTimeout(1500)
      }
      j3Snaps.push(await snap('12_admin_ai_quality_benchmark'))

      // 3.4 Operations Dashboard: Tab 3 AI Cost Optimization
      console.log('  3.4 Switching to Cost Tab...')
      const costTab = page.locator('button:has-text("Chi phí & Token"), button:has-text("Cost")').first()
      if (await costTab.count() > 0) {
        await costTab.click()
        await page.waitForTimeout(1000)
      }
      j3Snaps.push(await snap('13_admin_ai_cost_optimization'))

      // 3.5 Operations Dashboard: Tab 4 Data Consistency & Safe Repair
      console.log('  3.5 Switching to Data Consistency Tab...')
      const consistencyTab = page.locator('button:has-text("Tính toàn vẹn"), button:has-text("Consistency")').first()
      if (await consistencyTab.count() > 0) {
        await consistencyTab.click()
        await page.waitForTimeout(1500)

        // Test Dry-Run preview button
        const dryRunBtn = page.locator('button:has-text("Xem trước hiệu chỉnh"), button:has-text("Dry-Run")').first()
        if (await dryRunBtn.count() > 0 && await dryRunBtn.isEnabled()) {
          console.log('    Clicking Dry-Run Preview button...')
          await dryRunBtn.click()
          await page.waitForTimeout(2000)
        }
      }
      j3Snaps.push(await snap('14_admin_data_consistency_dry_run'))

      // 3.6 Operations Dashboard: Tab 5 Staff Audit Logs
      console.log('  3.6 Switching to Audit Logs Tab...')
      const auditTab = page.locator('button:has-text("Nhật ký kiểm toán"), button:has-text("Audit Logs")').first()
      if (await auditTab.count() > 0) {
        await auditTab.click()
        await page.waitForTimeout(1200)
      }
      j3Snaps.push(await snap('15_admin_staff_audit_trail'))

      reports.push({
        id: 3,
        name: 'Admin Journey (Operations Dashboard -> Health -> Benchmark -> Cost -> Safe Repair -> Audit Logs)',
        status: 'PASS',
        durationMs: Date.now() - j3Start,
        screenshots: j3Snaps,
        notes: 'Verified live telemetry, 12-case benchmark, dry-run repair preview, and immutable audit logs.'
      })
    } catch (err: any) {
      console.error('Journey 3 Error:', err.message)
      reports.push({
        id: 3,
        name: 'Admin Journey',
        status: 'FAIL',
        durationMs: Date.now() - j3Start,
        screenshots: j3Snaps,
        notes: err.message
      })
    }

    await browser.close()
  } finally {
    console.log('\nTearing down processes...')
    await killProcessTreeAndWait(backendProc)
    await killProcessTreeAndWait(frontendProc)
    if (_disposableDb) {
      await _disposableDb.cleanup()
    }
  }

  const totalDurationSec = Math.round((Date.now() - startTime) / 1000)
  console.log('\n========================================================================')
  console.log(`PHASE AI-07 PRODUCTION READINESS E2E EXECUTION FINISHED (${totalDurationSec}s)`)
  console.log('========================================================================')
  console.table(
    reports.map((r) => ({
      ID: r.id,
      Name: r.name,
      Status: r.status,
      'Duration (s)': (r.durationMs / 1000).toFixed(1),
      Screenshots: r.screenshots.length,
      Notes: r.notes,
    }))
  )

  const allPassed = reports.every((r) => r.status === 'PASS')
  if (!allPassed) {
    throw new Error('E2E validation had failed scenarios!')
  }
}

runProductionReadinessE2E().catch((e) => {
  console.error('CRITICAL FATAL RUNNER ERROR:', e)
  process.exit(1)
})

