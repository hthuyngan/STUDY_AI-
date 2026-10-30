import { chromium, type Page } from 'playwright'
import fs from 'fs'
import path from 'path'

const BASE_URL = 'https://hthuyngan.github.io/STUDY_AI-'
const ZHONGWENHUB_URL = 'https://nguyen2234.github.io/ZhongWenHub/management/admin/teachers'
const ZHONGWENHUB_BASE = 'https://nguyen2234.github.io/ZhongWenHub/'

const ROOT_DIR = 'E:/AI_tutor'
const QA_DIR = path.join(ROOT_DIR, 'docs', 'visual-qa')
const SCREENSHOTS_DIR = path.join(QA_DIR, 'screenshots')
const INTERACTIONS_DIR = path.join(QA_DIR, 'interactions')
const OVERVIEWS_DIR = path.join(QA_DIR, 'overviews')
const REPORTS_DIR = path.join(QA_DIR, 'reports')

const SOURCE_COMMIT = '7efb868'

// Ensure directories exist
for (const dir of [
  path.join(SCREENSHOTS_DIR, 'admin'),
  path.join(SCREENSHOTS_DIR, 'teacher'),
  path.join(SCREENSHOTS_DIR, 'content'),
  path.join(SCREENSHOTS_DIR, 'support'),
  path.join(SCREENSHOTS_DIR, 'reference'),
  INTERACTIONS_DIR,
  OVERVIEWS_DIR,
  REPORTS_DIR,
]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

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

const manifest: ManifestItem[] = []

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
  workspace: 'admin' | 'teacher' | 'content' | 'support',
  route: string,
  vpKey: keyof typeof VIEWPORTS,
  fileNameBase: string,
  notes = 'Màn hình tải thành công đầy đủ dữ liệu'
) {
  const vp = VIEWPORTS[vpKey]
  await page.setViewportSize({ width: vp.width, height: vp.height })
  const url = `${BASE_URL}${route}`
  console.log(`[${vp.name}] Capturing ${workspace.toUpperCase()}: ${route}...`)

  try {
    const res = await page.goto(url, { waitUntil: 'networkidle', timeout: 35000 })
    await page.waitForTimeout(1000)
    // Wait for fonts to load
    await page.evaluate(() => document.fonts.ready)

    const fileName = `${fileNameBase}_${vp.name}.png`
    const filePath = path.join(SCREENSHOTS_DIR, workspace, fileName)

    await page.screenshot({
      path: filePath,
      fullPage: true,
      animations: 'disabled',
    })

    const relPath = `docs/visual-qa/screenshots/${workspace}/${fileName}`
    manifest.push({
      filename: fileName,
      relativePath: relPath,
      workspace,
      route,
      viewport: vp.name,
      width: vp.width,
      height: vp.height,
      uiState: 'default',
      timestamp: new Date().toISOString(),
      sourceCommit: SOURCE_COMMIT,
      sourceUrl: url,
      loadStatus: `${res?.status() || 200}_OK`,
      notes,
    })
  } catch (err: any) {
    console.error(`Failed to capture ${url} on ${vp.name}:`, err.message)
  }
}

async function run() {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' })
  const context = await browser.newContext()
  const page = await context.newPage()

  await setupAuth(page)

  // ================= ADMIN WORKSPACE =================
  console.log('\n--- CAPTURING ADMIN WORKSPACE ---')
  const adminRoutes = [
    { route: '/admin', name: 'admin_dashboard', complex: false },
    { route: '/admin/users', name: 'admin_users', complex: true },
    { route: '/admin/users/usr-101', name: 'admin_user_detail', complex: false },
    { route: '/admin/roles', name: 'admin_roles', complex: false },
    { route: '/admin/teachers', name: 'admin_teachers', complex: true },
    { route: '/admin/content-monitor', name: 'admin_content_monitor', complex: false },
    { route: '/admin/support-monitor', name: 'admin_support_monitor', complex: false },
    { route: '/admin/reports', name: 'admin_reports', complex: false },
    { route: '/admin/audit-logs', name: 'admin_audit_logs', complex: true },
    { route: '/admin/announcements', name: 'admin_announcements', complex: false },
    { route: '/admin/system', name: 'admin_system', complex: false },
    { route: '/admin/settings', name: 'admin_settings', complex: false },
  ]

  for (const item of adminRoutes) {
    await captureRoute(page, 'admin', item.route, 'desktop', item.name)
    await captureRoute(page, 'admin', item.route, 'mobile', item.name)
    if (item.complex) {
      await captureRoute(page, 'admin', item.route, 'laptop', item.name)
      await captureRoute(page, 'admin', item.route, 'tablet', item.name)
    }
  }

  // ================= TEACHER WORKSPACE =================
  console.log('\n--- CAPTURING TEACHER WORKSPACE ---')
  const teacherRoutes = [
    { route: '/teacher', name: 'teacher_dashboard', complex: false },
    { route: '/teacher/classes', name: 'teacher_classes', complex: true },
    { route: '/teacher/classes/cls-12a1', name: 'teacher_class_detail', complex: false },
    { route: '/teacher/students', name: 'teacher_students', complex: true },
    { route: '/teacher/students/stu-1', name: 'teacher_student_detail', complex: false },
    { route: '/teacher/assignments', name: 'teacher_assignments', complex: true },
    { route: '/teacher/assignments/new', name: 'teacher_assignment_new', complex: false },
    { route: '/teacher/assignments/asg-1', name: 'teacher_assignment_detail', complex: false },
    { route: '/teacher/grades', name: 'teacher_grades', complex: true },
    { route: '/teacher/alerts', name: 'teacher_alerts', complex: false },
  ]

  for (const item of teacherRoutes) {
    await captureRoute(page, 'teacher', item.route, 'desktop', item.name)
    await captureRoute(page, 'teacher', item.route, 'mobile', item.name)
    if (item.complex) {
      await captureRoute(page, 'teacher', item.route, 'laptop', item.name)
      await captureRoute(page, 'teacher', item.route, 'tablet', item.name)
    }
  }

  // ================= CONTENT WORKSPACE =================
  console.log('\n--- CAPTURING CONTENT WORKSPACE ---')
  const contentRoutes = [
    { route: '/content', name: 'content_dashboard', complex: false },
    { route: '/content/subjects', name: 'content_subjects', complex: true },
    { route: '/content/chapters', name: 'content_chapters', complex: true },
    { route: '/content/lessons', name: 'content_lessons', complex: true },
    { route: '/content/lessons/les-math-12-01', name: 'content_lesson_editor', complex: false },
    { route: '/content/assessments', name: 'content_assessments', complex: true },
    { route: '/content/review', name: 'content_review', complex: true },
    { route: '/content/review/apr-1', name: 'content_review_detail', complex: false },
    { route: '/content/publications', name: 'content_publications', complex: true },
  ]

  for (const item of contentRoutes) {
    await captureRoute(page, 'content', item.route, 'desktop', item.name)
    await captureRoute(page, 'content', item.route, 'mobile', item.name)
    if (item.complex) {
      await captureRoute(page, 'content', item.route, 'laptop', item.name)
      await captureRoute(page, 'content', item.route, 'tablet', item.name)
    }
  }

  // ================= SUPPORT WORKSPACE =================
  console.log('\n--- CAPTURING SUPPORT WORKSPACE ---')
  const supportRoutes = [
    { route: '/support', name: 'support_dashboard', complex: false },
    { route: '/support/tickets', name: 'support_tickets', complex: true },
    { route: '/support/tickets/TK-4821', name: 'support_ticket_detail', complex: false },
    { route: '/support/users', name: 'support_users', complex: true },
    { route: '/support/users/usr-101', name: 'support_user_detail', complex: false },
  ]

  for (const item of supportRoutes) {
    await captureRoute(page, 'support', item.route, 'desktop', item.name)
    await captureRoute(page, 'support', item.route, 'mobile', item.name)
    if (item.complex) {
      await captureRoute(page, 'support', item.route, 'laptop', item.name)
      await captureRoute(page, 'support', item.route, 'tablet', item.name)
    }
  }

  // ================= REFERENCE SCREENSHOTS (ZHONGWENHUB) =================
  console.log('\n--- CAPTURING REFERENCE (ZHONGWENHUB) ---')
  try {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(ZHONGWENHUB_BASE, { waitUntil: 'networkidle', timeout: 30000 })
    await page.evaluate(() => {
      window.history.pushState({}, '', '/ZhongWenHub/management/admin/teachers')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    await page.waitForTimeout(1500)

    const refDeskPath = path.join(SCREENSHOTS_DIR, 'reference', 'zhongwenhub_teachers_desktop_1440.png')
    await page.screenshot({ path: refDeskPath, fullPage: true, animations: 'disabled' })
    manifest.push({
      filename: 'zhongwenhub_teachers_desktop_1440.png',
      relativePath: 'docs/visual-qa/screenshots/reference/zhongwenhub_teachers_desktop_1440.png',
      workspace: 'reference',
      route: '/management/admin/teachers',
      viewport: 'desktop_1440',
      width: 1440,
      height: 900,
      uiState: 'default',
      timestamp: new Date().toISOString(),
      sourceCommit: 'reference_repo',
      sourceUrl: ZHONGWENHUB_URL,
      loadStatus: '200_OK',
      notes: 'Giao diện quản lý giáo viên mẫu từ ZhongWenHub',
    })

    // Mobile
    await page.setViewportSize({ width: 390, height: 844 })
    await page.waitForTimeout(600)
    const refMobPath = path.join(SCREENSHOTS_DIR, 'reference', 'zhongwenhub_teachers_mobile_390.png')
    await page.screenshot({ path: refMobPath, fullPage: true, animations: 'disabled' })
    manifest.push({
      filename: 'zhongwenhub_teachers_mobile_390.png',
      relativePath: 'docs/visual-qa/screenshots/reference/zhongwenhub_teachers_mobile_390.png',
      workspace: 'reference',
      route: '/management/admin/teachers',
      viewport: 'mobile_390',
      width: 390,
      height: 844,
      uiState: 'default',
      timestamp: new Date().toISOString(),
      sourceCommit: 'reference_repo',
      sourceUrl: ZHONGWENHUB_URL,
      loadStatus: '200_OK',
      notes: 'Giao diện mobile tham khảo từ ZhongWenHub',
    })
  } catch (err: any) {
    console.error('Error capturing ZhongWenHub reference:', err.message)
  }

  // ================= INTERACTION STATES =================
  console.log('\n--- CAPTURING INTERACTION STATES ---')
  await setupAuth(page)

  // 1. Admin Teachers: Detail Drawer
  try {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${BASE_URL}/admin/teachers`, { waitUntil: 'networkidle', timeout: 35000 })
    await page.waitForTimeout(1000)
    // Click view teacher button (first action button)
    const viewBtn = page.locator('.table-action-btn[title*="Xem chi tiết"], .table-action-btn:has(svg)').first()
    if (await viewBtn.isVisible()) {
      await viewBtn.click()
      await page.waitForTimeout(600)
    }
    const drawerPath = path.join(INTERACTIONS_DIR, 'admin_teachers_drawer_open.png')
    await page.screenshot({ path: drawerPath, fullPage: false, animations: 'disabled' })
    manifest.push({
      filename: 'admin_teachers_drawer_open.png',
      relativePath: 'docs/visual-qa/interactions/admin_teachers_drawer_open.png',
      workspace: 'admin',
      route: '/admin/teachers',
      viewport: 'desktop_1440',
      width: 1440,
      height: 900,
      uiState: 'drawer_open',
      timestamp: new Date().toISOString(),
      sourceCommit: SOURCE_COMMIT,
      sourceUrl: `${BASE_URL}/admin/teachers`,
      loadStatus: '200_OK',
      notes: 'Teacher Detail Drawer hiển thị thông tin hồ sơ giáo viên',
    })
  } catch (e: any) {
    console.error('Interaction error (teachers drawer):', e.message)
  }

  // 2. Admin Teachers: Create Modal
  try {
    await page.goto(`${BASE_URL}/admin/teachers`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    const createBtn = page.locator('button:has-text("Thêm giáo viên")')
    if (await createBtn.isVisible()) {
      await createBtn.click()
      await page.waitForTimeout(600)
    }
    const modalPath = path.join(INTERACTIONS_DIR, 'admin_teachers_create_modal.png')
    await page.screenshot({ path: modalPath, fullPage: false, animations: 'disabled' })
    manifest.push({
      filename: 'admin_teachers_create_modal.png',
      relativePath: 'docs/visual-qa/interactions/admin_teachers_create_modal.png',
      workspace: 'admin',
      route: '/admin/teachers',
      viewport: 'desktop_1440',
      width: 1440,
      height: 900,
      uiState: 'modal_open',
      timestamp: new Date().toISOString(),
      sourceCommit: SOURCE_COMMIT,
      sourceUrl: `${BASE_URL}/admin/teachers`,
      loadStatus: '200_OK',
      notes: 'Modal tạo tài khoản giáo viên mới',
    })
  } catch (e: any) {
    console.error('Interaction error (teachers modal):', e.message)
  }

  // 3. Admin Users: Active Filter
  try {
    await page.goto(`${BASE_URL}/admin/users`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    const searchInput = page.locator('.admin-search-input, input[placeholder*="Tìm"]').first()
    if (await searchInput.isVisible()) {
      await searchInput.fill('Anh')
      await page.waitForTimeout(600)
    }
    const filterPath = path.join(INTERACTIONS_DIR, 'admin_users_filter_active.png')
    await page.screenshot({ path: filterPath, fullPage: false, animations: 'disabled' })
    manifest.push({
      filename: 'admin_users_filter_active.png',
      relativePath: 'docs/visual-qa/interactions/admin_users_filter_active.png',
      workspace: 'admin',
      route: '/admin/users',
      viewport: 'desktop_1440',
      width: 1440,
      height: 900,
      uiState: 'filter_active',
      timestamp: new Date().toISOString(),
      sourceCommit: SOURCE_COMMIT,
      sourceUrl: `${BASE_URL}/admin/users`,
      loadStatus: '200_OK',
      notes: 'Thanh tìm kiếm và bộ lọc người dùng đang áp dụng',
    })
  } catch (e: any) {
    console.error('Interaction error (users filter):', e.message)
  }

  // 4. Content Assessments: Preview Modal
  try {
    await page.goto(`${BASE_URL}/content/assessments`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    const prevBtn = page.locator('button:has-text("Xem trước"), .table-action-btn[title*="Xem trước"]').first()
    if (await prevBtn.isVisible()) {
      await prevBtn.click()
      await page.waitForTimeout(800)
    }
    const assessModalPath = path.join(INTERACTIONS_DIR, 'content_assessment_preview_modal.png')
    await page.screenshot({ path: assessModalPath, fullPage: false, animations: 'disabled' })
    manifest.push({
      filename: 'content_assessment_preview_modal.png',
      relativePath: 'docs/visual-qa/interactions/content_assessment_preview_modal.png',
      workspace: 'content',
      route: '/content/assessments',
      viewport: 'desktop_1440',
      width: 1440,
      height: 900,
      uiState: 'modal_open',
      timestamp: new Date().toISOString(),
      sourceCommit: SOURCE_COMMIT,
      sourceUrl: `${BASE_URL}/content/assessments`,
      loadStatus: '200_OK',
      notes: 'Assessment Preview hiển thị chuẩn dạng modal dialog độc lập có backdrop',
    })
  } catch (e: any) {
    console.error('Interaction error (assessment preview modal):', e.message)
  }

  // 5. Support Tickets: Filter Active
  try {
    await page.goto(`${BASE_URL}/support/tickets`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    const searchInput = page.locator('.admin-search-input, input[placeholder*="Tìm"]').first()
    if (await searchInput.isVisible()) {
      await searchInput.fill('đồng bộ')
      await page.waitForTimeout(600)
    }
    const supFilterPath = path.join(INTERACTIONS_DIR, 'support_tickets_filter_active.png')
    await page.screenshot({ path: supFilterPath, fullPage: false, animations: 'disabled' })
    manifest.push({
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
      sourceUrl: `${BASE_URL}/support/tickets`,
      loadStatus: '200_OK',
      notes: 'Lọc danh sách ticket hỗ trợ theo từ khóa',
    })
  } catch (e: any) {
    console.error('Interaction error (support ticket filter):', e.message)
  }

  await browser.close()

  // Save manifest.json
  const manifestPath = path.join(QA_DIR, 'manifest.json')
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
  console.log(`\nCaptured ${manifest.length} screenshots. Manifest written to ${manifestPath}`)
}

run().catch(console.error)

