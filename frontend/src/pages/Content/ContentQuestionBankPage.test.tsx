import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ContentQuestionBankPage } from './ContentQuestionBankPage'
import { contentQuestionBankService } from '@/services/contentQuestionBank.service'
import { educationService } from '@/services/education.service'

vi.mock('@/auth/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'usr_content_test',
      email: 'content@gmail.com',
      displayName: 'Content Specialist',
      role: 'content',
    },
    isAuthenticated: true,
  }),
}))

vi.mock('@/services/education.service', () => ({
  educationService: {
    getSubjects: vi.fn().mockResolvedValue([
      { id: 'math', name: 'Toán học', grade: '12' },
      { id: 'physics', name: 'Vật lí', grade: '12' },
    ]),
  },
}))

vi.mock('@/services/contentQuestionBank.service', () => ({
  contentQuestionBankService: {
    getStatistics: vi.fn().mockResolvedValue({
      totalQuestions: 120,
      draftCount: 15,
      inReviewCount: 8,
      approvedCount: 22,
      publishedCount: 75,
      rejectedCount: 2,
      deletedCount: 4,
      byDifficulty: { nhan_biet: 40, thong_hieu: 40, van_dung: 30, van_dung_cao: 10 },
      byType: { 'multiple-choice': 80, 'multiple-select': 15, 'true-false': 15, 'short-answer': 10 },
      bySubject: { 'Toán học': 80, 'Vật lí': 40 },
      bySource: { manual: 90, 'ai-generated': 30 },
    }),
    getQuestions: vi.fn().mockResolvedValue({
      items: [
        {
          id: 'qst_001',
          code: 'Q-TOAN12-001',
          prompt: 'Cho hàm số $y = f(x)$ liên tục trên R. Tìm số điểm cực trị?',
          type: 'multiple-choice',
          difficulty: 'thong_hieu',
          grade: '12',
          subjectName: 'Toán học',
          status: 'published',
          options: ['1', '2', '3', '4'],
          correctAnswer: '2',
          explanation: 'Đạo hàm đổi dấu 2 lần.',
          isDeleted: false,
          sourceType: 'manual',
          copyrightStatus: 'proprietary',
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'qst_002',
          code: 'Q-TOAN12-002',
          prompt: 'Đúng hay sai: Mọi hàm liên tục đều khả vi trên R?',
          type: 'true-false',
          difficulty: 'nhan_biet',
          grade: '12',
          subjectName: 'Toán học',
          status: 'in-review',
          options: ['Đúng', 'Sai'],
          correctAnswer: 'Sai',
          explanation: 'Ví dụ hàm $y = |x|$ liên tục tại 0 nhưng không có đạo hàm tại 0.',
          isDeleted: false,
          sourceType: 'manual',
          copyrightStatus: 'proprietary',
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      total: 2,
      page: 1,
      pageSize: 15,
    }),
    createQuestion: vi.fn().mockResolvedValue({ id: 'qst_new' }),
    updateQuestion: vi.fn().mockResolvedValue({ id: 'qst_001' }),
    deleteQuestion: vi.fn().mockResolvedValue({ success: true }),
    restoreQuestion: vi.fn().mockResolvedValue({ id: 'qst_001', isDeleted: false }),
    submitReview: vi.fn().mockResolvedValue({ id: 'qst_001', status: 'in-review' }),
    approveQuestion: vi.fn().mockResolvedValue({ id: 'qst_002', status: 'approved' }),
    rejectQuestion: vi.fn().mockResolvedValue({ id: 'qst_002', status: 'rejected' }),
    publishQuestion: vi.fn().mockResolvedValue({ id: 'qst_001', status: 'published' }),
    unpublishQuestion: vi.fn().mockResolvedValue({ id: 'qst_001', status: 'draft' }),
  },
}))

describe('ContentQuestionBankPage Component Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('1. Renders Question Bank dashboard header, statistics and question table', async () => {
    render(
      <MemoryRouter initialEntries={['/content/questions']}>
        <Routes>
          <Route path="/content/questions" element={<ContentQuestionBankPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Ngân hàng câu hỏi giáo dục')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Q-TOAN12-001')).toBeInTheDocument()
      expect(screen.getByText('Q-TOAN12-002')).toBeInTheDocument()
      expect(screen.getByText('Tổng số câu hỏi')).toBeInTheDocument()
      expect(screen.getAllByText('Đã xuất bản').length).toBeGreaterThan(0)
    })
  })

  it('2. Opens question creation modal with 5 question types', async () => {
    render(
      <MemoryRouter initialEntries={['/content/questions']}>
        <Routes>
          <Route path="/content/questions" element={<ContentQuestionBankPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Soạn câu hỏi mới')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Soạn câu hỏi mới'))

    expect(screen.getByText('Nội dung câu hỏi (Hỗ trợ KaTeX công thức toán: $...$) *')).toBeInTheDocument()
    expect(screen.getByText('Định dạng câu hỏi')).toBeInTheDocument()
    expect(screen.getByText('Mức độ nhận thức')).toBeInTheDocument()
  })

  it('3. Can approve question under Content Primacy workflow', async () => {
    render(
      <MemoryRouter initialEntries={['/content/questions']}>
        <Routes>
          <Route path="/content/questions" element={<ContentQuestionBankPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTitle('Phê duyệt (Content Primacy)')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTitle('Phê duyệt (Content Primacy)'))

    await waitFor(() => {
      expect(contentQuestionBankService.approveQuestion).toHaveBeenCalledWith('qst_002')
    })
  })
})
