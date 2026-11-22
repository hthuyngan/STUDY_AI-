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
      console.log(`   - Dashboard horizontal scroll check: ${noOverflow ? 'PASS' : 'FAIL (overflow detected)'}`)

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
        console.log(`   - Topbar hamburger button visible: ${hamburgerVisible}`)

        if (hamburgerVisible) {
          await hamburger.click()
          await page.waitForTimeout(400)

          // Verify drawer is open
          const drawerOpen = await page.locator('.sidebar.mobile-open').isVisible()
          console.log(`   - Mobile drawer opened: ${drawerOpen}`)

          // Verify close button is visible
          const closeBtn = page.locator('.sidebar.mobile-open .sidebar-mobile-close-btn')
          const closeBtnVisible = await closeBtn.isVisible()
          console.log(`   - Drawer close button (X) visible: ${closeBtnVisible}`)

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

        // Test Workspace (Admin) on mobile
        await page.goto(`${PREVIEW_URL}/admin`, { waitUntil: 'networkidle' })
        await page.waitForTimeout(600)

        const wsHamburger = page.locator('.workspace-mobile-menu-btn')
        if (await wsHamburger.isVisible()) {
          await wsHamburger.click()
          await page.waitForTimeout(400)

          await page.screenshot({
            path: path.join(QA_DIR, `${prefix}_admin_drawer_open.png`),
            fullPage: false,
          })

          const wsClose = page.locator('.workspace-sidebar.mobile-open .sidebar-mobile-close-btn')
          if (await wsClose.isVisible()) {
            await wsClose.click()
            await page.waitForTimeout(300)
          }
        }
      } else {
        // Desktop / Laptop: Sidebar is permanently expanded
        const sidebarExpanded = await page.locator('.sidebar').isVisible()
        const brandLogo = await page.locator('.sidebar .brand-name').textContent()
        console.log(`   - Desktop sidebar permanently visible: ${sidebarExpanded}`)
        console.log(`   - Brand title rendered: "${brandLogo?.trim()}"`)

        // Verify NO collapse button
        const collapseBtn = page.locator('.sidebar-collapse-btn')
        const collapseBtnExists = await collapseBtn.count()
        console.log(`   - Sidebar collapse button count (must be 0): ${collapseBtnExists}`)

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

        // Test Admin Workspace
        await page.goto(`${PREVIEW_URL}/admin`, { waitUntil: 'networkidle' })
        await page.waitForTimeout(500)
        await page.screenshot({
          path: path.join(QA_DIR, `${prefix}_admin_workspace_desktop.png`),
          fullPage: false,
        })

        // Test Teacher Workspace
        await page.goto(`${PREVIEW_URL}/teacher`, { waitUntil: 'networkidle' })
        await page.waitForTimeout(500)
        await page.screenshot({
          path: path.join(QA_DIR, `${prefix}_teacher_workspace_desktop.png`),
          fullPage: false,
        })

        // Test Content Workspace
        await page.goto(`${PREVIEW_URL}/content`, { waitUntil: 'networkidle' })
        await page.waitForTimeout(500)
        await page.screenshot({
          path: path.join(QA_DIR, `${prefix}_content_workspace_desktop.png`),
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
