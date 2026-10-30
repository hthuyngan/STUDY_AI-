import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

const BASE_URL = 'http://localhost:4173'
const OUT_DIR = 'E:/AI_tutor/scripts/audit_output'
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

const VIEWPORTS = [
  { name: 'desktop_1440', width: 1440, height: 900 },
  { name: 'laptop_1366', width: 1366, height: 768 },
  { name: 'tablet_768', width: 768, height: 1024 },
  { name: 'mobile_390', width: 390, height: 844 },
]

const ROUTES = [
  '/dashboard',
  '/subjects',
  '/subjects/math',
  '/ai-tutor',
]

async function run() {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' })
  const results: any[] = []

  for (const vp of VIEWPORTS) {
    console.log(`\n=== Auditing Viewport: ${vp.name} (${vp.width}x${vp.height}) ===`)
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } })
    const page = await context.newPage()

    // Auth
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' })
    await page.evaluate(() => {
      localStorage.setItem('studyai_user', JSON.stringify({
        id: 'learner-demo',
        email: 'learner@studyai.edu.vn',
        displayName: 'Nguyễn Văn Học',
        fullName: 'Nguyễn Văn Học',
        role: 'student'
      }))
      localStorage.setItem('studyai_token', 'mock-token-studyai')
    })

    for (const r of ROUTES) {
      await page.goto(`${BASE_URL}${r}`, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(500)

      const overflow = await page.evaluate(() => {
        const docElem = document.documentElement
        const body = document.body
        const scrollWidth = Math.max(docElem.scrollWidth, body.scrollWidth)
        const clientWidth = docElem.clientWidth
        return scrollWidth > clientWidth ? scrollWidth - clientWidth : 0
      })

      const screenshotName = `${r.replace(/\//g, '_')}_${vp.name}.png`
      await page.screenshot({ path: path.join(OUT_DIR, screenshotName), fullPage: true })

      console.log(`[${vp.name}] ${r.padEnd(20)}: ${overflow === 0 ? 'PASS (0px overflow)' : `FAIL (${overflow}px overflow)`}`)
      results.push({ viewport: vp.name, route: r, overflow, screenshot: screenshotName })
    }
    await context.close()
  }

  // Interactive audit on AI Tutor
  console.log('\n=== Auditing AI Tutor Interaction Flow ===')
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(`${BASE_URL}/ai-tutor`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)

  // 1. Check prompt suggestion click
  const promptChip = page.locator('.ai-empty-prompt-card').first()
  if (await promptChip.isVisible()) {
    const text = await promptChip.textContent()
    console.log(`Clicking prompt chip: ${text?.slice(0, 30)}...`)
    await promptChip.click()
    await page.waitForTimeout(1200) // stream starting
    const isStreaming = await page.locator('.ai-streaming-cursor, .typing-dot').count() > 0
    console.log(`AI streaming started: ${isStreaming}`)
    await page.waitForTimeout(2500) // stream finishing
    const msgCount = await page.locator('.user-message-bubble, .assistant-content-flow').count()
    console.log(`Total message bubbles rendered: ${msgCount}`)
  }

  await ctx.close()
  await browser.close()
  fs.writeFileSync(path.join(OUT_DIR, 'audit_results.json'), JSON.stringify(results, null, 2))
  console.log('\nAudit completed successfully!')
}

run().catch(console.error)

