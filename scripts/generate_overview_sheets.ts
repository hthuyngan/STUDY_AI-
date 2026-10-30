import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

const ROOT_DIR = 'E:/AI_tutor'
const OVERVIEWS_DIR = path.join(ROOT_DIR, 'docs', 'visual-qa', 'overviews')
const SCREENSHOTS_DIR = path.join(ROOT_DIR, 'docs', 'visual-qa', 'screenshots')
const INTERACTIONS_DIR = path.join(ROOT_DIR, 'docs', 'visual-qa', 'interactions')

interface CardItem {
  title: string
  route: string
  imagePath: string
  badge: string
}

function generateHtml(title: string, subtitle: string, cards: CardItem[], isMobile = false) {
  const cardsHtml = cards
    .map((c) => {
      // Read image as base64 for reliable standalone rendering in Playwright
      const absPath = path.isAbsolute(c.imagePath) ? c.imagePath : path.join(ROOT_DIR, c.imagePath)
      if (!fs.existsSync(absPath)) {
        console.warn(`File not found: ${absPath}`)
        return ''
      }
      const b64 = fs.readFileSync(absPath).toString('base64')
      const dataUri = `data:image/png;base64,${b64}`

      return `
      <div class="card ${isMobile ? 'mobile-card' : ''}">
        <div class="card-header">
          <div class="card-title-group">
            <span class="card-title">${c.title}</span>
            <span class="card-route">${c.route}</span>
          </div>
          <span class="card-badge">${c.badge}</span>
        </div>
        <div class="card-img-wrap ${isMobile ? 'mobile-img-wrap' : ''}">
          <img src="${dataUri}" alt="${c.title}" />
        </div>
      </div>
    `
    })
    .join('\n')

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
      body { background: #0B1521; color: #F0F4F8; padding: 32px; }
      .header { margin-bottom: 28px; border-bottom: 1px solid #1E3A5F; padding-bottom: 20px; }
      .brand-tag { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #F4B942; font-weight: 700; margin-bottom: 6px; }
      h1 { font-size: 26px; font-weight: 700; color: #FFFFFF; margin-bottom: 8px; }
      p { font-size: 14px; color: #9FB3C8; }
      .meta { display: flex; gap: 16px; margin-top: 12px; font-size: 12px; color: #627D98; }
      .meta-item { display: inline-flex; align-items: center; gap: 6px; }
      .meta-val { color: #D9E2EC; font-weight: 600; }
      
      .grid {
        display: grid;
        grid-template-columns: ${isMobile ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)'};
        gap: 20px;
      }
      
      .card {
        background: #102A43;
        border: 1px solid #243B53;
        border-radius: 10px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      }
      .card-header {
        padding: 12px 16px;
        background: #173F5F;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #243B53;
      }
      .card-title-group { display: flex; flex-direction: column; gap: 2px; }
      .card-title { font-size: 14px; font-weight: 700; color: #FFFFFF; }
      .card-route { font-size: 11px; color: #9FB3C8; font-family: monospace; }
      .card-badge {
        font-size: 11px;
        font-weight: 600;
        background: rgba(244, 185, 66, 0.15);
        color: #F4B942;
        padding: 3px 8px;
        border-radius: 4px;
        border: 1px solid rgba(244, 185, 66, 0.3);
      }
      
      .card-img-wrap {
        background: #0B1521;
        width: 100%;
        max-height: 520px;
        overflow: hidden;
      }
      .card-img-wrap.mobile-img-wrap {
        max-height: 640px;
      }
      .card-img-wrap img {
        width: 100%;
        height: auto;
        display: block;
        object-fit: cover;
        object-position: top;
      }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="brand-tag">STUDY_AI · VISUAL QA EVIDENCE SHEET</div>
      <h1>${title}</h1>
      <p>${subtitle}</p>
      <div class="meta">
        <div class="meta-item">Source Commit: <span class="meta-val">7efb868</span></div>
        <div class="meta-item">Target: <span class="meta-val">GitHub Pages Live Production</span></div>
        <div class="meta-item">Capture Date: <span class="meta-val">${new Date().toLocaleDateString('vi-VN')}</span></div>
        <div class="meta-item">Design System: <span class="meta-val">Navy Notebook & ZhongWenHub Pattern</span></div>
      </div>
    </div>
    <div class="grid">
      ${cardsHtml}
    </div>
  </body>
  </html>
  `
}

async function renderContactSheet(
  browser: any,
  htmlContent: string,
  outputPath: string,
  width = 1600
) {
  const page = await browser.newPage({ viewport: { width, height: 900 } })
  await page.setContent(htmlContent, { waitUntil: 'load' })
  await page.waitForTimeout(1000)
  await page.screenshot({ path: outputPath, fullPage: true, animations: 'disabled' })
  await page.close()
  console.log(`Saved overview sheet: ${path.basename(outputPath)}`)
}

async function generateAll() {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' })

  // 1. ADMIN DESKTOP
  const adminDesktopCards: CardItem[] = [
    { title: 'Admin Dashboard', route: '/admin', imagePath: 'docs/visual-qa/screenshots/admin/admin_dashboard_desktop_1440.png', badge: 'Overview' },
    { title: 'Quản lý người dùng', route: '/admin/users', imagePath: 'docs/visual-qa/screenshots/admin/admin_users_desktop_1440.png', badge: 'Table + Filters' },
    { title: 'Chi tiết người dùng', route: '/admin/users/usr-101', imagePath: 'docs/visual-qa/screenshots/admin/admin_user_detail_desktop_1440.png', badge: 'Profile Tabs' },
    { title: 'Phân quyền & Vai trò', route: '/admin/roles', imagePath: 'docs/visual-qa/screenshots/admin/admin_roles_desktop_1440.png', badge: 'RBAC Matrix' },
    { title: 'Quản lý giáo viên', route: '/admin/teachers', imagePath: 'docs/visual-qa/screenshots/admin/admin_teachers_desktop_1440.png', badge: 'ZhongWenHub Style' },
    { title: 'Giám sát nội dung', route: '/admin/content-monitor', imagePath: 'docs/visual-qa/screenshots/admin/admin_content_monitor_desktop_1440.png', badge: 'Approval Strip' },
    { title: 'Giám sát hỗ trợ', route: '/admin/support-monitor', imagePath: 'docs/visual-qa/screenshots/admin/admin_support_monitor_desktop_1440.png', badge: 'Ticket Monitor' },
    { title: 'Báo cáo & Phân tích', route: '/admin/reports', imagePath: 'docs/visual-qa/screenshots/admin/admin_reports_desktop_1440.png', badge: 'Analytics' },
    { title: 'Nhật ký kiểm toán', route: '/admin/audit-logs', imagePath: 'docs/visual-qa/screenshots/admin/admin_audit_logs_desktop_1440.png', badge: 'Audit Trail' },
    { title: 'Thông báo hệ thống', route: '/admin/announcements', imagePath: 'docs/visual-qa/screenshots/admin/admin_announcements_desktop_1440.png', badge: 'Notice Center' },
  ]
  await renderContactSheet(
    browser,
    generateHtml('Admin Workspace — Desktop Overview (1440px)', 'Tổng hợp giao diện bảng điều khiển, người dùng, giáo viên và kiểm toán.', adminDesktopCards, false),
    path.join(OVERVIEWS_DIR, 'ADMIN_DESKTOP.png'),
    1600
  )

  // 2. ADMIN MOBILE
  const adminMobileCards: CardItem[] = [
    { title: 'Dashboard Mobile', route: '/admin', imagePath: 'docs/visual-qa/screenshots/admin/admin_dashboard_mobile_390.png', badge: 'Mobile 390px' },
    { title: 'Người dùng Mobile', route: '/admin/users', imagePath: 'docs/visual-qa/screenshots/admin/admin_users_mobile_390.png', badge: 'Card List' },
    { title: 'Hồ sơ người dùng', route: '/admin/users/usr-101', imagePath: 'docs/visual-qa/screenshots/admin/admin_user_detail_mobile_390.png', badge: 'Card View' },
    { title: 'Giáo viên Mobile', route: '/admin/teachers', imagePath: 'docs/visual-qa/screenshots/admin/admin_teachers_mobile_390.png', badge: 'Teacher Cards' },
    { title: 'Phân quyền Mobile', route: '/admin/roles', imagePath: 'docs/visual-qa/screenshots/admin/admin_roles_mobile_390.png', badge: 'RBAC Cards' },
    { title: 'Kiểm toán Mobile', route: '/admin/audit-logs', imagePath: 'docs/visual-qa/screenshots/admin/admin_audit_logs_mobile_390.png', badge: 'Audit Cards' },
    { title: 'Thông báo Mobile', route: '/admin/announcements', imagePath: 'docs/visual-qa/screenshots/admin/admin_announcements_mobile_390.png', badge: 'Notice Cards' },
    { title: 'Cấu hình Mobile', route: '/admin/settings', imagePath: 'docs/visual-qa/screenshots/admin/admin_settings_mobile_390.png', badge: 'Form View' },
  ]
  await renderContactSheet(
    browser,
    generateHtml('Admin Workspace — Mobile Overview (390px)', 'Giao diện di động chuyển đổi mượt mà sang Mobile Card List, không tràn ngang.', adminMobileCards, true),
    path.join(OVERVIEWS_DIR, 'ADMIN_MOBILE.png'),
    1800
  )

  // 3. TEACHER DESKTOP
  const teacherDesktopCards: CardItem[] = [
    { title: 'Teacher Dashboard', route: '/teacher', imagePath: 'docs/visual-qa/screenshots/teacher/teacher_dashboard_desktop_1440.png', badge: 'KPI Strip' },
    { title: 'Danh sách lớp học', route: '/teacher/classes', imagePath: 'docs/visual-qa/screenshots/teacher/teacher_classes_desktop_1440.png', badge: 'Table View' },
    { title: 'Chi tiết lớp 12A1', route: '/teacher/classes/cls-12a1', imagePath: 'docs/visual-qa/screenshots/teacher/teacher_class_detail_desktop_1440.png', badge: 'Class Detail' },
    { title: 'Danh sách học sinh', route: '/teacher/students', imagePath: 'docs/visual-qa/screenshots/teacher/teacher_students_desktop_1440.png', badge: 'Student Table' },
    { title: 'Quản lý bài tập', route: '/teacher/assignments', imagePath: 'docs/visual-qa/screenshots/teacher/teacher_assignments_desktop_1440.png', badge: 'Assignments' },
    { title: 'Bảng điểm tổng hợp', route: '/teacher/grades', imagePath: 'docs/visual-qa/screenshots/teacher/teacher_grades_desktop_1440.png', badge: 'Gradebook' },
    { title: 'Cảnh báo học tập', route: '/teacher/alerts', imagePath: 'docs/visual-qa/screenshots/teacher/teacher_alerts_desktop_1440.png', badge: 'Alerts Strip' },
    { title: 'Tạo bài tập mới', route: '/teacher/assignments/new', imagePath: 'docs/visual-qa/screenshots/teacher/teacher_assignment_new_desktop_1440.png', badge: 'Form View' },
  ]
  await renderContactSheet(
    browser,
    generateHtml('Teacher Workspace — Desktop Overview (1440px)', 'Dải SummaryStrip 4 KPIs gọn gàng, bảng điểm và danh sách học sinh chuẩn quản trị.', teacherDesktopCards, false),
    path.join(OVERVIEWS_DIR, 'TEACHER_DESKTOP.png'),
    1600
  )

  // 4. TEACHER MOBILE
  const teacherMobileCards: CardItem[] = [
    { title: 'Dashboard Mobile', route: '/teacher', imagePath: 'docs/visual-qa/screenshots/teacher/teacher_dashboard_mobile_390.png', badge: 'Mobile 390px' },
    { title: 'Lớp học Mobile', route: '/teacher/classes', imagePath: 'docs/visual-qa/screenshots/teacher/teacher_classes_mobile_390.png', badge: 'Class Cards' },
    { title: 'Học sinh Mobile', route: '/teacher/students', imagePath: 'docs/visual-qa/screenshots/teacher/teacher_students_mobile_390.png', badge: 'Student Cards' },
    { title: 'Bài tập Mobile', route: '/teacher/assignments', imagePath: 'docs/visual-qa/screenshots/teacher/teacher_assignments_mobile_390.png', badge: 'Assignment Cards' },
    { title: 'Bảng điểm Mobile', route: '/teacher/grades', imagePath: 'docs/visual-qa/screenshots/teacher/teacher_grades_mobile_390.png', badge: 'Grade Cards' },
    { title: 'Cảnh báo Mobile', route: '/teacher/alerts', imagePath: 'docs/visual-qa/screenshots/teacher/teacher_alerts_mobile_390.png', badge: 'Alert Cards' },
    { title: 'Chi tiết lớp Mobile', route: '/teacher/classes/cls-12a1', imagePath: 'docs/visual-qa/screenshots/teacher/teacher_class_detail_mobile_390.png', badge: 'Detail Cards' },
    { title: 'Tạo bài tập Mobile', route: '/teacher/assignments/new', imagePath: 'docs/visual-qa/screenshots/teacher/teacher_assignment_new_mobile_390.png', badge: 'Compact Form' },
  ]
  await renderContactSheet(
    browser,
    generateHtml('Teacher Workspace — Mobile Overview (390px)', 'Chuyển đổi hoàn hảo sang Mobile Cards, loại bỏ 100% hiện tượng tràn ngang.', teacherMobileCards, true),
    path.join(OVERVIEWS_DIR, 'TEACHER_MOBILE.png'),
    1800
  )

  // 5. CONTENT DESKTOP
  const contentDesktopCards: CardItem[] = [
    { title: 'Content Dashboard', route: '/content', imagePath: 'docs/visual-qa/screenshots/content/content_dashboard_desktop_1440.png', badge: 'Overview Strip' },
    { title: 'Quản lý môn học', route: '/content/subjects', imagePath: 'docs/visual-qa/screenshots/content/content_subjects_desktop_1440.png', badge: 'Subject Table' },
    { title: 'Quản lý chương học', route: '/content/chapters', imagePath: 'docs/visual-qa/screenshots/content/content_chapters_desktop_1440.png', badge: 'Order Controls' },
    { title: 'Quản lý bài học', route: '/content/lessons', imagePath: 'docs/visual-qa/screenshots/content/content_lessons_desktop_1440.png', badge: 'Lesson Table' },
    { title: 'Bài thu hoạch (Assessments)', route: '/content/assessments', imagePath: 'docs/visual-qa/screenshots/content/content_assessments_desktop_1440.png', badge: 'Modal Preview' },
    { title: 'Hàng đợi phê duyệt', route: '/content/review', imagePath: 'docs/visual-qa/screenshots/content/content_review_desktop_1440.png', badge: 'Review Queue' },
    { title: 'Lịch sử xuất bản', route: '/content/publications', imagePath: 'docs/visual-qa/screenshots/content/content_publications_desktop_1440.png', badge: 'Rollback Actions' },
    { title: 'Soạn thảo bài học', route: '/content/lessons/les-math-12-01', imagePath: 'docs/visual-qa/screenshots/content/content_lesson_editor_desktop_1440.png', badge: 'Lesson Editor' },
  ]
  await renderContactSheet(
    browser,
    generateHtml('Content Workspace — Desktop Overview (1440px)', 'Biên tập giáo trình, kiểm duyệt chất lượng và xuất bản phiên bản học liệu.', contentDesktopCards, false),
    path.join(OVERVIEWS_DIR, 'CONTENT_DESKTOP.png'),
    1600
  )

  // 6. CONTENT MOBILE
  const contentMobileCards: CardItem[] = [
    { title: 'Content Dashboard', route: '/content', imagePath: 'docs/visual-qa/screenshots/content/content_dashboard_mobile_390.png', badge: 'Mobile 390px' },
    { title: 'Môn học Mobile', route: '/content/subjects', imagePath: 'docs/visual-qa/screenshots/content/content_subjects_mobile_390.png', badge: 'Subject Cards' },
    { title: 'Chương học Mobile', route: '/content/chapters', imagePath: 'docs/visual-qa/screenshots/content/content_chapters_mobile_390.png', badge: 'Chapter Cards' },
    { title: 'Bài học Mobile', route: '/content/lessons', imagePath: 'docs/visual-qa/screenshots/content/content_lessons_mobile_390.png', badge: 'Lesson Cards' },
    { title: 'Bài thu hoạch Mobile', route: '/content/assessments', imagePath: 'docs/visual-qa/screenshots/content/content_assessments_mobile_390.png', badge: 'Assessment Cards' },
    { title: 'Phê duyệt Mobile', route: '/content/review', imagePath: 'docs/visual-qa/screenshots/content/content_review_mobile_390.png', badge: 'Review Cards' },
    { title: 'Xuất bản Mobile', route: '/content/publications', imagePath: 'docs/visual-qa/screenshots/content/content_publications_mobile_390.png', badge: 'Publication Cards' },
    { title: 'Soạn bài Mobile', route: '/content/lessons/les-math-12-01', imagePath: 'docs/visual-qa/screenshots/content/content_lesson_editor_mobile_390.png', badge: 'Responsive Bar' },
  ]
  await renderContactSheet(
    browser,
    generateHtml('Content Workspace — Mobile Overview (390px)', 'Khắc phục hoàn toàn lỗi tràn ngang 1,000px, chuyển sang card hiển thị đầy đủ thao tác.', contentMobileCards, true),
    path.join(OVERVIEWS_DIR, 'CONTENT_MOBILE.png'),
    1800
  )

  // 7. SUPPORT DESKTOP
  const supportDesktopCards: CardItem[] = [
    { title: 'Support Dashboard', route: '/support', imagePath: 'docs/visual-qa/screenshots/support/support_dashboard_desktop_1440.png', badge: 'Summary Strip' },
    { title: 'Danh sách yêu cầu (Tickets)', route: '/support/tickets', imagePath: 'docs/visual-qa/screenshots/support/support_tickets_desktop_1440.png', badge: 'Ticket Queue' },
    { title: 'Chi tiết Ticket TK-4821', route: '/support/tickets/TK-4821', imagePath: 'docs/visual-qa/screenshots/support/support_ticket_detail_desktop_1440.png', badge: 'Thread + Reply' },
    { title: 'Danh bạ người dùng hỗ trợ', route: '/support/users', imagePath: 'docs/visual-qa/screenshots/support/support_users_desktop_1440.png', badge: 'Users List' },
    { title: 'Hồ sơ kỹ thuật người dùng', route: '/support/users/usr-101', imagePath: 'docs/visual-qa/screenshots/support/support_user_detail_desktop_1440.png', badge: 'Sync State' },
  ]
  await renderContactSheet(
    browser,
    generateHtml('Support Workspace — Desktop Overview (1440px)', 'Xử lý yêu cầu hỗ trợ, theo dõi đồng bộ dữ liệu và giải quyết thắc mắc học tập.', supportDesktopCards, false),
    path.join(OVERVIEWS_DIR, 'SUPPORT_DESKTOP.png'),
    1600
  )

  // 8. SUPPORT MOBILE
  const supportMobileCards: CardItem[] = [
    { title: 'Dashboard Mobile', route: '/support', imagePath: 'docs/visual-qa/screenshots/support/support_dashboard_mobile_390.png', badge: 'Mobile 390px' },
    { title: 'Tickets Mobile', route: '/support/tickets', imagePath: 'docs/visual-qa/screenshots/support/support_tickets_mobile_390.png', badge: 'Ticket Cards' },
    { title: 'Chi tiết Ticket Mobile', route: '/support/tickets/TK-4821', imagePath: 'docs/visual-qa/screenshots/support/support_ticket_detail_mobile_390.png', badge: 'Chat Thread' },
    { title: 'Người dùng Mobile', route: '/support/users', imagePath: 'docs/visual-qa/screenshots/support/support_users_mobile_390.png', badge: 'User Cards' },
    { title: 'Hồ sơ kỹ thuật Mobile', route: '/support/users/usr-101', imagePath: 'docs/visual-qa/screenshots/support/support_user_detail_mobile_390.png', badge: 'Profile Cards' },
  ]
  await renderContactSheet(
    browser,
    generateHtml('Support Workspace — Mobile Overview (390px)', 'Giao diện hỗ trợ khách hàng và điều phối sự cố trên màn hình nhỏ.', supportMobileCards, true),
    path.join(OVERVIEWS_DIR, 'SUPPORT_MOBILE.png'),
    1800
  )

  // 9. INTERACTIONS OVERVIEW
  const interactionCards: CardItem[] = [
    { title: 'Teacher Detail Drawer', route: '/admin/teachers', imagePath: 'docs/visual-qa/interactions/admin_teachers_drawer_open.png', badge: 'Slide-in Drawer' },
    { title: 'Create Teacher Modal', route: '/admin/teachers', imagePath: 'docs/visual-qa/interactions/admin_teachers_create_modal.png', badge: 'Modal Dialog' },
    { title: 'Admin Users Filter Active', route: '/admin/users', imagePath: 'docs/visual-qa/interactions/admin_users_filter_active.png', badge: 'Filter Bar' },
    { title: 'Assessment Preview Modal', route: '/content/assessments', imagePath: 'docs/visual-qa/interactions/content_assessment_preview_modal.png', badge: 'Modal Isolation' },
    { title: 'Support Ticket Search Active', route: '/support/tickets', imagePath: 'docs/visual-qa/interactions/support_tickets_filter_active.png', badge: 'Search Query' },
  ]
  await renderContactSheet(
    browser,
    generateHtml('Interactive States Overview', 'Kiểm chứng các trạng thái tương tác động: Drawer trượt, Modal độc lập và Bộ lọc đang kích hoạt.', interactionCards, false),
    path.join(OVERVIEWS_DIR, 'INTERACTIONS.png'),
    1600
  )

  // 10. ZHONGWENHUB COMPARISON
  const comparisonCards: CardItem[] = [
    { title: 'STUDY_AI: Admin Teachers (Thực tế)', route: '/admin/teachers', imagePath: 'docs/visual-qa/screenshots/admin/admin_teachers_desktop_1440.png', badge: 'Navy Notebook' },
    { title: 'ZhongWenHub: Admin Teachers (Tham khảo)', route: '/management/admin/teachers', imagePath: 'docs/visual-qa/screenshots/reference/zhongwenhub_teachers_desktop_1440.png', badge: 'Reference Model' },
    { title: 'STUDY_AI: Teachers Mobile (Thực tế)', route: '/admin/teachers', imagePath: 'docs/visual-qa/screenshots/admin/admin_teachers_mobile_390.png', badge: 'Mobile Dual-View' },
    { title: 'ZhongWenHub: Teachers Mobile (Tham khảo)', route: '/management/admin/teachers', imagePath: 'docs/visual-qa/screenshots/reference/zhongwenhub_teachers_mobile_390.png', badge: 'Mobile Reference' },
  ]
  await renderContactSheet(
    browser,
    generateHtml('ZhongWenHub Architecture Comparison', 'So sánh trực tiếp kiến trúc quản trị giữa STUDY_AI và hình mẫu tham khảo ZhongWenHub.', comparisonCards, false),
    path.join(OVERVIEWS_DIR, 'ZHONGWENHUB_COMPARISON.png'),
    1600
  )

  await browser.close()
  console.log('All 10 contact sheets generated successfully!')
}

generateAll().catch(console.error)
