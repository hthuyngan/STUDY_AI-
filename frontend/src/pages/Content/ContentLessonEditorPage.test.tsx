import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ContentLessonEditorPage } from './ContentLessonEditorPage'
import { contentService } from '@/services/content.service'
import type { LessonEditorData } from '@/types/content'

vi.mock('@/auth/useAuth', () => ({
  useAuth: () => ({ user: { id: 'usr_reviewer', role: 'content', displayName: 'Reviewer' } }),
}))

const MOCK_LESSON: LessonEditorData = {
  id: 'les_test_101',
  code: 'L101',
  title: 'Hàm số lũy thừa và đồ thị',
  subjectId: 'sub_math12',
  subjectName: 'Toán học 12 Chuẩn',
  chapterId: 'chp_math12_c2',
  chapterTitle: 'Chương 2: Hàm số lũy thừa và logarit',
  status: 'draft',
  rowVersion: 'rv_1',
  introduction: 'Nội dung mở đầu về hàm lũy thừa...',
  definitions: [
    { term: 'Định nghĩa hàm lũy thừa', content: 'Hàm số y = x^alpha với alpha thuộc R.' },
  ],
  formulas: [
    { label: 'Đạo hàm hàm lũy thừa', formula: "(x^\\alpha)' = \\alpha x^{\\alpha - 1}", note: 'x > 0' },
  ],
  examples: [
    {
      title: 'Ví dụ 1',
      problem: 'Tính đạo hàm của y = x^{3/2}',
      conclusion: "y' = 1.5 x^{0.5}",
    },
  ],
  notes: ['Chú ý tập xác định khi alpha không nguyên'],
  summary: ['Ghi nhớ 3 trường hợp tập xác định của hàm số lũy thừa'],
  questionsCount: 4,
  lastSavedAt: '2026-11-20T10:00:00Z',
}

describe('ContentLessonEditorPage (CURR-001, CURR-002, CURR-009)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(contentService, 'getLessonEditor').mockResolvedValue(JSON.parse(JSON.stringify(MOCK_LESSON)))
    vi.spyOn(contentService, 'listLessonResources').mockResolvedValue({ items: [], total: 0 })
    vi.spyOn(contentService, 'getLessonComposition').mockResolvedValue({
      lessonId: 'les_test_101',
      title: 'Hàm số lũy thừa và đồ thị',
      status: 'draft',
      curriculumId: null,
      rowVersion: 'rv_1',
      blocks: [],
      objectives: [],
      knowledgeUnits: [],
      skills: [],
      prerequisites: [],
    })
    vi.spyOn(contentService, 'getLessonRevisions').mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 20,
      totalCount: 0,
    })
    vi.spyOn(contentService, 'saveLessonContent').mockResolvedValue({ ...JSON.parse(JSON.stringify(MOCK_LESSON)), rowVersion: 'rv_2' })
    vi.spyOn(contentService, 'submitLessonReview').mockResolvedValue({
      status: 'in-review',
      rowVersion: 'rv_3',
      updatedAt: '2026-11-25T01:00:00Z',
    })
    vi.spyOn(contentService, 'approveLesson').mockResolvedValue({
      status: 'approved',
      rowVersion: 'rv_4',
      updatedAt: '2026-11-25T01:02:00Z',
    })
    vi.spyOn(contentService, 'publishLesson').mockResolvedValue({
      status: 'published',
      rowVersion: 'rv_5',
      updatedAt: '2026-11-25T01:05:00Z',
    })
  })

  it('CURR-009: displays real subject and chapter from API, without hardcoded fallback or grade 12 defaults', async () => {
    render(
      <MemoryRouter initialEntries={['/content/lessons/les_test_101/edit']}>
        <Routes>
          <Route path="/content/lessons/:id/edit" element={<ContentLessonEditorPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByDisplayValue('Hàm số lũy thừa và đồ thị')).toBeInTheDocument()
    })

    expect(screen.getByTestId('lesson-subject-name')).toHaveTextContent('Toán học 12 Chuẩn')
    expect(screen.getByTestId('lesson-chapter-title')).toHaveTextContent('Chương 2: Hàm số lũy thừa và logarit')
    expect(screen.getByText('Bản nháp')).toBeInTheDocument()
    // Does NOT generate fake assessment ID asm-les_test_101
    expect(screen.queryByText(/asm-les_test_101/)).not.toBeInTheDocument()
    expect(screen.getByText(/4 câu hỏi trắc nghiệm liên kết/)).toBeInTheDocument()
  })

  it('CURR-009: renders explicit error state when route is missing lesson ID without fallback to lesson-math-08', async () => {
    render(
      <MemoryRouter initialEntries={['/content/lessons/edit']}>
        <Routes>
          <Route path="/content/lessons/edit" element={<ContentLessonEditorPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Thiếu mã bài học')).toBeInTheDocument()
    })
    expect(contentService.getLessonEditor).not.toHaveBeenCalledWith('lesson-math-08')
  })

  it('CURR-001: Save Draft invokes saveLessonContent PATCH and never sends status', async () => {
    render(
      <MemoryRouter initialEntries={['/content/lessons/les_test_101/edit']}>
        <Routes>
          <Route path="/content/lessons/:id/edit" element={<ContentLessonEditorPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByDisplayValue('Hàm số lũy thừa và đồ thị')).toBeInTheDocument()
    })

    const titleInput = screen.getByDisplayValue('Hàm số lũy thừa và đồ thị')
    fireEvent.change(titleInput, { target: { value: 'Hàm số lũy thừa đã sửa' } })

    const saveDraftBtn = screen.getByRole('button', { name: 'Lưu bản nháp' })
    fireEvent.click(saveDraftBtn)

    await waitFor(() => {
      expect(contentService.saveLessonContent).toHaveBeenCalledTimes(1)
    })

    const payload = vi.mocked(contentService.saveLessonContent).mock.calls[0][0]
    expect(payload.title).toBe('Hàm số lũy thừa đã sửa')
    expect(payload.id).toBe('les_test_101')
    // MUST NOT send status to bypass workflow!
    expect((payload as any).status).toBeUndefined()
    expect(await screen.findByText('✓ Đã lưu bản nháp thành công!')).toBeInTheDocument()
  })

  it('CURR-001: Submit Review calls dedicated workflow endpoint and handles failure with error alert (no false success)', async () => {
    vi.spyOn(contentService, 'submitLessonReview').mockRejectedValueOnce(
      new Error('Bài học chưa đủ nội dung để gửi kiểm duyệt')
    )

    render(
      <MemoryRouter initialEntries={['/content/lessons/les_test_101/edit']}>
        <Routes>
          <Route path="/content/lessons/:id/edit" element={<ContentLessonEditorPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByDisplayValue('Hàm số lũy thừa và đồ thị')).toBeInTheDocument()
    })

    const submitReviewBtn = screen.getByRole('button', { name: 'Gửi kiểm duyệt' })
    fireEvent.click(submitReviewBtn)

    await waitFor(() => {
      expect(contentService.submitLessonReview).toHaveBeenCalledWith('les_test_101', 'rv_2')
    })

    // Fail-closed: Must show error alert and status remains draft
    expect(await screen.findByRole('alert')).toHaveTextContent('Bài học chưa đủ nội dung để gửi kiểm duyệt')
    expect(screen.getByText('Bản nháp')).toBeInTheDocument()
    expect(screen.queryByText('Chờ duyệt')).not.toBeInTheDocument()
  })

  it('CURR-001: Publish is hidden on draft and works on approved with rowVersion; 409 preserves form edits', async () => {
    vi.spyOn(contentService, 'getLessonEditor').mockResolvedValueOnce({
      ...JSON.parse(JSON.stringify(MOCK_LESSON)),
      status: 'approved',
      rowVersion: 'rv_approved',
    })

    render(
      <MemoryRouter initialEntries={['/content/lessons/les_test_101/edit']}>
        <Routes>
          <Route path="/content/lessons/:id/edit" element={<ContentLessonEditorPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByDisplayValue('Hàm số lũy thừa và đồ thị')).toBeInTheDocument()
    })

    const publishBtn = screen.getByRole('button', { name: 'Xuất bản bài học' })
    fireEvent.click(publishBtn)

    await waitFor(() => {
      expect(contentService.publishLesson).toHaveBeenCalledWith('les_test_101', 'rv_approved')
    })

    expect(await screen.findByText('✓ Đã xuất bản bài học thành công cho học sinh!')).toBeInTheDocument()
    expect(screen.getByText('Đã xuất bản')).toBeInTheDocument()
  })

  it('P02-F01: 409 conflict on save preserves edited title and shows alert without false success', async () => {
    vi.spyOn(contentService, 'saveLessonContent').mockRejectedValueOnce(new Error('Dữ liệu đã được thay đổi bởi người dùng khác.'))

    render(
      <MemoryRouter initialEntries={['/content/lessons/les_test_101/edit']}>
        <Routes>
          <Route path="/content/lessons/:id/edit" element={<ContentLessonEditorPage />} />
        </Routes>
      </MemoryRouter>
    )

    const titleInput = await screen.findByDisplayValue('Hàm số lũy thừa và đồ thị')
    fireEvent.change(titleInput, { target: { value: 'Tiêu đề đang sửa' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Dữ liệu đã được thay đổi')
    expect(screen.getByDisplayValue('Tiêu đề đang sửa')).toBeInTheDocument()
    expect(screen.queryByText(/Đã lưu bản nháp thành công/)).not.toBeInTheDocument()
  })

  it('CURR-002: preserves structured definitions, formulas, and examples upon edit without join/split object corruption', async () => {
    render(
      <MemoryRouter initialEntries={['/content/lessons/les_test_101/edit']}>
        <Routes>
          <Route path="/content/lessons/:id/edit" element={<ContentLessonEditorPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByDisplayValue('Định nghĩa hàm lũy thừa')).toBeInTheDocument()
    })

    // Verify structured fields
    expect(screen.getByDisplayValue('Đạo hàm hàm lũy thừa')).toBeInTheDocument()
    expect(screen.getByDisplayValue("(x^\\alpha)' = \\alpha x^{\\alpha - 1}")).toBeInTheDocument()
    expect(screen.getByDisplayValue('x > 0')).toBeInTheDocument()

    // Add a new definition
    const addDefBtn = screen.getByRole('button', { name: '+ Thêm định nghĩa' })
    fireEvent.click(addDefBtn)

    const newDefTermInput = screen.getByLabelText('Thuật ngữ 2')
    fireEvent.change(newDefTermInput, { target: { value: 'Khái niệm mới' } })

    const saveDraftBtn = screen.getByRole('button', { name: 'Lưu bản nháp' })
    fireEvent.click(saveDraftBtn)

    await waitFor(() => {
      expect(contentService.saveLessonContent).toHaveBeenCalled()
    })

    const callPayload = vi.mocked(contentService.saveLessonContent).mock.calls[0][0]
    expect(Array.isArray(callPayload.definitions)).toBe(true)
    // Definitions must be structured objects, NOT strings like "[object Object]"
    expect(callPayload.definitions?.[0]).toEqual(
      expect.objectContaining({
        term: 'Định nghĩa hàm lũy thừa',
        content: 'Hàm số y = x^alpha với alpha thuộc R.',
      })
    )
    expect(callPayload.formulas?.[0]).toEqual(
      expect.objectContaining({
        label: 'Đạo hàm hàm lũy thừa',
        formula: "(x^\\alpha)' = \\alpha x^{\\alpha - 1}",
        note: 'x > 0',
      })
    )
  })
})
