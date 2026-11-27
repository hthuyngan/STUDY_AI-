import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TeacherExamsPage } from './TeacherExamsPage'
import { TeacherMaterialsPage } from './TeacherMaterialsPage'
import { TeacherSchedulePage } from './TeacherSchedulePage'
import { TeacherAnnouncementsPage } from './TeacherAnnouncementsPage'
import { teacherWorkspaceService } from '@/services/teacherWorkspace.service'
import { classroomService } from '@/services/classroom.service'

describe('Math 12 Teacher Workspace Pages', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(classroomService, 'getClasses').mockResolvedValue([])
  })

  it('renders TeacherExamsPage, TeacherMaterialsPage, TeacherSchedulePage, and TeacherAnnouncementsPage cleanly', async () => {
    vi.spyOn(teacherWorkspaceService, 'getExams').mockResolvedValue([])
    vi.spyOn(teacherWorkspaceService, 'getMaterials').mockResolvedValue([])
    vi.spyOn(teacherWorkspaceService, 'getSchedule').mockResolvedValue([])
    vi.spyOn(teacherWorkspaceService, 'getAnnouncements').mockResolvedValue([])

    render(
      <MemoryRouter>
        <TeacherExamsPage />
        <TeacherMaterialsPage />
        <TeacherSchedulePage />
        <TeacherAnnouncementsPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Kiểm tra & Đề thi Toán 12')).toBeInTheDocument()
      expect(screen.getByText('Tài liệu giảng dạy')).toBeInTheDocument()
      expect(screen.getByText('Lịch giảng dạy & Hạn nộp')).toBeInTheDocument()
      expect(screen.getByText('Thông báo lớp học')).toBeInTheDocument()
    })
  })
})
