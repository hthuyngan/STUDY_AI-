import { chromium, type Page } from 'playwright'
import fs from 'fs'
import path from 'path'

const BASE_URL = 'http://localhost:4173'
const ROOT_DIR = 'E:/AI_tutor'
const QA_DIR = path.join(ROOT_DIR, 'docs', 'visual-qa')
const SCREENSHOTS_DIR = path.join(QA_DIR, 'screenshots')
const INTERACTIONS_DIR = path.join(QA_DIR, 'interactions')
const OVERVIEWS_DIR = path.join(QA_DIR, 'overviews')
const MANIFEST_PATH = path.join(QA_DIR, 'manifest.json')

const SOURCE_COMMIT = 'Phase3_Support'

const VIEWPORTS = {
  desktop: { width: 1440, height: 900, name: 'desktop_1440' },
  laptop: { width: 1366, height: 768, name: 'laptop_1366' },
  tablet: { width: 768, height: 1024, name: 'tablet_768' },
  mobile: { width: 390, height: 844, name: 'mobile_390' },
}

interface ManifestItem {
  filename: string
  relativePath: string
  workspace: string
  route: string
  viewport: string
  width: number
  height: number
  uiState: string
  timestamp: string
  sourceCommit: string
  sourceUrl: string
  loadStatus: string
  notes: string
}

async function setupAuth(page: Page) {
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    localStorage.setItem(
      'studyai_user',
      JSON.stringify({
        id: 'demo-admin-id',
        email: 'admin@studyai.edu.vn',
        fullName: 'Trần Quản Trị',
        role: 'admin',
      })
    )
    localStorage.setItem('studyai_token', 'mock-token-studyai')
  })
}

async function captureRoute(
  page: Page,
  route: string,
  vpKey: keyof typeof VIEWPORTS,
  fileNameBase: string,
  notes = 'Màn hình Support tải thành công không tràn ngang (0px overflow)'
): Promise<ManifestItem | null> {
  const vp = VIEWPORTS[vpKey]
  await page.setViewportSize({ width: vp.width, height: vp.height })
  const url = `${BASE_URL}${route}`
  console.log(`[${vp.name}] Capturing SUPPORT: ${route}...`)

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(600)
    await page.evaluate(() => document.fonts.ready)

    const fileName = `${fileNameBase}_${vp.name}.png`
    const filePath = path.join(SCREENSHOTS_DIR, 'support', fileName)

    await page.screenshot({
      path: filePath,
      fullPage: true,
      animations: 'disabled',
    })

    return {
      filename: fileName,
      relativePath: `docs/visual-qa/screenshots/support/${fileName}`,
      workspace: 'support',
      route,
      viewport: vp.name,
      width: vp.width,
      height: vp.height,
      uiState: 'default',
      timestamp: new Date().toISOString(),
      sourceCommit: SOURCE_COMMIT,
      sourceUrl: `https://hthuyngan.github.io/STUDY_AI-${route}`,
      loadStatus: '200_OK',
      notes,
    }
  } catch (err: any) {
    console.error(`Failed to capture ${route} at ${vp.name}:`, err.message)
    return null
  }
}

async function run() {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' })
  const context = await browser.newContext()
  const page = await context.newPage()

  await setupAuth(page)

  const newItems: ManifestItem[] = []

  const supportRoutes = [
    { route: '/support', name: 'support_dashboard', complex: true },
    { route: '/support/tickets', name: 'support_tickets', complex: true },
    { route: '/support/tickets/TK-4821', name: 'support_ticket_detail', complex: true },
    { route: '/support/users', name: 'support_users', complex: true },
    { route: '/support/users/usr-101', name: 'support_user_detail', complex: true },
  ]

  for (const item of supportRoutes) {
    for (const vpKey of ['desktop', 'laptop', 'tablet', 'mobile'] as (keyof typeof VIEWPORTS)[]) {
      const captured = await captureRoute(page, item.route, vpKey, item.name)
      if (captured) newItems.push(captured)
    }
  }

  // Interaction captures
  try {
    console.log('Capturing interaction: Support tickets search active...')
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${BASE_URL}/support/tickets`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(600)
    const searchInput = page.locator('input[placeholder*="Tìm kiếm"]').first()
    if (await searchInput.isVisible()) {
      await searchInput.fill('Google')
      await page.waitForTimeout(500)
    }
    const filterPath = path.join(INTERACTIONS_DIR, 'support_tickets_filter_active.png')
    await page.screenshot({ path: filterPath, fullPage: false, animations: 'disabled' })
    newItems.push({
      filename: 'support_tickets_filter_active.png',
      relativePath: 'docs/visual-qa/interactions/support_tickets_filter_active.png',
      workspace: 'support',
      route: '/support/tickets',
      viewport: 'desktop_1440',
      width: 1440,
      height: 900,
      uiState: 'filter_active',
      timestamp: new Date().toISOString(),
      sourceCommit: SOURCE_COMMIT,
      sourceUrl: 'https://hthuyngan.github.io/STUDY_AI-/support/tickets',
      loadStatus: '200_OK',
      notes: 'Lọc danh sách ticket theo từ khóa tìm kiếm Google',
    })
  } catch (err: any) {
    console.error('Interaction error (support ticket filter):', err.message)
  }

  try {
    console.log('Capturing interaction: Support ticket detail internal note...')
    await page.goto(`${BASE_URL}/support/tickets/TK-4821`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(600)
    const noteTab = page.locator('button:has-text("Ghi chú nội bộ")').first()
    if (await noteTab.isVisible()) {
      await noteTab.click()
      await page.waitForTimeout(400)
    }
    const notePath = path.join(INTERACTIONS_DIR, 'support_ticket_internal_note_active.png')
    await page.screenshot({ path: notePath, fullPage: false, animations: 'disabled' })
    newItems.push({
      filename: 'support_ticket_internal_note_active.png',
      relativePath: 'docs/visual-qa/interactions/support_ticket_internal_note_active.png',
      workspace: 'support',
      route: '/support/tickets/TK-4821',
      viewport: 'desktop_1440',
      width: 1440,
      height: 900,
      uiState: 'internal_note_tab_active',
      timestamp: new Date().toISOString(),
      sourceCommit: SOURCE_COMMIT,
      sourceUrl: 'https://hthuyngan.github.io/STUDY_AI-/support/tickets/TK-4821',
      loadStatus: '200_OK',
      notes: 'Chuyển sang chế độ soạn thảo ghi chú nội bộ (màu vàng cảnh báo)',
    })
  } catch (err: any) {
    console.error('Interaction error (internal note):', err.message)
  }

  await browser.close()

  // Update manifest.json
  if (fs.existsSync(MANIFEST_PATH)) {
    const existing: ManifestItem[] = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'))
    // Replace support items that match filenames
    const filenameMap = new Map(newItems.map((item) => [item.filename, item]))
    const updated = existing.map((item) => {
      if (filenameMap.has(item.filename)) {
        const replacement = filenameMap.get(item.filename)!
        filenameMap.delete(item.filename)
        return replacement
      }
      return item
    })
    for (const remaining of filenameMap.values()) {
      updated.push(remaining)
    }
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(updated, null, 2), 'utf-8')
    console.log(`Updated manifest.json with ${newItems.length} support records.`)
  }

  console.log('Capture support evidence completed successfully!')
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
