import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { WORKSPACE_CONFIGS } from '@/components/layout/workspaceNavigation'
import { AdminRoutes } from '@/routes/adminRoutes'
import { classroomService } from '@/services/classroom.service'
import { educationService } from '@/services/education.service'
import { operationsService } from '@/services/operations.service'
import { supportService } from '@/services/support.service'

// Mock useAuth
vi.mock('@/auth/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'demo-admin-id',
      email: 'admin@studyai.edu.vn',
      fullName: 'Demo Administrator',
      role: 'admin',
    },
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
    refreshSession: vi.fn(),
  }),
}))

describe('STUDY_AI Workspace Restructuring V6 Suite', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('1. Workspace Navigation Configuration & Role Boundaries', () => {
    it('defines distinct role configurations for admin, teacher, content, and support', () => {
      expect(WORKSPACE_CONFIGS.admin.basePath).toBe('/admin')
      expect(WORKSPACE_CONFIGS.teacher.basePath).toBe('/teacher')
      expect(WORKSPACE_CONFIGS.content.basePath).toBe('/content')
      expect(WORKSPACE_CONFIGS.support.basePath).toBe('/support')
    })

    it('ensures Admin navigation has zero direct teaching or curriculum operational items', () => {
      const adminGroups = WORKSPACE_CONFIGS.admin.groups
      const allAdminPaths = adminGroups.flatMap((g) => g.items.map((i) => i.path))

      expect(allAdminPaths).not.toContain('/admin/subjects')
      expect(allAdminPaths).not.toContain('/admin/chapters')
      expect(allAdminPaths).not.toContain('/admin/lessons')
      expect(allAdminPaths).not.toContain('/admin/classes')
      expect(allAdminPaths).not.toContain('/admin/students')
      expect(allAdminPaths).not.toContain('/admin/assignments')
      expect(allAdminPaths).not.toContain('/admin/grades')
      expect(allAdminPaths).not.toContain('/admin/alerts')

      // Admin has monitoring instead
      expect(allAdminPaths).toContain('/admin/content-monitor')
      expect(allAdminPaths).toContain('/admin/support-monitor')
      expect(allAdminPaths).toContain('/admin/users')
      expect(allAdminPaths).toContain('/admin/roles')
      expect(allAdminPaths).toContain('/admin/teachers')
    })

    it('ensures Content navigation owns curriculum and editorial review', () => {
      const contentGroups = WORKSPACE_CONFIGS.content.groups
      const allContentPaths = contentGroups.flatMap((g) => g.items.map((i) => i.path))

      expect(allContentPaths).toContain('/content/subjects')
      expect(allContentPaths).toContain('/content/chapters')
      expect(allContentPaths).toContain('/content/lessons')
      expect(allContentPaths).toContain('/content/assessments')
      expect(allContentPaths).toContain('/content/review')
      expect(allContentPaths).toContain('/content/publications')
    })

    it('ensures Teacher navigation owns classroom management, assignments, and grades', () => {
      const teacherGroups = WORKSPACE_CONFIGS.teacher.groups
      const allTeacherPaths = teacherGroups.flatMap((g) => g.items.map((i) => i.path))

      expect(allTeacherPaths).toContain('/teacher/classes')
      expect(allTeacherPaths).toContain('/teacher/students')
      expect(allTeacherPaths).toContain('/teacher/assignments')
      expect(allTeacherPaths).toContain('/teacher/grades')
      expect(allTeacherPaths).toContain('/teacher/alerts')
    })

    it('ensures Support navigation owns user support tickets', () => {
      const supportGroups = WORKSPACE_CONFIGS.support.groups
      const allSupportPaths = supportGroups.flatMap((g) => g.items.map((i) => i.path))

      expect(allSupportPaths).toContain('/support/tickets')
      expect(allSupportPaths).toContain('/support/users')
    })
  })

  describe('2. Legacy Route Redirects (Seamless Backward Compatibility)', () => {
    it('redirects /admin/subjects to /content/subjects', async () => {
      render(
        <MemoryRouter initialEntries={['/admin/subjects']}>
          <Routes>
            {AdminRoutes()}
            <Route path="/content/subjects" element={<div>Destination Content Subjects</div>} />
          </Routes>
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Destination Content Subjects')).toBeInTheDocument()
      })
    })

    it('redirects /admin/classes to /teacher/classes', async () => {
      render(
        <MemoryRouter initialEntries={['/admin/classes']}>
          <Routes>
            {AdminRoutes()}
            <Route path="/teacher/classes" element={<div>Destination Teacher Classes</div>} />
          </Routes>
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Destination Teacher Classes')).toBeInTheDocument()
      })
    })

    it('redirects /admin/classes/:classId preserving class ID param', async () => {
      render(
        <MemoryRouter initialEntries={['/admin/classes/cls-12a1']}>
          <Routes>
            {AdminRoutes()}
            <Route path="/teacher/classes/:id" element={<div>Destination Teacher Class Detail</div>} />
          </Routes>
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Destination Teacher Class Detail')).toBeInTheDocument()
      })
    })

    it('redirects /admin/grades to /teacher/grades', async () => {
      render(
        <MemoryRouter initialEntries={['/admin/grades']}>
          <Routes>
            {AdminRoutes()}
            <Route path="/teacher/grades" element={<div>Destination Teacher Grades</div>} />
          </Routes>
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Destination Teacher Grades')).toBeInTheDocument()
      })
    })

    it('redirects /admin/alerts to /teacher/alerts', async () => {
      render(
        <MemoryRouter initialEntries={['/admin/alerts']}>
          <Routes>
            {AdminRoutes()}
            <Route path="/teacher/alerts" element={<div>Destination Teacher Alerts</div>} />
          </Routes>
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Destination Teacher Alerts')).toBeInTheDocument()
      })
    })

    it('redirects /admin/tickets to /support/tickets', async () => {
      render(
        <MemoryRouter initialEntries={['/admin/tickets']}>
          <Routes>
            {AdminRoutes()}
            <Route path="/support/tickets" element={<div>Destination Support Tickets</div>} />
          </Routes>
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Destination Support Tickets')).toBeInTheDocument()
      })
    })

    it('redirects /admin/approvals to /content/review', async () => {
      render(
        <MemoryRouter initialEntries={['/admin/approvals']}>
          <Routes>
            {AdminRoutes()}
            <Route path="/content/review" element={<div>Destination Content Review</div>} />
          </Routes>
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Destination Content Review')).toBeInTheDocument()
      })
    })
  })

  describe('3. Content Workspace Flow & Approval Lifecycle', () => {
    it('manages subjects, chapters, lessons in educationService', async () => {
      const initialSubjects = await educationService.getSubjects()
      expect(initialSubjects.length).toBeGreaterThan(0)

      const newSubject = await educationService.createSubject({
        name: 'Vật lý 12 Nâng Cao V6',
        code: 'PHY12-V6',
        description: 'Chương trình Vật lý 12 ôn thi THPT Quốc gia',
        icon: 'Atom',
        grade: 'Lớp 12',
        status: 'published',
      })

      expect(newSubject.id).toBeDefined()
      const updated = await educationService.getSubjects()
      expect(updated.find((s) => s.id === newSubject.id)).toBeDefined()
    })

    it('updates approval status through draft, approved, and published', async () => {
      const approvals = await operationsService.getApprovals()
      expect(approvals.length).toBeGreaterThan(0)

      const pending = approvals.find((a) => a.status === 'pending') || approvals[0]
      await operationsService.approveContent(pending.id, 'Phê duyệt học liệu vào kho chính thức')

      const afterApprove = await operationsService.getApprovalById(pending.id)
      expect(afterApprove?.status).toBe('approved')

      await operationsService.publishContent(pending.id)
      const afterPublish = await operationsService.getApprovalById(pending.id)
      expect(afterPublish?.status).toBe('published')
    })
  })

  describe('4. Teacher Workspace Flow & Classroom Operations', () => {
    it('manages classrooms, students, assignments, and grades in classroomService', async () => {
      const classes = await classroomService.getClasses()
      expect(classes.length).toBeGreaterThan(0)

      const newClass = await classroomService.saveClass({
        name: 'Lớp 11A9 V6',
        code: '11A9-V6',
        grade: 'Lớp 11',
        homeroomTeacherName: 'ThS. Nguyễn Văn Hải',
        homeroomTeacherId: 'tch-hai',
        room: 'P.304',
        academicYear: '2026-2027',
        maxStudents: 40,
        description: 'Lớp chuyên Toán nâng cao',
      })

      expect(newClass.id).toBeDefined()
      const freshClasses = await classroomService.getClasses()
      expect(freshClasses.find((c) => c.code === '11A9-V6')).toBeDefined()

      // Assignment creation
      const newAsg = await classroomService.saveAssignment({
        title: 'Bài kiểm tra chuyên đề Vector',
        classId: newClass.id,
        className: newClass.name,
        subjectName: 'Toán học 11',
        dueDate: '2026-11-15',
        maxScore: 10,
        instructions: 'Trình bày chi tiết các bước giải hình học không gian',
        status: 'active',
      })

      expect(newAsg.id).toBeDefined()
      const asgs = await classroomService.getAssignments()
      expect(asgs.find((a) => a.id === newAsg.id)).toBeDefined()
    })

    it('resolves student learning alerts with teacher intervention notes', async () => {
      const alerts = await classroomService.getAlerts()
      expect(alerts.length).toBeGreaterThan(0)

      const alertToResolve = alerts[0]
      await classroomService.updateAlertStatus(
        alertToResolve.id,
        'resolved',
        'Đã tổ chức phụ đạo 2 buổi và học sinh đã nắm vững kiến thức'
      )

      const updatedAlerts = await classroomService.getAlerts()
      const target = updatedAlerts.find((a) => a.id === alertToResolve.id)
      expect(target?.status).toBe('resolved')
      expect(target?.resolutionNote).toContain('phụ đạo')
    })
  })

  describe('5. Admin Monitoring & Cross-Workspace Oversight', () => {
    it('renders Admin Content Monitor with KPI indicators and workspace link', async () => {
      render(
        <MemoryRouter initialEntries={['/admin/content-monitor']}>
          <Routes>
            {AdminRoutes()}
          </Routes>
        </MemoryRouter>
      )

      expect(screen.getByRole('heading', { name: /giám sát & báo cáo nội dung giáo dục/i })).toBeInTheDocument()
      await waitFor(() => {
        expect(screen.getByText(/đang chờ kiểm duyệt/i)).toBeInTheDocument()
      })
      expect(screen.getByText(/tỷ lệ duyệt thành công/i)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /mở content workspace/i })).toHaveAttribute('href', '/content/review')
    })

    it('renders Admin Support Monitor with SLA metrics and workspace link', async () => {
      render(
        <MemoryRouter initialEntries={['/admin/support-monitor']}>
          <Routes>
            {AdminRoutes()}
          </Routes>
        </MemoryRouter>
      )

      expect(screen.getByRole('heading', { name: /giám sát & báo cáo vận hành hỗ trợ/i })).toBeInTheDocument()
      await waitFor(() => {
        expect(screen.getByText(/tổng số yêu cầu tiếp nhận/i)).toBeInTheDocument()
      })
      expect(screen.getByText(/tuân thủ cam kết sla/i)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /mở support workspace/i })).toHaveAttribute('href', '/support/tickets')
    })
  })

  describe('6. Support Workspace Operations', () => {
    it('retrieves tickets and user details through supportService', async () => {
      const tickets = await supportService.getTickets()
      expect(tickets.length).toBeGreaterThan(0)

      const firstTicket = tickets[0]
      const detail = await supportService.getTicketDetail(firstTicket.id)
      expect(detail?.ticket?.id).toBe(firstTicket.id)
      expect(detail?.messages?.length).toBeGreaterThan(0)
    })
  })
})
