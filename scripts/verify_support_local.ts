import { chromium } from 'playwright'

const BASE_URL = 'http://localhost:4173'

const VIEWPORTS = [
  { name: 'desktop_1440', width: 1440, height: 900 },
  { name: 'laptop_1366', width: 1366, height: 768 },
  { name: 'tablet_768', width: 768, height: 1024 },
  { name: 'mobile_390', width: 390, height: 844 },
]

const ROUTES = [
  '/support',
  '/support/tickets',
  '/support/tickets/TK-4821',
  '/support/users',
  '/support/users/usr-101',
]

async function verify() {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' })
  let allPass = true

  for (const vp of VIEWPORTS) {
    console.log(`\n--- Checking Viewport: ${vp.name} (${vp.width}x${vp.height}) ---`)
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } })
    const page = await context.newPage()

    // Auth setup
    await page.goto(`${BASE_URL}/support`, { waitUntil: 'domcontentloaded' })
    await page.evaluate(() => {
      localStorage.setItem('studyai_user', JSON.stringify({
        id: 'demo-admin-id',
        email: 'admin@studyai.edu.vn',
        fullName: 'Trần Quản Trị',
        role: 'admin'
      }))
      localStorage.setItem('studyai_token', 'mock-token-studyai')
    })

    for (const r of ROUTES) {
      await page.goto(`${BASE_URL}${r}`, { waitUntil: 'networkidle', timeout: 8000 })
      await page.waitForTimeout(400)

      const overflow = await page.evaluate(() => {
        const docElem = document.documentElement
        const body = document.body
        const scrollWidth = Math.max(docElem.scrollWidth, body.scrollWidth)
        const clientWidth = docElem.clientWidth
        return scrollWidth > clientWidth ? scrollWidth - clientWidth : 0
      })

      const hasSummary = await page.locator('.admin-summary-strip, .teacher-summary-strip').count()
      const hasCards = await page.locator('.staff-mobile-card-list, .has-mobile-cards').count()

      const status = overflow === 0 ? 'PASS (0px overflow)' : `FAIL (+${overflow}px)`
      if (overflow > 0) allPass = false
      console.log(`[${vp.name}] ${r.padEnd(28)}: ${status} | Strip: ${hasSummary > 0} | Cards: ${hasCards > 0}`)
    }

    await context.close()
  }

  await browser.close()
  if (allPass) {
    console.log('\n>>> ALL SUPPORT VIEWPORTS AND ROUTES PASSED WITH 0px OVERFLOW! <<<')
  } else {
    console.error('\n>>> SOME VIEWPORTS HAD OVERFLOW! <<<')
    process.exit(1)
  }
}

verify().catch((err) => {
  console.error(err)
  process.exit(1)
})

