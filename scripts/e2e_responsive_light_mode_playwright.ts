import { chromium } from 'playwright'
import { spawn, ChildProcess } from 'child_process'
import fs from 'fs'
import path from 'path'

const PREVIEW_PORT = 4195
const PREVIEW_URL = `http://127.0.0.1:${PREVIEW_PORT}`
const QA_DIR = path.join('docs', 'visual-qa', 'responsive-polish')

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

async function waitForHttp(url: string, timeoutMs = 25000): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok || res.status === 200 || res.status === 304 || res.status === 404) return true
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  return false
}

async function checkHorizontalScroll(page: any): Promise<boolean> {
  return await page.evaluate(() => {
    return document.documentElement.scrollWidth <= window.innerWidth + 1
  })
}

async function run() {
  console.log('🚀 Starting Responsive & Light Mode Visual QA Playwright Suite...')

  let previewProc: ChildProcess | undefined

  try {
    console.log(`Starting Vite preview server on port ${PREVIEW_PORT}...`)
    previewProc = spawn(
      'bun',
      ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(PREVIEW_PORT), '--strictPort'],
      {
        cwd: path.resolve('frontend'),
        stdio: 'pipe',
      }
    )

    const ready = await waitForHttp(PREVIEW_URL, 20000)
    if (!ready) {
      throw new Error(`Preview server failed to start at ${PREVIEW_URL}`)
    }
    console.log('✅ Vite preview server ready!')

    const browser = await chromium.launch({ headless: true })

    // Viewports to test
    const viewports = [
      { name: '375px (Mobile)', width: 375, height: 667, isMobile: true },
      { name: '390px (Mobile Standard iPhone)', width: 390, height: 844, isMobile: true },
      { name: '768px (Tablet)', width: 768, height: 1024, isMobile: true },
      { name: '1024px (Laptop/Tablet Landscape)', width: 1024, height: 768, isMobile: false },
      { name: '1366px (Standard Laptop)', width: 1366, height: 768, isMobile: false },
      { name: '1920px (Full HD Desktop)', width: 1920, height: 1080, isMobile: false },
    ]

    for (const vp of viewports) {
      console.log(`\n📱 Testing Viewport: ${vp.name} (${vp.width}x${vp.height})...`)

      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 1,
      })
      const page = await context.newPage()

      // 1. Dashboard Page
      await page.goto(`${PREVIEW_URL}/dashboard`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(600)

      // Light Mode Check
      const dataTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
      if (dataTheme !== 'light') {
        throw new Error(`Expected data-theme="light", but got "${dataTheme}" at ${vp.name}`)
      }

      // Check no horizontal scroll
      const noOverflow = await checkHorizontalScroll(page)
      if (!noOverflow) {
        throw new Error(`Horizontal scroll overflow detected at viewport ${vp.name} (${vp.width}px) on /dashboard`)
      }
      console.log(`   - Dashboard horizontal scroll check: PASS`)

      const prefix = vp.width.toString().padStart(4, '0')

      if (vp.isMobile) {
        // Closed state
        await page.screenshot({
          path: path.join(QA_DIR, `${prefix}_dashboard_closed.png`),
          fullPage: false,
        })

        // Verify hamburger is visible
        const hamburger = page.locator('.topbar-mobile-btn')
        const hamburgerVisible = await hamburger.isVisible()
        if (!hamburgerVisible) {
          throw new Error(`Expected mobile hamburger button (.topbar-mobile-btn) to be visible at viewport ${vp.name} (${vp.width}px)`)
        }
        console.log(`   - Topbar hamburger button visible: true`)

        if (hamburgerVisible) {
          await hamburger.click()
          await page.waitForTimeout(400)

          // Verify drawer is open
          const drawerOpen = await page.locator('.sidebar.mobile-open').isVisible()
          if (!drawerOpen) {
            throw new Error(`Expected mobile drawer (.sidebar.mobile-open) to open after hamburger click at ${vp.name}`)
          }
          console.log(`   - Mobile drawer opened: true`)

          // Verify close button is visible
          const closeBtn = page.locator('.sidebar.mobile-open .sidebar-mobile-close-btn')
          const closeBtnVisible = await closeBtn.isVisible()
          if (!closeBtnVisible) {
            throw new Error(`Expected drawer close button (.sidebar-mobile-close-btn) to be visible at ${vp.name}`)
          }
          console.log(`   - Drawer close button (X) visible: true`)

          // Capture drawer open
          await page.screenshot({
            path: path.join(QA_DIR, `${prefix}_dashboard_drawer_open.png`),
            fullPage: false,
          })

          // Click close button
          if (closeBtnVisible) {
            await closeBtn.click()
            await page.waitForTimeout(300)
          }
        }

        // Assert unauthenticated staff routes redirect to /login on mobile (Workstream 7 requirement)
        await page.goto(`${PREVIEW_URL}/admin`, { waitUntil: 'networkidle' })
        await page.waitForTimeout(400)
        const mobileAdminUrl = page.url()
        if (!mobileAdminUrl.includes('/login')) {
          throw new Error(`Expected unauthenticated /admin to redirect to /login on mobile (${vp.name}), but stayed on ${mobileAdminUrl}`)
        }
        console.log(`   - Unauthenticated /admin redirected to /login on mobile (${vp.name}): PASS`)

        await page.goto(`${PREVIEW_URL}/teacher`, { waitUntil: 'networkidle' })
        await page.waitForTimeout(400)
        const mobileTeacherUrl = page.url()
        if (!mobileTeacherUrl.includes('/login')) {
          throw new Error(`Expected unauthenticated /teacher to redirect to /login on mobile (${vp.name}), but stayed on ${mobileTeacherUrl}`)
        }
        console.log(`   - Unauthenticated /teacher redirected to /login on mobile (${vp.name}): PASS`)

        await page.goto(`${PREVIEW_URL}/content`, { waitUntil: 'networkidle' })
        await page.waitForTimeout(400)
        const mobileContentUrl = page.url()
        if (!mobileContentUrl.includes('/login')) {
          throw new Error(`Expected unauthenticated /content to redirect to /login on mobile (${vp.name}), but stayed on ${mobileContentUrl}`)
        }
        console.log(`   - Unauthenticated /content redirected to /login on mobile (${vp.name}): PASS`)
      } else {
        // Desktop / Laptop: Sidebar is permanently expanded
        const sidebarExpanded = await page.locator('.sidebar').isVisible()
        const brandLogo = await page.locator('.sidebar .brand-name').textContent()
        console.log(`   - Desktop sidebar permanently visible: ${sidebarExpanded}`)
        console.log(`   - Brand title rendered: "${brandLogo?.trim()}"`)

        // Verify NO collapse button
        const collapseBtn = page.locator('.sidebar-collapse-btn')
        const collapseBtnExists = await collapseBtn.count()
        if (collapseBtnExists !== 0) {
          throw new Error(`Found ${collapseBtnExists} .sidebar-collapse-btn elements; collapse buttons must be completely removed`)
        }
        console.log(`   - Sidebar collapse button count (must be 0): 0 (PASS)`)

        await page.screenshot({
          path: path.join(QA_DIR, `${prefix}_dashboard_desktop.png`),
          fullPage: false,
        })

        // Test Settings Page
        await page.goto(`${PREVIEW_URL}/settings`, { waitUntil: 'networkidle' })
        await page.waitForTimeout(500)
        await page.screenshot({
          path: path.join(QA_DIR, `${prefix}_settings_desktop.png`),
          fullPage: false,
        })

        // Test Admin Workspace Redirect to /login
        await page.goto(`${PREVIEW_URL}/admin`, { waitUntil: 'networkidle' })
        await page.waitForTimeout(500)
        const adminUrl = page.url()
        if (!adminUrl.includes('/login')) {
          throw new Error(`Expected unauthenticated /admin to redirect to /login in production preview, but stayed on ${adminUrl}`)
        }
        console.log(`   - Unauthenticated /admin correctly redirected to /login: PASS`)
        await page.screenshot({
          path: path.join(QA_DIR, `${prefix}_admin_redirect_login.png`),
          fullPage: false,
        })

        // Test Teacher Workspace Redirect to /login
        await page.goto(`${PREVIEW_URL}/teacher`, { waitUntil: 'networkidle' })
        await page.waitForTimeout(500)
        const teacherUrl = page.url()
        if (!teacherUrl.includes('/login')) {
          throw new Error(`Expected unauthenticated /teacher to redirect to /login in production preview, but stayed on ${teacherUrl}`)
        }
        console.log(`   - Unauthenticated /teacher correctly redirected to /login: PASS`)
        await page.screenshot({
          path: path.join(QA_DIR, `${prefix}_teacher_redirect_login.png`),
          fullPage: false,
        })

        // Test Content Workspace Redirect to /login
        await page.goto(`${PREVIEW_URL}/content`, { waitUntil: 'networkidle' })
        await page.waitForTimeout(500)
        const contentUrl = page.url()
        if (!contentUrl.includes('/login')) {
          throw new Error(`Expected unauthenticated /content to redirect to /login in production preview, but stayed on ${contentUrl}`)
        }
        console.log(`   - Unauthenticated /content correctly redirected to /login: PASS`)
        await page.screenshot({
          path: path.join(QA_DIR, `${prefix}_content_redirect_login.png`),
          fullPage: false,
        })
      }

      await context.close()
    }

    await browser.close()
    console.log('\n🎉 ALL VIEWPORTS (375px, 768px, 1024px, 1366px, 1920px) VERIFIED SUCCESSFULLY!')
  } finally {
    if (previewProc) {
      console.log('Stopping preview server...')
      killProcessTree(previewProc)
    }
  }
}

run().catch((err) => {
  console.error('❌ Error during Responsive QA:', err)
  process.exit(1)
})
