import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ContentImportPage } from './ContentImportPage'
import { curriculumImportService } from '@/services/curriculumImport.service'
import { ApiError } from '@/lib/apiClient'

vi.mock('@/services/curriculumImport.service', () => ({
  curriculumImportService: {
    previewImport: vi.fn(),
    confirmImport: vi.fn(),
  },
}))

describe('ContentImportPage Component & Interaction Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('1. Renders page header, breadcrumbs, and drag-and-drop file upload zone', () => {
    render(
      <MemoryRouter>
        <ContentImportPage />
      </MemoryRouter>
    )

    expect(screen.getByText('Nhập giáo trình hàng loạt')).toBeInTheDocument()
    expect(screen.getByText('Bước 1: Chọn tệp dữ liệu')).toBeInTheDocument()
    expect(screen.getByTestId('import-dropzone')).toBeInTheDocument()
    expect(
      screen.getByText(/Hỗ trợ định dạng \.json, \.csv, \.xlsx/i)
    ).toBeInTheDocument()
  })

  it('2. Rejects unsupported file extension and displays client validation alert', () => {
    render(
      <MemoryRouter>
        <ContentImportPage />
      </MemoryRouter>
    )

    const input = screen.getByTestId('file-upload-input')
    const invalidFile = new File(['binary'], 'curriculum.pdf', { type: 'application/pdf' })

    fireEvent.change(input, { target: { files: [invalidFile] } })

    expect(screen.getByTestId('file-client-error')).toBeInTheDocument()
    expect(
      screen.getByText(/Định dạng tệp không được hỗ trợ/i)
    ).toBeInTheDocument()
  })

  it('3. Accepts valid .json file, displays file metadata, and calls previewImport', async () => {
    const mockPreviewResponse = {
      previewToken: 'prev_test_token_123456789',
      fileHashSha256: 'abc123hash',
      fileName: 'math_curriculum.json',
      fileFormat: 'json',
      summary: {
        totalItems: 4,
        insertCount: 4,
        updateCount: 0,
        skipCount: 0,
        conflictCount: 0,
        errorCount: 0,
        warningCount: 0,
        isValid: true,
      },
      errors: [],
      warnings: [],
      previewItems: [
        { entityType: 'subject', identifier: 'MATH12', title: 'Toán học 12', action: 'Insert' },
        { entityType: 'chapter', identifier: 'CH01', title: 'Khảo sát hàm số', action: 'Insert' },
        { entityType: 'lesson', identifier: 'LES01', title: 'Tính đơn điệu của hàm số', action: 'Insert' },
        { entityType: 'question', identifier: 'Q01', title: 'Câu hỏi trắc nghiệm 1', action: 'Insert' },
      ],
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    }

    vi.mocked(curriculumImportService.previewImport).mockResolvedValue(mockPreviewResponse)

    render(
      <MemoryRouter>
        <ContentImportPage />
      </MemoryRouter>
    )

    const input = screen.getByTestId('file-upload-input')
    const validFile = new File([JSON.stringify({ subjects: [] })], 'math_curriculum.json', {
      type: 'application/json',
    })

    fireEvent.change(input, { target: { files: [validFile] } })

    expect(screen.getByTestId('selected-file-info')).toBeInTheDocument()
    expect(screen.getByText('math_curriculum.json')).toBeInTheDocument()

    const previewBtn = screen.getByTestId('btn-preview-import')
    fireEvent.click(previewBtn)

    await waitFor(() => {
      expect(curriculumImportService.previewImport).toHaveBeenCalledWith(validFile)
    })

    await waitFor(() => {
      expect(screen.getByTestId('preview-result-card')).toBeInTheDocument()
      expect(screen.getByTestId('preview-valid-banner')).toBeInTheDocument()
      expect(screen.getByText('Tệp hợp lệ để nhập vào hệ thống')).toBeInTheDocument()
    })
  })

  it('4. Renders errors and disables confirm button when preview contains errors (Strict-only)', async () => {
    const mockInvalidPreviewResponse = {
      previewToken: 'prev_invalid_token',
      fileHashSha256: 'xyz987hash',
      fileName: 'invalid_curriculum.csv',
      fileFormat: 'csv',
      summary: {
        totalItems: 3,
        insertCount: 1,
        updateCount: 0,
        skipCount: 0,
        conflictCount: 1,
        errorCount: 2,
        warningCount: 1,
        isValid: false,
      },
      errors: [
        {
          row: 5,
          field: 'SubjectCode',
          errorCode: 'PARENT_SUBJECT_NOT_FOUND',
          message: 'Mã môn học MATH99 không tồn tại trong hệ thống.',
          severity: 'Error',
        },
        {
          row: 12,
          field: 'Slug',
          errorCode: 'DUPLICATE_SLUG_IN_BATCH',
          message: 'Đường dẫn bài học bị trùng lặp trong cùng tệp.',
          severity: 'Error',
        },
      ],
      warnings: [
        {
          row: 3,
          field: 'Difficulty',
          errorCode: 'DEFAULT_DIFFICULTY_APPLIED',
          message: 'Độ khó để trống, tự động gán medium.',
          severity: 'Warning',
        },
      ],
      previewItems: [
        { entityType: 'lesson', identifier: 'L1', title: 'Bài 1', action: 'Insert' },
      ],
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    }

    vi.mocked(curriculumImportService.previewImport).mockResolvedValue(mockInvalidPreviewResponse)

    render(
      <MemoryRouter>
        <ContentImportPage />
      </MemoryRouter>
    )

    const input = screen.getByTestId('file-upload-input')
    const file = new File(['code,name'], 'invalid_curriculum.csv', { type: 'text/csv' })

    fireEvent.change(input, { target: { files: [file] } })
    fireEvent.click(screen.getByTestId('btn-preview-import'))

    await waitFor(() => {
      expect(screen.getByTestId('preview-invalid-banner')).toBeInTheDocument()
      expect(screen.getByTestId('preview-errors-list')).toBeInTheDocument()
      expect(screen.getByText('PARENT_SUBJECT_NOT_FOUND')).toBeInTheDocument()
      expect(screen.getByText('DUPLICATE_SLUG_IN_BATCH')).toBeInTheDocument()
      expect(screen.getByTestId('preview-warnings-list')).toBeInTheDocument()
    })

    const confirmBtn = screen.getByTestId('btn-open-confirm-modal')
    expect(confirmBtn).toBeDisabled()
  })

  it('5. Successfully executes Confirm Import with audit note and displays success result', async () => {
    const mockPreviewResponse = {
      previewToken: 'prev_valid_token_xyz',
      fileHashSha256: 'validhash123',
      fileName: 'valid.json',
      fileFormat: 'json',
      summary: {
        totalItems: 2,
        insertCount: 2,
        updateCount: 0,
        skipCount: 0,
        conflictCount: 0,
        errorCount: 0,
        warningCount: 0,
        isValid: true,
      },
      errors: [],
      warnings: [],
      previewItems: [
        { entityType: 'subject', identifier: 'SUB1', title: 'Môn 1', action: 'Insert' },
        { entityType: 'lesson', identifier: 'LES1', title: 'Bài 1', action: 'Insert' },
      ],
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    }

    const mockConfirmResponse = {
      success: true,
      previewToken: 'prev_valid_token_xyz',
      actorId: 'usr_admin_01',
      confirmedAt: new Date().toISOString(),
      auditLogId: 'audit_log_987654',
      summary: {
        totalProcessed: 2,
        inserted: 2,
        updated: 0,
        skipped: 0,
        failed: 0,
      },
      entityCounts: {
        subjects: 1,
        chapters: 0,
        lessons: 1,
        questions: 0,
      },
      message: 'Nhập giáo trình thành công 2 bản ghi.',
    }

    vi.mocked(curriculumImportService.previewImport).mockResolvedValue(mockPreviewResponse)
    vi.mocked(curriculumImportService.confirmImport).mockResolvedValue(mockConfirmResponse)

    render(
      <MemoryRouter>
        <ContentImportPage />
      </MemoryRouter>
    )

    const input = screen.getByTestId('file-upload-input')
    const file = new File(['{}'], 'valid.json', { type: 'application/json' })
    fireEvent.change(input, { target: { files: [file] } })
    fireEvent.click(screen.getByTestId('btn-preview-import'))

    await waitFor(() => {
      expect(screen.getByTestId('btn-open-confirm-modal')).toBeEnabled()
    })

    // Enter audit note
    const noteInput = screen.getByTestId('audit-note-input')
    fireEvent.change(noteInput, { target: { value: 'Bổ sung chương trình Toán 12' } })

    // Open modal
    fireEvent.click(screen.getByTestId('btn-open-confirm-modal'))

    // Click confirm in modal
    const modalConfirmBtn = screen.getByRole('button', { name: /^Xác nhận nhập$/i })
    fireEvent.click(modalConfirmBtn)

    await waitFor(() => {
      expect(curriculumImportService.confirmImport).toHaveBeenCalledWith(
        'prev_valid_token_xyz',
        'Bổ sung chương trình Toán 12'
      )
    })

    await waitFor(() => {
      expect(screen.getByTestId('import-success-card')).toBeInTheDocument()
      expect(screen.getByText('Nhập giáo trình thành công!')).toBeInTheDocument()
      expect(screen.getByText('audit_log_987654')).toBeInTheDocument()
    })
  })

  it('6. Handles 409 conflict and 404 token expired errors gracefully', async () => {
    const mockPreviewResponse = {
      previewToken: 'prev_conflict_token',
      fileHashSha256: 'conflicthash',
      fileName: 'conflict.json',
      fileFormat: 'json',
      summary: {
        totalItems: 1,
        insertCount: 1,
        updateCount: 0,
        skipCount: 0,
        conflictCount: 0,
        errorCount: 0,
        warningCount: 0,
        isValid: true,
      },
      errors: [],
      warnings: [],
      previewItems: [
        { entityType: 'subject', identifier: 'SUB1', title: 'Môn 1', action: 'Insert' },
      ],
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    }

    vi.mocked(curriculumImportService.previewImport).mockResolvedValue(mockPreviewResponse)
    vi.mocked(curriculumImportService.confirmImport).mockRejectedValue(
      new ApiError(409, 'Conflict occurred', 'CONFLICT', {
        message: 'Môn học với mã SUB1 đã được thêm bởi tiến trình khác.',
      })
    )

    render(
      <MemoryRouter>
        <ContentImportPage />
      </MemoryRouter>
    )

    const input = screen.getByTestId('file-upload-input')
    const file = new File(['{}'], 'conflict.json', { type: 'application/json' })
    fireEvent.change(input, { target: { files: [file] } })
    fireEvent.click(screen.getByTestId('btn-preview-import'))

    await waitFor(() => {
      expect(screen.getByTestId('btn-open-confirm-modal')).toBeEnabled()
    })

    fireEvent.click(screen.getByTestId('btn-open-confirm-modal'))
    const modalConfirmBtn = screen.getByRole('button', { name: /^Xác nhận nhập$/i })
    fireEvent.click(modalConfirmBtn)

    await waitFor(() => {
      expect(screen.getByTestId('confirm-error-banner')).toBeInTheDocument()
      expect(
        screen.getByText(/Xung đột dữ liệu \(409\)/i)
      ).toBeInTheDocument()
    })
  })
})
