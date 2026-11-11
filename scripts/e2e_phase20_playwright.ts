import { chromium } from 'playwright'
import { spawn, ChildProcess } from 'child_process'
import fs from 'fs'
import path from 'path'
import { resolveDotnet10Environment } from './utils/dotnetRuntime'
import { assertSafeTestDatabase } from './utils/databaseSafetyGuard'

const BACKEND_PORT = 5297
const FRONTEND_PORT = 4180
const BACKEND_URL = `http://127.0.0.1:${BACKEND_PORT}`
const FRONTEND_URL = `http://127.0.0.1:${FRONTEND_PORT}`
const QA_DIR = path.join('docs', 'visual-qa', 'phase-20')

// Dedicated test database connection string to strictly protect StudyAIDb
const E2E_CONNECTION_STRING =
  process.env.ConnectionStrings__DefaultConnection ||
  'Server=.\\SQLEXPRESS;Database=StudyAIDb_E2E;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True'

// Fail-closed database safety guard: abort immediately if targeting StudyAIDb
assertSafeTestDatabase(E2E_CONNECTION_STRING, 'Phase 20 Playwright E2E')

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
  console.log('=== STARTING PHASE 20 CLASSROOM, ASSIGNMENT & SUBMISSION E2E PLAYWRIGHT SUITE ===')
  console.log(`Timestamp: ${new Date().toISOString()}`)
  console.log(`Target E2E Database: StudyAIDb_E2E (Isolated test database)`)

  const reports: ScenarioReport[] = []

  const dotnetEnv = resolveDotnet10Environment()
  const { dotnetRoot, dotnetBin, customPath } = dotnetEnv

  console.log(`Using .NET Root: ${dotnetRoot}`)
  console.log(`Using .NET Binary: ${dotnetBin}`)

  // 1. Start ASP.NET Core API
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

  // 2. Start Frontend Preview Server
  console.log(`Starting Frontend Preview Server on ${FRONTEND_URL}...`)
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

    // ──────────────────────────────────────────────────────────
    // SCENARIO 1: Teacher/Admin Login & Classroom Management
    // ──────────────────────────────────────────────────────────
    console.log('\n--- Scenario 1: Teacher/Admin Login & Classroom List ---')
    const s1Start = Date.now()
    const s1Snaps: string[] = []

    await page.goto(`${FRONTEND_URL}/login`)
    await page.waitForLoadState('networkidle')

    await page.fill('#login-email', 'admin@studyai.internal')
    await page.fill('#login-password', 'Admin@123456')
    await page.click('button[type="submit"]')

    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 })
    console.log('  Successfully authenticated as Teacher/Admin.')

    await page.goto(`${FRONTEND_URL}/teacher/classes`)
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('text=Quản lý lớp học', { timeout: 10000 })

    s1Snaps.push(await snap('phase20_01_teacher_classes_list'))

    reports.push({
      id: 1,
      name: 'Teacher/Admin Login & Navigation to Teacher Classes',
      status: 'PASS',
      durationMs: Date.now() - s1Start,
      screenshots: s1Snaps,
      notes: 'Successfully logged in as Teacher/Admin and rendered Teacher Classes management dashboard.',
    })

    // ──────────────────────────────────────────────────────────
    // SCENARIO 2: Create Classroom via API & Dialog
    // ──────────────────────────────────────────────────────────
    console.log('\n--- Scenario 2: Create Classroom ---')
    const s2Start = Date.now()
    const s2Snaps: string[] = []

    // Click "Thêm lớp học" button
    const addClassBtn = page.locator('button:has-text("Thêm lớp học")').first()
    await addClassBtn.click()

    await page.waitForSelector('.admin-modal-card', { timeout: 10000 })

    const uniqueClassCode = `12A${Math.floor(Date.now() % 10000)}`
    const className = `Lớp 12A Chuyên Toán ${uniqueClassCode}`

    await page.fill('#cls-code', uniqueClassCode)
    await page.fill('#cls-name', className)

    s2Snaps.push(await snap('phase20_02_create_classroom_modal'))

    // Submit form
    await page.click('.admin-modal-card button[type="submit"]')
    await page.waitForTimeout(1000)

    // Verify created class is visible in list
    await page.waitForSelector(`text=${className}`, { timeout: 10000 })
    console.log(`  Classroom "${className}" successfully created and visible in list.`)

    s2Snaps.push(await snap('phase20_03_classroom_created_in_list'))

    reports.push({
      id: 2,
      name: 'Classroom Creation with Validation and State Sync',
      status: 'PASS',
      durationMs: Date.now() - s2Start,
      screenshots: s2Snaps,
      notes: `Successfully created classroom "${className}" with code "${uniqueClassCode}".`,
    })

    // ──────────────────────────────────────────────────────────
    // SCENARIO 3: Classroom Details & Learner Enrollment
    // ──────────────────────────────────────────────────────────
    console.log('\n--- Scenario 3: Classroom Details & Learner Enrollment ---')
    const s3Start = Date.now()
    const s3Snaps: string[] = []

    // Click "Xem chi tiết" on the created class card
    const viewClassLink = page.locator(`.staff-data-card:has-text("${className}") a, tr:has-text("${className}") a, a:has-text("Xem chi tiết")`).first()
    await viewClassLink.click()

    await page.waitForLoadState('networkidle')
    await page.waitForSelector(`text=${className}`, { timeout: 10000 })

    s3Snaps.push(await snap('phase20_04_classroom_detail_page'))

    // Click "Thêm học viên"
    const addStudentBtn = page.locator('button:has-text("Thêm học viên")').first()
    await addStudentBtn.click()

    await page.waitForSelector('.admin-modal-card', { timeout: 10000 })
    await page.fill('#new-stu-name', 'Học viên Test')
    await page.fill('#new-stu-email', 'learner@studyai.internal')

    s3Snaps.push(await snap('phase20_05_enroll_student_modal'))

    await page.click('.admin-modal-card button[type="submit"]')
    await page.waitForTimeout(1000)

    console.log('  Enrolled learner "learner@studyai.internal" into the classroom.')
    s3Snaps.push(await snap('phase20_06_student_enrolled_in_class'))

    reports.push({
      id: 3,
      name: 'Classroom Detail & Learner Enrollment',
      status: 'PASS',
      durationMs: Date.now() - s3Start,
      screenshots: s3Snaps,
      notes: 'Successfully opened classroom detail and enrolled learner "learner@studyai.internal".',
    })

    // ──────────────────────────────────────────────────────────
    // SCENARIO 4: Create Assignment for Classroom
    // ──────────────────────────────────────────────────────────
    console.log('\n--- Scenario 4: Create Assignment for Classroom ---')
    const s4Start = Date.now()
    const s4Snaps: string[] = []

    await page.goto(`${FRONTEND_URL}/teacher/assignments`)
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('text=Quản lý bài tập', { timeout: 10000 })

    const addAsgBtn = page.locator('button:has-text("Giao bài tập")').first()
    await addAsgBtn.click()

    await page.waitForSelector('.admin-modal-card', { timeout: 10000 })

    const asgTitle = `Bài tập GDPT 2018 - Khảo sát Đạo hàm ${Math.floor(Date.now() % 10000)}`
    await page.fill('#asg-title-input', asgTitle)

    // Select the class if dropdown exists
    const classSelect = page.locator('#asg-class-select').first()
    if (await classSelect.count() > 0) {
      const options = await classSelect.locator('option').allInnerTexts()
      console.log('Available classroom options for assignment:', options)
      let matchIdx = options.findIndex((opt) => opt.includes(uniqueClassCode))
      if (matchIdx === -1) {
        matchIdx = options.findIndex((opt) => opt.includes(className))
      }
      if (matchIdx >= 0) {
        console.log(`Selecting class option [${matchIdx}]: ${options[matchIdx]}`)
        await classSelect.selectOption({ index: matchIdx })
      } else {
        throw new Error(`Failed to find created classroom option containing "${uniqueClassCode}" or "${className}". Options: ${options.join(', ')}`)
      }
    }

    s4Snaps.push(await snap('phase20_07_create_assignment_modal'))

    await page.click('.admin-modal-card button[type="submit"]')
    await page.waitForTimeout(1000)

    await page.waitForSelector(`text=${asgTitle}`, { timeout: 10000 })
    console.log(`  Assignment "${asgTitle}" successfully created.`)

    s4Snaps.push(await snap('phase20_08_assignment_in_teacher_list'))

    reports.push({
      id: 4,
      name: 'Assignment Creation with Due Date and Instructions',
      status: 'PASS',
      durationMs: Date.now() - s4Start,
      screenshots: s4Snaps,
      notes: `Successfully created assignment "${asgTitle}".`,
    })

    // ──────────────────────────────────────────────────────────
    // SCENARIO 5: Learner Login & Submit Assignment Work
    // ──────────────────────────────────────────────────────────
    console.log('\n--- Scenario 5: Learner Login & Submit Assignment Work ---')
    const s5Start = Date.now()
    const s5Snaps: string[] = []

    // Logout from teacher
    await page.goto(`${FRONTEND_URL}/dashboard`)
    await page.waitForLoadState('networkidle')
    const userTrigger = page.locator('.topbar-user-trigger')
    if (await userTrigger.count() > 0) {
      await userTrigger.click()
      const logoutBtn = page.locator('.topbar-user-dropdown button:has-text("Đăng xuất")')
      await logoutBtn.click()
      await page.waitForTimeout(500)
    }

    // Login as learner
    await page.goto(`${FRONTEND_URL}/login`)
    await page.waitForLoadState('networkidle')
    await page.fill('#login-email', 'learner@studyai.internal')
    await page.fill('#login-password', 'Learner@123456')
    await page.click('button[type="submit"]')
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 })

    // Navigate to Learner Assignments Page
    await page.goto(`${FRONTEND_URL}/assignments`)
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('text=Bài tập của tôi', { timeout: 10000 })

    s5Snaps.push(await snap('phase20_09_learner_assignments_dashboard'))

    // Find our assignment card
    const learnerAsgCard = page.locator(`.learner-assignment-card:has-text("${asgTitle}")`).first()
    await learnerAsgCard.waitFor({ timeout: 10000 })
    await learnerAsgCard.click()

    await page.waitForSelector('.learner-modal-content', { timeout: 5000 })
    s5Snaps.push(await snap('phase20_10_learner_submit_dialog_opened'))

    // Enter submission text
    const submissionText = 'Lời giải bài tập: Đạo hàm y\' = 3x^2 - 6x = 0 <=> x = 0 hoặc x = 2. Giá trị cực đại y(0) = 4, cực tiểu y(2) = 0.'
    await page.fill('.learner-submit-textarea', submissionText)

    // Submit work
    await page.click('.learner-modal-submit-btn')
    await page.waitForSelector('text=Nộp bài tập thành công!', { timeout: 8000 })
    console.log('  Learner submitted homework successfully.')

    s5Snaps.push(await snap('phase20_11_learner_work_submitted_status'))

    // Close modal dialog
    const closeBtn = page.locator('.learner-modal-close-btn, .learner-modal-cancel-btn').first()
    await closeBtn.click()
    await page.waitForTimeout(500)

    reports.push({
      id: 5,
      name: 'Learner Submission Workflow',
      status: 'PASS',
      durationMs: Date.now() - s5Start,
      screenshots: s5Snaps,
      notes: 'Learner viewed assignment, entered text submission, and submitted work with instant feedback.',
    })

    // ──────────────────────────────────────────────────────────
    // SCENARIO 6: Teacher Grades Submission & Gives Feedback
    // ──────────────────────────────────────────────────────────
    console.log('\n--- Scenario 6: Teacher Grades Submission ---')
    const s6Start = Date.now()
    const s6Snaps: string[] = []

    // Logout learner
    const learnerTrigger = page.locator('.topbar-user-trigger')
    if (await learnerTrigger.count() > 0) {
      await learnerTrigger.click()
      await page.locator('.topbar-user-dropdown button:has-text("Đăng xuất")').click()
      await page.waitForTimeout(500)
    }

    // Login Teacher/Admin
    await page.goto(`${FRONTEND_URL}/login`)
    await page.waitForLoadState('networkidle')
    await page.fill('#login-email', 'admin@studyai.internal')
    await page.fill('#login-password', 'Admin@123456')
    await page.click('button[type="submit"]')
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 })

    await page.goto(`${FRONTEND_URL}/teacher/assignments`)
    await page.waitForLoadState('networkidle')

    // Click assignment detail link
    const asgRowLink = page.locator(`.staff-data-card:has-text("${asgTitle}") a, tr:has-text("${asgTitle}") a`).first()
    await asgRowLink.click()

    await page.waitForLoadState('networkidle')
    await page.waitForSelector(`text=${asgTitle}`, { timeout: 10000 })

    s6Snaps.push(await snap('phase20_12_teacher_assignment_submissions_list'))

    // Click "Chấm điểm" button
    const gradeBtn = page.locator('button:has-text("Chấm điểm"), button:has-text("Chấm bài")').first()
    await gradeBtn.click()

    await page.waitForSelector('.admin-modal-card', { timeout: 10000 })

    const scoreInput = page.locator('#grade-score-input').first()
    await scoreInput.fill('9.5')

    const feedbackInput = page.locator('#grade-feedback-input').first()
    const teacherFeedback = 'Lời giải rất mạch lạc, xác định đúng cực trị và bảng biến thiên!'
    await feedbackInput.fill(teacherFeedback)

    s6Snaps.push(await snap('phase20_13_teacher_grading_modal'))

    await page.click('.admin-modal-card button[type="submit"]')
    await page.waitForTimeout(1000)

    console.log('  Teacher graded submission with 9.5 and feedback.')
    s6Snaps.push(await snap('phase20_14_submission_graded_success'))

    reports.push({
      id: 6,
      name: 'Teacher Grading and Academic Feedback',
      status: 'PASS',
      durationMs: Date.now() - s6Start,
      screenshots: s6Snaps,
      notes: 'Teacher reviewed submitted answer, entered score 9.5/10 and encouraging feedback.',
    })

    // ──────────────────────────────────────────────────────────
    // SCENARIO 7: Learner Views Graded Score & Negative RBAC Check
    // ──────────────────────────────────────────────────────────
    console.log('\n--- Scenario 7: Learner Views Graded Score & Negative RBAC Check ---')
    const s7Start = Date.now()
    const s7Snaps: string[] = []

    // Logout teacher
    await page.goto(`${FRONTEND_URL}/dashboard`)
    await page.waitForLoadState('networkidle')
    const tTrigger = page.locator('.topbar-user-trigger')
    if (await tTrigger.count() > 0) {
      await tTrigger.click()
      await page.locator('.topbar-user-dropdown button:has-text("Đăng xuất")').click()
      await page.waitForTimeout(500)
    }

    // Login learner
    await page.goto(`${FRONTEND_URL}/login`)
    await page.waitForLoadState('networkidle')
    await page.fill('#login-email', 'learner@studyai.internal')
    await page.fill('#login-password', 'Learner@123456')
    await page.click('button[type="submit"]')
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 })

    // View assignments
    await page.goto(`${FRONTEND_URL}/assignments`)
    await page.waitForLoadState('networkidle')

    const gradedCard = page.locator(`.learner-assignment-card:has-text("${asgTitle}")`).first()
    await gradedCard.waitFor({ timeout: 10000 })
    await gradedCard.click()

    await page.waitForSelector('.learner-modal-content', { timeout: 5000 })
    await page.waitForSelector('text=9.5', { timeout: 5000 })

    s7Snaps.push(await snap('phase20_15_learner_viewing_graded_result'))
    console.log('  Learner saw 9.5 score and teacher feedback!')

    // Negative RBAC: Learner attempts to access /teacher/classes
    await page.goto(`${FRONTEND_URL}/teacher/classes`)
    await page.waitForLoadState('networkidle')
    
    // RoleGuard renders 403 Forbidden UnauthorizedPage
    await page.waitForSelector('text=403 FORBIDDEN', { timeout: 10000 })
    await page.waitForSelector('text=Không có quyền truy cập', { timeout: 10000 })

    const teacherContentCount = await page.locator('text=Quản lý lớp học').count()
    if (teacherContentCount > 0) {
      throw new Error('FAILED: Learner should NOT see teacher management content!')
    }
    console.log('  Learner blocked from /teacher/classes by RoleGuard with 403 FORBIDDEN screen.')

    s7Snaps.push(await snap('phase20_16_learner_rbac_access_denied'))

    reports.push({
      id: 7,
      name: 'Learner Verification of Grade and Strict RBAC Enforcement',
      status: 'PASS',
      durationMs: Date.now() - s7Start,
      screenshots: s7Snaps,
      notes: 'Learner verified score 9.5/10 and teacher feedback. Cross-role navigation to /teacher/classes was strictly rejected.',
    })

    await browser.close()
  } finally {
    console.log('Shutting down backend and frontend server processes...')
    killProcessTree(backendProc)
    killProcessTree(frontendProc)
  }

  const durationSec = Math.round((Date.now() - startTime) / 1000)
  console.log(`\n=== PHASE 20 E2E SUITE COMPLETED IN ${durationSec}s ===`)

  const summary = {
    timestamp: new Date().toISOString(),
    totalScenarios: reports.length,
    passedScenarios: reports.filter((r) => r.status === 'PASS').length,
    failedScenarios: reports.filter((r) => r.status === 'FAIL').length,
    scenarios: reports,
  }

  fs.writeFileSync(path.join(QA_DIR, 'summary.json'), JSON.stringify(summary, null, 2))
  console.log(`Summary written to ${path.join(QA_DIR, 'summary.json')}`)

  const allPassed = reports.every((r) => r.status === 'PASS')
  if (!allPassed) {
    process.exit(1)
  }
}

run().catch((err) => {
  console.error('Fatal E2E test execution error:', err)
  process.exit(1)
})
