import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { LearnerAssignmentsPage } from './LearnerAssignmentsPage'
import { apiClient } from '@/lib/apiClient'
import { classroomService } from '@/services/classroom.service'
import type { AssignmentDto, SubmissionDto } from '@/types/classroom'

vi.mock('@/auth/useAuth', () => ({
  useAuth: () => ({
    state: 'authenticated',
    user: { id: 'usr-learner', email: 'learner@studyai.internal', role: 'learner' },
  }),
}))

vi.mock('@/lib/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

vi.mock('@/services/classroom.service', () => ({
  classroomService: {
    getAssignments: vi.fn(),
    submitAssignment: vi.fn(),
  },
}))

const mockAssignments: AssignmentDto[] = [
  {
    id: 'asg-1',
    classroomId: 'cls-12a1',
    classroomName: 'Lớp 12A1',
    title: 'Bài tập Khảo sát Đạo hàm',
    description: 'Lập bảng biến thiên và xác định cực trị',
    instructions: 'Trình bày chi tiết',
    dueDate: '2026-11-20T23:59:00Z',
    maxScore: 10,
    status: 'active',
    createdByTeacherId: 'tch-01',
    createdByTeacherName: 'Thầy Hải',
    submissionsCount: 1,
    totalStudents: 30,
    createdAt: '2026-11-10T08:00:00Z',
    updatedAt: '2026-11-10T08:00:00Z',
    mySubmission: undefined,
  },
  {
    id: 'asg-2',
    classroomId: 'cls-12a1',
    classroomName: 'Lớp 12A1',
    title: 'Bài tập Tích phân từng phần',
    description: 'Áp dụng công thức tính nguyên hàm từng phần',
    dueDate: '2026-11-18T23:59:00Z',
    maxScore: 10,
    status: 'active',
    createdByTeacherId: 'tch-01',
    createdByTeacherName: 'Thầy Hải',
    submissionsCount: 5,
    totalStudents: 30,
    createdAt: '2026-11-08T08:00:00Z',
    updatedAt: '2026-11-08T08:00:00Z',
    mySubmission: {
      id: 'sub-2',
      assignmentId: 'asg-2',
      assignmentTitle: 'Bài tập Tích phân từng phần',
      studentId: 'usr-student',
      content: 'Lời giải chi tiết câu 1 và câu 2',
      submittedAt: '2026-11-09T10:00:00Z',
      status: 'graded',
      score: 9.5,
      feedback: 'Lời giải rất tốt và chuẩn xác',
      gradedAt: '2026-11-09T14:00:00Z',
      gradedByTeacherId: 'tch-01',
    },
  },
]

describe('LearnerAssignmentsPage UI Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(apiClient.get).mockResolvedValue(mockAssignments)
  })

  it('renders assignment list with title, classroom name, and badges', async () => {
    render(
      <MemoryRouter>
        <LearnerAssignmentsPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Bài tập Khảo sát Đạo hàm')).toBeInTheDocument()
      expect(screen.getByText('Bài tập Tích phân từng phần')).toBeInTheDocument()
    })

    expect(screen.getByText('Chưa nộp')).toBeInTheDocument()
    expect(screen.getByText(/Đã chấm: 9.5/)).toBeInTheDocument()
  })

  it('filters assignments by status tabs', async () => {
    render(
      <MemoryRouter>
        <LearnerAssignmentsPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Bài tập Khảo sát Đạo hàm')).toBeInTheDocument()
    })

    // Click "Đã có điểm" tab
    const gradedTab = screen.getByText(/Đã có điểm/)
    fireEvent.click(gradedTab)

    expect(screen.getByText('Bài tập Tích phân từng phần')).toBeInTheDocument()
    expect(screen.queryByText('Bài tập Khảo sát Đạo hàm')).not.toBeInTheDocument()
  })

  it('opens assignment submission dialog and submits work successfully', async () => {
    const mockSubmissionResult: SubmissionDto = {
      id: 'sub-1',
      assignmentId: 'asg-1',
      studentId: 'usr-student',
      content: 'Bài giải tự luận của em',
      submittedAt: new Date().toISOString(),
      status: 'submitted',
    }
    vi.mocked(classroomService.submitAssignment).mockResolvedValue(mockSubmissionResult)

    render(
      <MemoryRouter>
        <LearnerAssignmentsPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Bài tập Khảo sát Đạo hàm')).toBeInTheDocument()
    })

    // Click on unsubmitted card action button to open modal
    fireEvent.click(screen.getByText('Làm bài'))

    expect(screen.getByText('Hướng dẫn làm bài:')).toBeInTheDocument()
    const textarea = screen.getByPlaceholderText(/Nhập nội dung bài giải/)
    fireEvent.change(textarea, { target: { value: 'Bài giải tự luận của em' } })

    const form = textarea.closest('form')!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(classroomService.submitAssignment).toHaveBeenCalledWith('asg-1', 'Bài giải tự luận của em')
    })
  })

  it('displays teacher feedback and score when viewing graded assignment', async () => {
    render(
      <MemoryRouter>
        <LearnerAssignmentsPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Bài tập Tích phân từng phần')).toBeInTheDocument()
    })

    // Click graded card action button
    fireEvent.click(screen.getByText('Xem kết quả'))

    expect(screen.getByText(/Điểm số:/)).toBeInTheDocument()
    expect(screen.getByText('Lời giải rất tốt và chuẩn xác')).toBeInTheDocument()
    expect(screen.getByText(/Bài tập đã được chấm điểm/)).toBeInTheDocument()
  })
})
