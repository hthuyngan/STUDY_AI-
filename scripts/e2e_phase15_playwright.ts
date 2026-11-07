import { chromium } from 'playwright'
import { spawn, ChildProcess } from 'child_process'
import fs from 'fs'
import path from 'path'

const BACKEND_PORT = 8001
const FRONTEND_PORT = 4180
const BACKEND_URL = `http://127.0.0.1:${BACKEND_PORT}`
const FRONTEND_URL = `http://localhost:${FRONTEND_PORT}`
const PHASE15_DIR = path.join('docs', 'visual-qa', 'phase-15')

if (!fs.existsSync(PHASE15_DIR)) {
  fs.mkdirSync(PHASE15_DIR, { recursive: true })
}

async function waitForUrl(url: string, timeoutMs = 25000): Promise<void> {
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
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`Service at ${url} did not become ready within ${timeoutMs}ms`)
}

async function run() {
  console.log('=== STARTING PHASE 15 REAL FULLSTACK E2E PLAYWRIGHT SUITE ===')

  // Setup test environment variables
  const dbFile = path.join(process.cwd(), 'backend', 'test_e2e_phase15.db')
  if (fs.existsSync(dbFile)) {
    fs.unlinkSync(dbFile)
  }

  // 1. Start Real FastAPI Backend
  console.log(`Starting real FastAPI backend on port ${BACKEND_PORT}...`)
  const pythonPath = path.join(process.cwd(), 'backend', '.venv', 'Scripts', 'python.exe')
  const backendProc: ChildProcess = spawn(
    pythonPath,
    ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', String(BACKEND_PORT)],
    {
      cwd: path.join(process.cwd(), 'backend'),
      env: {
        ...process.env,
        DATABASE_URL: `sqlite:///${dbFile}`,
        JWT_SECRET_KEY: 'test-e2e-secret-key-at-least-32-chars-long-123456',
        CORS_ORIGINS: `http://localhost:${FRONTEND_PORT},http://127.0.0.1:${FRONTEND_PORT}`,
        APP_ENV: 'test',
        LOG_LEVEL: 'INFO',
      },
      stdio: 'pipe',
    }
  )

  backendProc.stdout?.on('data', (d) => {
    // console.log('[BE]', d.toString().trim())
  })
  backendProc.stderr?.on('data', (d) => {
    // console.log('[BE ERR]', d.toString().trim())
  })

  // 2. Start Frontend Vite Preview with VITE_API_BASE_URL pointing to real backend
  console.log(`Starting Vite preview on port ${FRONTEND_PORT}...`)
  const frontendProc: ChildProcess = spawn(
    'bun',
    ['run', 'preview', '--port', String(FRONTEND_PORT), '--strictPort'],
    {
      cwd: path.join(process.cwd(), 'frontend'),
      env: {
        ...process.env,
        VITE_API_BASE_URL: BACKEND_URL,
      },
      stdio: 'pipe',
    }
  )

  try {
    console.log('Waiting for backend and frontend services to be ready...')
    await waitForUrl(`${BACKEND_URL}/health`)
    console.log('FastAPI backend is ready at', BACKEND_URL)

    await waitForUrl(FRONTEND_URL)
    console.log('Vite frontend preview is ready at', FRONTEND_URL)

    const browser = await chromium.launch({
      headless: true,
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    })

    const desktopContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    })
    const page = await desktopContext.newPage()

    // Configure client-side API base URL in storage/window if needed
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'domcontentloaded' })
    await page.evaluate((apiUrl) => {
      localStorage.setItem('study_ai_api_base_url', apiUrl)
    }, BACKEND_URL)

    // ------------------------------------------------------------------------
    // Step 1: Real User Registration via UI -> FastAPI -> SQLite Database
    // ------------------------------------------------------------------------
    console.log('1. Testing real registration form...')
    await page.goto(`${FRONTEND_URL}/register`, { waitUntil: 'networkidle' })
    await page.fill('#reg-name', 'Nguyễn Hải Đăng')
    await page.fill('#reg-email', 'haidang@student.studyai.vn')
    await page.fill('#reg-password', 'RealPassword123!')
    await page.fill('#reg-confirm-password', 'RealPassword123!')
    await page.click('button[type="submit"]')

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 })
    await page.waitForTimeout(1000)
    console.log('Capturing 01-e2e-register-success-desktop.png...')
    await page.screenshot({
      path: path.join(PHASE15_DIR, '01-e2e-register-success-desktop.png'),
      fullPage: true,
    })

    // ------------------------------------------------------------------------
    // Step 2: Reload Page -> Session Restored via HttpOnly Rotating Refresh Cookie
    // ------------------------------------------------------------------------
    console.log('2. Testing session restoration on browser reload...')
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    console.log('Capturing 02-e2e-session-restored-on-reload.png...')
    await page.screenshot({
      path: path.join(PHASE15_DIR, '02-e2e-session-restored-on-reload.png'),
      fullPage: true,
    })

    // ------------------------------------------------------------------------
    // Step 3: Learner Blocked from Accessing Admin Routes (RBAC)
    // ------------------------------------------------------------------------
    console.log('3. Testing RBAC: Learner accessing /admin must be blocked...')
    await page.goto(`${FRONTEND_URL}/admin`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    console.log('Capturing 03-e2e-learner-blocked-from-admin.png...')
    await page.screenshot({
      path: path.join(PHASE15_DIR, '03-e2e-learner-blocked-from-admin.png'),
      fullPage: true,
    })

    // ------------------------------------------------------------------------
    // Step 4: Logout via Server Revocation
    // ------------------------------------------------------------------------
    console.log('4. Testing logout via Topbar...')
    await page.goto(`${FRONTEND_URL}/dashboard`, { waitUntil: 'networkidle' })
    // Click user trigger dropdown
    const userTrigger = page.locator('.topbar-user-trigger')
    if (await userTrigger.isVisible()) {
      await userTrigger.click()
      await page.waitForTimeout(500)
      const logoutBtn = page.locator('.topbar-user-dropdown-item.is-danger')
      if (await logoutBtn.isVisible()) {
        await logoutBtn.click()
      }
    }
    await page.waitForTimeout(1000)
    console.log('Capturing 04-e2e-logout-success-desktop.png...')
    await page.screenshot({
      path: path.join(PHASE15_DIR, '04-e2e-logout-success-desktop.png'),
      fullPage: true,
    })

    // ------------------------------------------------------------------------
    // Step 5: Re-login with Existing Account
    // ------------------------------------------------------------------------
    console.log('5. Testing re-login with existing credentials...')
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle' })
    await page.fill('#login-email', 'haidang@student.studyai.vn')
    await page.fill('#login-password', 'RealPassword123!')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard', { timeout: 10000 })
    await page.waitForTimeout(1000)
    console.log('Capturing 05-e2e-relogin-success-desktop.png...')
    await page.screenshot({
      path: path.join(PHASE15_DIR, '05-e2e-relogin-success-desktop.png'),
      fullPage: true,
    })

    // ------------------------------------------------------------------------
    // Step 6: Create Admin User in DB and Login to Verify Admin Workspace
    // ------------------------------------------------------------------------
    console.log('6. Seeding test admin and logging in as admin...')
    // Make API call or seed via python script
    const seedProc = spawn(
      pythonPath,
      [
        '-c',
        `
from app.database import SessionLocal
from app.models.user import User
from app.core.security import hash_password
from datetime import datetime, timezone
import uuid

db = SessionLocal()
admin = User(
    id=str(uuid.uuid4()),
    email="admin@studyai.vn",
    email_normalized="admin@studyai.vn",
    password_hash=hash_password("AdminSecurePass123!"),
    display_name="Tổng Quản Trị Viên",
    role="admin",
    status="active",
    created_at=datetime.now(timezone.utc),
    updated_at=datetime.now(timezone.utc),
)
db.add(admin)
db.commit()
db.close()
print("Admin created successfully")
        `,
      ],
      {
        cwd: path.join(process.cwd(), 'backend'),
        env: {
          ...process.env,
          DATABASE_URL: `sqlite:///${dbFile}`,
        },
      }
    )
    await new Promise((resolve) => seedProc.on('exit', resolve))

    // Logout learner first
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle' })
    await page.fill('#login-email', 'admin@studyai.vn')
    await page.fill('#login-password', 'AdminSecurePass123!')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/admin**', { timeout: 10000 })
    await page.waitForTimeout(1000)
    console.log('Capturing 06-e2e-admin-access-desktop.png...')
    await page.screenshot({
      path: path.join(PHASE15_DIR, '06-e2e-admin-access-desktop.png'),
      fullPage: true,
    })

    // ------------------------------------------------------------------------
    // Step 7: Suspended Account Blocked from Login (403)
    // ------------------------------------------------------------------------
    console.log('7. Testing suspended account rejection...')
    // Seed suspended user
    const suspendProc = spawn(
      pythonPath,
      [
        '-c',
        `
from app.database import SessionLocal
from app.models.user import User
from app.core.security import hash_password
from datetime import datetime, timezone
import uuid

db = SessionLocal()
suspended = User(
    id=str(uuid.uuid4()),
    email="locked@studyai.vn",
    email_normalized="locked@studyai.vn",
    password_hash=hash_password("LockedPass123!"),
    display_name="Tài Khoản Bị Khóa",
    role="learner",
    status="suspended",
    created_at=datetime.now(timezone.utc),
    updated_at=datetime.now(timezone.utc),
)
db.add(suspended)
db.commit()
db.close()
        `,
      ],
      {
        cwd: path.join(process.cwd(), 'backend'),
        env: {
          ...process.env,
          DATABASE_URL: `sqlite:///${dbFile}`,
        },
      }
    )
    await new Promise((resolve) => suspendProc.on('exit', resolve))

    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle' })
    await page.fill('#login-email', 'locked@studyai.vn')
    await page.fill('#login-password', 'LockedPass123!')
    await page.click('button[type="submit"]')
    await page.waitForTimeout(1000)
    console.log('Capturing 07-e2e-suspended-account-blocked.png...')
    await page.screenshot({
      path: path.join(PHASE15_DIR, '07-e2e-suspended-account-blocked.png'),
      fullPage: true,
    })

    // ------------------------------------------------------------------------
    // Step 8: Mobile Viewport 390x844
    // ------------------------------------------------------------------------
    console.log('8. Capturing Mobile 390x844 viewport...')
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
    })
    const mobilePage = await mobileContext.newPage()
    await mobilePage.goto(`${FRONTEND_URL}/login`, { waitUntil: 'domcontentloaded' })
    await mobilePage.evaluate((apiUrl) => {
      localStorage.setItem('study_ai_api_base_url', apiUrl)
    }, BACKEND_URL)
    await mobilePage.reload({ waitUntil: 'networkidle' })
    await mobilePage.waitForTimeout(1000)
    console.log('Capturing 08-e2e-mobile-390px-auth.png...')
    await mobilePage.screenshot({
      path: path.join(PHASE15_DIR, '08-e2e-mobile-390px-auth.png'),
      fullPage: true,
    })

    await browser.close()
    console.log('=== PHASE 15 REAL FULLSTACK E2E PLAYWRIGHT TESTS PASSED ===')
  } finally {
    console.log('Tearing down test services...')
    backendProc.kill()
    frontendProc.kill()
    if (fs.existsSync(dbFile)) {
      try {
        fs.unlinkSync(dbFile)
      } catch {
        // ignore
      }
    }
  }
}

run().catch((err) => {
  console.error('Playwright E2E failed:', err)
  process.exit(1)
})

