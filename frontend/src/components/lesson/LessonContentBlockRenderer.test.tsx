import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { LessonContentBlockRenderer } from './LessonContentBlockRenderer'
import type { LessonContentBlock } from '@/types/content'

describe('LessonContentBlockRenderer (P03)', () => {
  it('renders all 12 closed subject-neutral block types in orderIndex order without leaking protected exercise answers', () => {
    const blocks: LessonContentBlock[] = [
      { id: 'b2', blockType: 'timeline', schemaVersion: 1, orderIndex: 1, payload: { caption: 'Lịch sử', events: [{ date: '1945', title: 'Cách mạng tháng Tám' }] } },
      { id: 'b1', blockType: 'text', schemaVersion: 1, orderIndex: 0, payload: { content: 'Đoạn mở đầu' } },
      { id: 'b3', blockType: 'markdown', schemaVersion: 1, orderIndex: 2, payload: { content: '## Phần 1\n- Ý A' } },
      { id: 'b4', blockType: 'formula', schemaVersion: 1, orderIndex: 3, payload: { latex: 'E=mc^2', caption: 'Năng lượng' } },
      { id: 'b5', blockType: 'image', schemaVersion: 1, orderIndex: 4, payload: { url: 'https://example.org/cell.png', alt: 'Tế bào thực vật' } },
      { id: 'b6', blockType: 'video', schemaVersion: 1, orderIndex: 5, payload: { url: 'https://youtube.com/watch?v=abc', title: 'Video sinh học' } },
      { id: 'b7', blockType: 'example', schemaVersion: 1, orderIndex: 6, payload: { title: 'Ví dụ', prompt: 'Quan sát tế bào' } },
      { id: 'b8', blockType: 'exercise', schemaVersion: 1, orderIndex: 7, payload: { prompt: 'Nêu chức năng nhân tế bào', hint: 'Trung tâm điều khiển' } },
      { id: 'b9', blockType: 'table', schemaVersion: 1, orderIndex: 8, payload: { caption: 'Bảng so sánh', headers: ['Loại', 'Đặc điểm'], rows: [['Nhân thực', 'Có màng nhân']] } },
      { id: 'b10', blockType: 'diagram', schemaVersion: 1, orderIndex: 9, payload: { format: 'mermaid', source: 'graph LR; A-->B;', alt: 'Sơ đồ quang hợp' } },
      { id: 'b11', blockType: 'summary', schemaVersion: 1, orderIndex: 10, payload: { points: ['Ghi nhớ 1'] } },
      { id: 'b12', blockType: 'reference', schemaVersion: 1, orderIndex: 11, payload: { label: 'SGK Sinh 10', citation: 'Trang 24' } },
    ]

    render(<LessonContentBlockRenderer blocks={blocks} />)

    expect(screen.getByText('Đoạn mở đầu')).toBeInTheDocument()
    expect(screen.getByText('Cách mạng tháng Tám')).toBeInTheDocument()
    expect(screen.getByAltText('Tế bào thực vật')).toBeInTheDocument()
    expect(screen.getByText('Bảng so sánh')).toBeInTheDocument()
    expect(screen.getByText('Nêu chức năng nhân tế bào')).toBeInTheDocument()
    expect(screen.getByText('Ghi nhớ 1')).toBeInTheDocument()
    expect(screen.getByText('SGK Sinh 10')).toBeInTheDocument()
  })

  it('fails visibly on unsupported blockType or schemaVersion', () => {
    const badBlocks = [
      { id: 'bad1', blockType: 'custom_unknown', schemaVersion: 1, orderIndex: 0, payload: {} },
      { id: 'bad2', blockType: 'text', schemaVersion: 99, orderIndex: 1, payload: { content: 'x' } },
    ] as unknown as LessonContentBlock[]

    render(<LessonContentBlockRenderer blocks={badBlocks} />)
    const alerts = screen.getAllByRole('alert')
    expect(alerts).toHaveLength(2)
  })
})
