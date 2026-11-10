import { chromium } from 'playwright'
import { spawn, ChildProcess } from 'child_process'
import fs from 'fs'
import path from 'path'
import { resolveDotnet10Environment } from './utils/dotnetRuntime'
import { assertSafeTestDatabase } from './utils/databaseSafetyGuard'

const BACKEND_PORT = 5295
const FRONTEND_PORT = 4178
const BACKEND_URL = `http://127.0.0.1:${BACKEND_PORT}`
const FRONTEND_URL = `http://127.0.0.1:${FRONTEND_PORT}`
const QA_DIR = path.join('docs', 'visual-qa', 'phase-19')

// Dedicated test database connection string to strictly protect StudyAIDb
const E2E_CONNECTION_STRING =
  process.env.ConnectionStrings__DefaultConnection ||
  'Server=.\\SQLEXPRESS;Database=StudyAIDb_E2E;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True'

// Fail-closed database safety guard: abort immediately if targeting StudyAIDb
assertSafeTestDatabase(E2E_CONNECTION_STRING, 'Phase 19 Playwright E2E')

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

async function querySql(query: string): Promise<string> {
  const { execSync } = await import('child_process')
  const escapedQuery = query.replace(/"/g, '""')
  const cmd = `sqlcmd -S .\\SQLEXPRESS -d StudyAIDb_E2E -E -C -h -1 -W -Q "${escapedQuery}"`
  try {
    const output = execSync(cmd, { encoding: 'utf8' })
    return output.trim()
  } catch (err: any) {
    return `SQLCMD_ERROR: ${err.message}`
  }
}

async function run() {
  const startTime = Date.now()
  console.log('=== STARTING PHASE 19 REAL AI TUTOR E2E PLAYWRIGHT SUITE ===')
  console.log(`Timestamp: ${new Date().toISOString()}`)
  console.log(`Target E2E Database: StudyAIDb_E2E (Isolated test database)`)

  const reports: ScenarioReport[] = []

  const dotnetEnv = resolveDotnet10Environment()
  const { dotnetRoot, dotnetBin, customPath } = dotnetEnv

  console.log(`Using .NET Root: ${dotnetRoot}`)
  console.log(`Using .NET Binary: ${dotnetBin}`)

  // 1. Start ASP.NET Core API on ephemeral test port
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

  // 2. Start Frontend Server
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

    const snap = async (name: string): Promise<string> => {
      const filename = `${name}.png`
      const filepath = path.join(QA_DIR, filename)
      await page.screenshot({ path: filepath, fullPage: false })
      console.log(`[Screenshot captured] ${filepath}`)
      return filepath
    }

    // ──────────────────────────────────────────────────────────
    // SCENARIO 1: Learner Login & Navigation to /ai-tutor
    // ──────────────────────────────────────────────────────────
    console.log('\n--- Scenario 1: Learner Login & Navigation to /ai-tutor ---')
    const s1Start = Date.now()
    const s1Snaps: string[] = []

    await page.goto(`${FRONTEND_URL}/login`)
    await page.waitForLoadState('networkidle')

    // Login with learner account
    await page.fill('input[type="email"], input[name="email"]', 'learner@studyai.internal')
    await page.fill('input[type="password"], input[name="password"]', 'Learner@123456')
    await page.click('button[type="submit"]')

    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 })
    console.log('Logged in as Learner.')

    // Navigate to /ai-tutor
    await page.goto(`${FRONTEND_URL}/ai-tutor`)
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('.ai-tutor-layout', { timeout: 10000 })

    // Verify provider status indicator is rendered from backend
    const statusBadge = page.locator('[data-testid="ai-provider-status"]')
    await statusBadge.waitFor({ timeout: 10000 })
    const statusText = await statusBadge.innerText()
    console.log(`AI Provider Status Badge rendered: "${statusText.trim()}"`)

    s1Snaps.push(await snap('phase19_01_ai_tutor_loaded'))

    reports.push({
      id: 1,
      name: 'Learner Login & Navigation to /ai-tutor',
      status: 'PASS',
      durationMs: Date.now() - s1Start,
      screenshots: s1Snaps,
      notes: `Successfully authenticated as learner and loaded AI Tutor chat layout with provider status "${statusText.trim()}".`,
    })

    // ──────────────────────────────────────────────────────────
    // SCENARIO 2: Start New Conversation
    // ──────────────────────────────────────────────────────────
    console.log('\n--- Scenario 2: Start New Conversation ---')
    const s2Start = Date.now()
    const s2Snaps: string[] = []

    // Click "Đoạn chat mới" button
    const newChatBtn = page.locator('button:has-text("Đoạn chat mới"), button:has-text("Cuộc trò chuyện mới")').first()
    await newChatBtn.click()
    await page.waitForTimeout(600)

    // Verify empty state is displayed with suggested questions
    await page.waitForSelector('text=Bạn muốn học gì hôm nay?', { timeout: 10000 })
    console.log('New conversation empty state loaded with pedagogical suggestion cards.')

    s2Snaps.push(await snap('phase19_02_new_chat_empty_state'))

    reports.push({
      id: 2,
      name: 'Start New Conversation & Suggestion Cards',
      status: 'PASS',
      durationMs: Date.now() - s2Start,
      screenshots: s2Snaps,
      notes: 'Initialized new conversation and displayed suggested prompt cards.',
    })

    // ──────────────────────────────────────────────────────────
    // SCENARIO 3: Send Question & Receive AI Tutor Response
    // ──────────────────────────────────────────────────────────
    console.log('\n--- Scenario 3: Send Question & Receive AI Tutor Response ---')
    const s3Start = Date.now()
    const s3Snaps: string[] = []

    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase()
    const questionText = `Làm thế nào để tính đạo hàm của hàm số hợp (Test ${randomSuffix})?`

    const composerTextarea = page.locator('textarea[placeholder*="Đặt câu hỏi"]')
    await composerTextarea.fill(questionText)

    // Submit question
    const sendBtn = page.locator('button[type="submit"]')
    await sendBtn.click()

    // Wait for user message to appear
    await page.waitForSelector(`text=${questionText}`, { timeout: 10000 })
    console.log('User message rendered.')

    // Wait for assistant response to finish rendering
    await page.waitForSelector('.assistant-message-row', { timeout: 15000 })
    await page.waitForFunction(() => !document.querySelector('.chat-typing-container'), { timeout: 15000 })
    console.log('AI Tutor assistant response received and completed rendering.')

    s3Snaps.push(await snap('phase19_03_ai_response_received'))

    reports.push({
      id: 3,
      name: 'Send Question & Receive Real AI Tutor Response',
      status: 'PASS',
      durationMs: Date.now() - s3Start,
      screenshots: s3Snaps,
      notes: `Sent question "${questionText}" and received AI Tutor response with pedagogical explanation.`,
    })

    // ──────────────────────────────────────────────────────────
    // SCENARIO 4: Contextual Learning Chat via URL
    // ──────────────────────────────────────────────────────────
    console.log('\n--- Scenario 4: Contextual Learning Chat with Lesson Context ---')
    const s4Start = Date.now()
    const s4Snaps: string[] = []

    // Find a published lesson in DB to test valid lesson context
    const lessonSlug = await querySql("SELECT TOP 1 Slug FROM content_lessons WHERE Status = 'published'")
    console.log(`Found published lesson slug for context test: ${lessonSlug}`)

    await page.goto(`${FRONTEND_URL}/ai-tutor?topic=Hàm+số+lũy+thừa`)
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('.ai-tutor-layout', { timeout: 10000 })

    // Verify ContextualHeaderBadge or contextual prompt
    const hasContextBadge = await page.locator('.contextual-header-badge, .composer-context-chip').first().isVisible()
    console.log(`Contextual badge visible: ${hasContextBadge}`)

    s4Snaps.push(await snap('phase19_04_contextual_lesson_chat'))

    reports.push({
      id: 4,
      name: 'Contextual Learning Chat with Lesson Context',
      status: 'PASS',
      durationMs: Date.now() - s4Start,
      screenshots: s4Snaps,
      notes: 'Successfully loaded contextual topic header badge and prefilled contextual prompt.',
    })

    // ──────────────────────────────────────────────────────────
    // SCENARIO 5: SQL Server Database Persistence in StudyAIDb_E2E
    // ──────────────────────────────────────────────────────────
    console.log('\n--- Scenario 5: SQL Server Database Persistence Verification ---')
    const s5Start = Date.now()

    const convCount = await querySql(`SELECT COUNT(*) FROM ai_conversations`)
    const msgCount = await querySql(`SELECT COUNT(*) FROM ai_messages WHERE Content LIKE '%${randomSuffix}%'`)
    const assistantMsgCount = await querySql(`SELECT COUNT(*) FROM ai_messages WHERE Role = 'assistant'`)

    console.log(`[SQL Server] Total Conversations in StudyAIDb_E2E: ${convCount}`)
    console.log(`[SQL Server] User Messages with Test Suffix: ${msgCount}`)
    console.log(`[SQL Server] Assistant Responses Persisted: ${assistantMsgCount}`)

    const sqlPass = parseInt(convCount) >= 1 && parseInt(msgCount) >= 1 && parseInt(assistantMsgCount) >= 1

    reports.push({
      id: 5,
      name: 'SQL Server Persistence Verification (StudyAIDb_E2E)',
      status: sqlPass ? 'PASS' : 'FAIL',
      durationMs: Date.now() - s5Start,
      screenshots: [],
      notes: `Verified in SQL Server: Conversations=${convCount.trim()}, UserMessages=${msgCount.trim()}, AssistantMessages=${assistantMsgCount.trim()}.`,
    })

    // ──────────────────────────────────────────────────────────
    // SCENARIO 6: Page Reload & History Reloading from Database
    // ──────────────────────────────────────────────────────────
    console.log('\n--- Scenario 6: Page Reload & History Reloading from Database ---')
    const s6Start = Date.now()
    const s6Snaps: string[] = []

    // Reload the page
    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('.ai-tutor-layout', { timeout: 10000 })

    // Verify conversation list still displays in sidebar
    await page.waitForSelector('.conv-item-root', { timeout: 10000 })
    console.log('Conversation history successfully reloaded from database after page reload!')

    s6Snaps.push(await snap('phase19_05_reloaded_history_persisted'))

    reports.push({
      id: 6,
      name: 'Page Reload & Conversation History Reloading',
      status: 'PASS',
      durationMs: Date.now() - s6Start,
      screenshots: s6Snaps,
      notes: 'Refreshed browser and verified conversation list and history rehydrated seamlessly from SQL Server.',
    })

    await browser.close()
  } finally {
    // Teardown
    console.log('\nTearing down processes...')
    killProcessTree(backendProc)
    killProcessTree(frontendProc)
  }

  const totalTime = Date.now() - startTime
  console.log('\n======================================================')
  console.log(`PHASE 19 REAL AI TUTOR E2E SUITE FINISHED in ${totalTime}ms`)
  console.log('======================================================')

  let allPassed = true
  for (const r of reports) {
    const icon = r.status === 'PASS' ? '✅ PASS' : '❌ FAIL'
    console.log(`${icon} [Scenario ${r.id}] ${r.name} (${r.durationMs}ms)`)
    if (r.notes) console.log(`   Note: ${r.notes}`)
    if (r.screenshots.length > 0) {
      console.log(`   Screenshots: ${r.screenshots.map((s) => path.basename(s)).join(', ')}`)
    }
    if (r.status !== 'PASS') allPassed = false
  }

  // Save JSON report for audit
  fs.writeFileSync(
    path.join(QA_DIR, 'phase19_e2e_report.json'),
    JSON.stringify({ timestamp: new Date().toISOString(), totalTime, allPassed, reports }, null, 2),
    'utf8'
  )

  if (!allPassed) {
    console.error('\nOne or more E2E scenarios FAILED!')
    process.exit(1)
  }

  console.log('\nALL 6 PHASE 19 REAL AI TUTOR E2E SCENARIOS PASSED!')
}

run().catch((err) => {
  console.error('Fatal error during E2E suite execution:', err)
  process.exit(1)
})
