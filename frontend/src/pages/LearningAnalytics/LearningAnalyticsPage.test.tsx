import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LearningAnalyticsPage from './LearningAnalyticsPage'
import { knowledgeGapsService } from '@/services/knowledgeGaps.service'
import type { KnowledgeGap } from '@/types/knowledgeGaps'

describe('LearningAnalyticsPage Component Suite', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders header, breadcrumb and 4 navigation tabs', () => {
    render(
      <MemoryRouter>
        <LearningAnalyticsPage />
      </MemoryRouter>
    )

    expect(screen.getAllByText('Phân tích học tập & Hồ sơ năng lực').length).toBeGreaterThan(0)
    expect(screen.getByRole('tab', { name: /Tổng quan & Hoạt động/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Hồ sơ năng lực/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Phân tích theo môn/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Lịch sử học tập/i })).toBeInTheDocument()
  })

  it('renders Overview tab with summary KPIs and Activity chart', () => {
    render(
      <MemoryRouter>
        <LearningAnalyticsPage />
      </MemoryRouter>
    )

    expect(screen.getByText('Bài hoàn thành')).toBeInTheDocument()
    expect(screen.getByText('Điểm thu hoạch TB')).toBeInTheDocument()
    expect(screen.getByText('Điểm cần củng cố')).toBeInTheDocument()
    expect(screen.getByText('Lượt ôn ngắt quãng')).toBeInTheDocument()
    expect(screen.getByText('Nhịp điệu học tập 7 ngày qua')).toBeInTheDocument()
  })

  it('switches to Competency Profile tab and renders educational notice & topic cards', () => {
    const sampleGap: KnowledgeGap = {
      id: 'gap-math-inflection',
      subjectId: 'math',
      subjectName: 'Toán học',
      lessonId: 'lesson-math-01',
      lessonTitle: 'Bài 01 · Đạo hàm',
      knowledgePointId: 'kp-inflection',
      title: 'Điểm uốn đồ thị bậc 3',
      severity: 'medium',
      source: 'assessment_attempt',
      wrongAttemptsCount: 2,
      correctReviewCount: 0,
      status: 'needs-review',
      lastDetectedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    knowledgeGapsService.saveGap(sampleGap)

    render(
      <MemoryRouter>
        <LearningAnalyticsPage />
      </MemoryRouter>
    )

    // Click Competency Tab
    fireEvent.click(screen.getByRole('tab', { name: /Hồ sơ năng lực/i }))

    expect(screen.getByText(/Hoàn thành đọc bài giảng không đồng nghĩa với đã nắm vững kiến thức/i)).toBeInTheDocument()
    expect(screen.getByText('Điểm uốn đồ thị bậc 3')).toBeInTheDocument()
    expect(screen.getAllByText(/Cần ôn/i).length).toBeGreaterThan(0)
  })

  it('switches to Subject Analytics tab and displays 4 subjects', () => {
    render(
      <MemoryRouter>
        <LearningAnalyticsPage />
      </MemoryRouter>
    )

    // Click Subjects Tab
    fireEvent.click(screen.getByRole('tab', { name: /Phân tích theo môn/i }))

    expect(screen.getByText('Toán học')).toBeInTheDocument()
    expect(screen.getByText('Vật lý')).toBeInTheDocument()
    expect(screen.getByText('Hóa học')).toBeInTheDocument()
    expect(screen.getByText('Tiếng Anh')).toBeInTheDocument()
  })

  it('switches to Learning History tab and displays timeline controls', () => {
    render(
      <MemoryRouter>
        <LearningAnalyticsPage />
      </MemoryRouter>
    )

    // Click History Tab
    fireEvent.click(screen.getByRole('tab', { name: /Lịch sử học tập/i }))

    expect(screen.getByText('Lọc sự kiện:')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bài thu hoạch' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ôn ngắt quãng' })).toBeInTheDocument()
  })
})

