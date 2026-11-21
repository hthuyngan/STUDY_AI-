import { chromium } from 'playwright'
import { spawn, ChildProcess } from 'child_process'
import fs from 'fs'
import path from 'path'

const FRONTEND_PORT = 4192
const FRONTEND_URL = `http://127.0.0.1:${FRONTEND_PORT}`
const QA_DIR = path.join('docs', 'visual-qa', 'moodle-workspace')

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

async function waitForHttp(url: string, timeoutMs = 30000): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok || res.status === 200 || res.status === 304) return true
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 600))
  }
  return false
}

async function run() {
  console.log('🚀 Starting Moodle-Style Workspace Visual QA Playwright Suite...')

  let frontendProc: ChildProcess | undefined

  try {
    console.log(`Starting Vite preview on port ${FRONTEND_PORT}...`)
    frontendProc = spawn(
      'bun',
      ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(FRONTEND_PORT), '--strictPort'],
      {
        cwd: path.resolve('frontend'),
        stdio: 'pipe',
      }
    )

    const feReady = await waitForHttp(FRONTEND_URL, 20000)
    if (!feReady) {
      throw new Error(`Frontend failed to start at ${FRONTEND_URL}`)
    }
    console.log('✅ Frontend preview server is ready!')

    const browser = await chromium.launch({ headless: true })
    const context = await browser.newContext({
      viewport: { width: 1400, height: 900 },
      deviceScaleFactor: 1,
    })
    const page = await context.newPage()

    // 1. Desktop Dashboard & Streamlined Sidebar
    console.log('📸 1. Capturing Streamlined Sidebar (Desktop)...')
    await page.goto(`${FRONTEND_URL}/dashboard`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    await page.screenshot({
      path: path.join(QA_DIR, '01_moodle_sidebar_desktop.png'),
      fullPage: false,
    })

    // 2. Open 9-Dot Workspace App Launcher
    console.log('📸 2. Capturing 9-Dot Moodle Workspace Launcher Popover...')
    const launcherBtn = page.locator('button[aria-label*="Không gian làm việc"]')
    await launcherBtn.waitFor({ state: 'visible', timeout: 5000 })
    await launcherBtn.click()
    await page.waitForTimeout(500)
    await page.screenshot({
      path: path.join(QA_DIR, '02_moodle_workspace_launcher_opened.png'),
      fullPage: false,
    })

    // 3. Exam Preparation Page
    console.log('📸 3. Capturing Exam Preparation Page (/exam-preparation)...')
    await page.goto(`${FRONTEND_URL}/exam-preparation`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    await page.screenshot({
      path: path.join(QA_DIR, '03_exam_preparation_page.png'),
      fullPage: false,
    })

    // 4. Schedule Page
    console.log('📸 4. Capturing Schedule Page (/schedule)...')
    await page.goto(`${FRONTEND_URL}/schedule`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    await page.screenshot({
      path: path.join(QA_DIR, '04_schedule_page.png'),
      fullPage: false,
    })

    // 5. Mobile Viewport & Sidebar Drawer
    console.log('📸 5. Capturing Mobile Viewport with App Launcher...')
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 }, // iPhone 12/13/14
      isMobile: true,
      hasTouch: true,
    })
    const mobilePage = await mobileContext.newPage()
    await mobilePage.goto(`${FRONTEND_URL}/dashboard`, { waitUntil: 'networkidle' })
    await mobilePage.waitForTimeout(1000)

    const mobileLauncherBtn = mobilePage.locator('button[aria-label*="Không gian làm việc"]')
    await mobileLauncherBtn.click()
    await mobilePage.waitForTimeout(500)

    await mobilePage.screenshot({
      path: path.join(QA_DIR, '05_mobile_workspace_launcher.png'),
      fullPage: false,
    })

    await browser.close()
    console.log('🎉 All 5 visual QA screenshots successfully captured in:', QA_DIR)
  } finally {
    killProcessTree(frontendProc)
  }
}

run().catch((err) => {
  console.error('❌ E2E Playwright Error:', err)
  process.exit(1)
})
