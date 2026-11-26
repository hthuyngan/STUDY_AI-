import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { LessonResourcesPanel } from './LessonResourcesPanel'
import { LessonResourcesList } from '@/components/lesson/LessonResourcesList'
import { LessonVideoPlayer } from '@/components/lesson/LessonVideoPlayer'
import { contentService } from '@/services/content.service'

describe('P04 LessonResourcesPanel & Learner Rendering', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders empty state when lesson has no resources (optional media)', async () => {
    vi.spyOn(contentService, 'listLessonResources').mockResolvedValue({ items: [], total: 0 })

    render(<LessonResourcesPanel lessonId="les-1" isReviewer={true} />)

    await waitFor(() => {
      expect(screen.getByText(/chưa có tài nguyên đính kèm/i)).toBeInTheDocument()
    })
  })

  it('retains user input and offers reload on 409 RowVersion conflict', async () => {
    vi.spyOn(contentService, 'listLessonResources').mockResolvedValue({
      items: [
        {
          id: 'res-1',
          lessonId: 'les-1',
          lessonTitle: 'Bài 1',
          resourceType: 'document',
          status: 'draft',
          title: 'Tài liệu gốc',
          description: '',
          provider: 'external',
          sourceUrl: 'https://cdn.example.org/doc.pdf',
          isPrimary: false,
          language: 'vi',
          durationSeconds: 0,
          sortOrder: 1,
          embedAllowed: false,
          verificationStatus: 'pending',
          isPublished: false,
          isArchived: false,
          createdAt: '2026-11-26T00:00:00Z',
          updatedAt: '2026-11-26T00:00:00Z',
          rowVersion: 'AAAAAQ==',
        },
      ],
      total: 1,
    })

    vi.spyOn(contentService, 'updateLessonResource').mockRejectedValue({
      status: 409,
      detail: 'Tài nguyên đã bị thay đổi bởi phiên khác (409).',
    })

    render(<LessonResourcesPanel lessonId="les-1" isReviewer={false} />)

    await waitFor(() => {
      expect(screen.getByText(/Tài liệu gốc/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Sửa' }))
    const titleInput = screen.getByLabelText('Tiêu đề tài nguyên') as HTMLInputElement
    fireEvent.change(titleInput, { target: { value: 'Tài liệu đã sửa' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu cập nhật tài nguyên' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('409')
      expect(screen.getByRole('button', { name: 'Tải lại dữ liệu mới nhất' })).toBeInTheDocument()
    })
    // User input preserved after 409
    expect((screen.getByLabelText('Tiêu đề tài nguyên') as HTMLInputElement).value).toBe('Tài liệu đã sửa')
  })

  it('renders image, document, link, and attachment resources safely in LessonResourcesList', () => {
    render(
      <LessonResourcesList
        resources={[
          {
            id: 'r1',
            resourceType: 'image',
            title: 'Đồ thị hàm số',
            provider: 'external',
            sourceUrl: 'https://cdn.example.org/graph.png',
            durationSeconds: 0,
            sortOrder: 1,
            embedAllowed: false,
          },
          {
            id: 'r2',
            resourceType: 'document',
            title: 'Phiếu bài tập PDF',
            provider: 'external',
            sourceUrl: 'https://cdn.example.org/sheet.pdf',
            durationSeconds: 0,
            sortOrder: 2,
            embedAllowed: false,
          },
          {
            id: 'r3',
            resourceType: 'link',
            title: 'Tham khảo Khan Academy',
            provider: 'external',
            sourceUrl: 'https://vi.khanacademy.org/math',
            durationSeconds: 0,
            sortOrder: 3,
            embedAllowed: false,
          },
          {
            id: 'r4',
            resourceType: 'attachment',
            title: 'Tệp đính kèm nội bộ',
            provider: 'internal_storage',
            sourceUrl: '/uploads/lessons/sample.pdf',
            durationSeconds: 0,
            sortOrder: 4,
            embedAllowed: false,
          },
          {
            id: 'r5',
            resourceType: 'link',
            title: 'Link nguy hiểm',
            provider: 'external',
            sourceUrl: 'javascript:alert(1)',
            durationSeconds: 0,
            sortOrder: 5,
            embedAllowed: false,
          },
        ]}
      />
    )

    expect(screen.getByAltText('Đồ thị hàm số')).toHaveAttribute('src', 'https://cdn.example.org/graph.png')
    expect(screen.getByText('Phiếu bài tập PDF')).toBeInTheDocument()
    expect(screen.getByText('Tham khảo Khan Academy')).toBeInTheDocument()
    expect(screen.getByText('Tệp đính kèm nội bộ')).toBeInTheDocument()
    expect(screen.getByText(/đường dẫn không hợp lệ/i)).toBeInTheDocument()
  })

  it('fails visibly and safely in LessonVideoPlayer when legacy video URL is invalid', () => {
    render(
      <LessonVideoPlayer
        lessonTitle="Bài học mẫu"
        video={{
          id: 'v-bad',
          title: 'Bad Video',
          provider: 'html5',
          sourceUrl: 'javascript:alert(1)',
          embedUrl: 'javascript:alert(1)',
          embedAllowed: true,
        }}
      />
    )

    expect(screen.getByText(/Video bài giảng không hợp lệ hoặc không được hỗ trợ/i)).toBeInTheDocument()
  })
})
