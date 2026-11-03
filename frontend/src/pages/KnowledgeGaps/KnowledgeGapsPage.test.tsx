import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import KnowledgeGapsPage from './KnowledgeGapsPage';
import { knowledgeGapsService } from '../../services/knowledgeGaps.service';
import type { KnowledgeGap } from '../../types/knowledgeGaps';

describe('KnowledgeGapsPage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const sampleGap: KnowledgeGap = {
    id: 'gap-test-geo-1',
    knowledgePointId: 'kp-geo-prism',
    title: 'Thể tích lăng trụ tam giác',
    subjectId: 'toan-hoc',
    subjectName: 'Toán học',
    lessonId: 'les-math-12-02',
    lessonTitle: 'Hình học không gian cổ điển',
    sectionId: 'section-volume',
    sectionTitle: 'Công thức lăng trụ đứng',
    questionPrompt: 'Cho lăng trụ ABC.A\'B\'C\', thể tích bằng?',
    explanation: 'Thể tích lăng trụ V = B * h (không chia 3 như chóp)',
    severity: 'low',
    source: 'assessment_attempt',
    wrongAttemptsCount: 1,
    correctReviewCount: 0,
    status: 'needs-review',
    lastDetectedAt: '2026-11-01T12:00:00Z',
    createdAt: '2026-11-01T12:00:00Z',
    updatedAt: '2026-11-01T12:00:00Z',
  };

  it('renders empty state when no gaps exist', () => {
    render(
      <MemoryRouter>
        <KnowledgeGapsPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Chưa phát hiện kiến thức cần củng cố!')).toBeInTheDocument();
  });

  it('renders gaps and statistics when data exists', () => {
    knowledgeGapsService.saveGap(sampleGap);

    render(
      <MemoryRouter>
        <KnowledgeGapsPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Thể tích lăng trụ tam giác')).toBeInTheDocument();
    expect(screen.getAllByText('Toán học').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Cần ôn/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Xem lại bài giảng')).toBeInTheDocument();
  });

  it('filters by search keyword', () => {
    knowledgeGapsService.saveGap(sampleGap);

    render(
      <MemoryRouter>
        <KnowledgeGapsPage />
      </MemoryRouter>
    );

    const searchInput = screen.getByPlaceholderText(/Tìm theo tên kiến thức/i);
    fireEvent.change(searchInput, { target: { value: 'Hóa học' } });

    expect(screen.queryByText('Thể tích lăng trụ tam giác')).not.toBeInTheDocument();
    expect(screen.getByText('Không tìm thấy kiến thức phù hợp với bộ lọc')).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'lăng trụ' } });
    expect(screen.getByText('Thể tích lăng trụ tam giác')).toBeInTheDocument();
  });
});
