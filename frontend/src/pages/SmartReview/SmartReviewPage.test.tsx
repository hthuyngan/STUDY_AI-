import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SmartReviewPage from './SmartReviewPage';
import { knowledgeGapsService } from '../../services/knowledgeGaps.service';
import type { KnowledgeGap } from '../../types/knowledgeGaps';

describe('SmartReviewPage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const sampleGap: KnowledgeGap = {
    id: 'gap-physics-1',
    knowledgePointId: 'kp-shm-phase',
    title: 'Pha ban đầu dao động điều hòa',
    subjectId: 'vat-ly',
    subjectName: 'Vật lý',
    lessonId: 'les-phys-12-01',
    lessonTitle: 'Dao động điều hòa đại cương',
    sectionId: 'sec-phase',
    sectionTitle: 'Ý nghĩa pha ban đầu phi',
    questionPrompt: 'Tại t = 0 vật qua VTCB theo chiều dương thì pha ban đầu bằng bao nhiêu?',
    explanation: 'Vật qua VTCB theo chiều dương có v > 0 nên sin(phi) < 0 => phi = -pi/2',
    severity: 'medium',
    source: 'assessment_attempt',
    wrongAttemptsCount: 2,
    correctReviewCount: 0,
    status: 'needs-review',
    lastDetectedAt: '2026-11-01T12:00:00Z',
    createdAt: '2026-11-01T12:00:00Z',
    updatedAt: '2026-11-02T12:00:00Z',
  };

  it('renders review dashboard and starts session when items are due', () => {
    knowledgeGapsService.saveGap(sampleGap);

    render(
      <MemoryRouter>
        <SmartReviewPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Ôn tập thông minh ngắt quãng')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Bắt đầu ôn tập/i })).toBeInTheDocument();

    // Start session
    fireEvent.click(screen.getByRole('button', { name: /Bắt đầu ôn tập/i }));

    // Should now see session flashcard
    expect(screen.getByText('Pha ban đầu dao động điều hòa')).toBeInTheDocument();
    expect(screen.getByText('Tại t = 0 vật qua VTCB theo chiều dương thì pha ban đầu bằng bao nhiêu?')).toBeInTheDocument();
    expect(screen.getByText('Xem giải thích & Đáp án')).toBeInTheDocument();

    // Reveal explanation
    fireEvent.click(screen.getByText('Xem giải thích & Đáp án'));
    expect(screen.getByText('Vật qua VTCB theo chiều dương có v > 0 nên sin(phi) < 0 => phi = -pi/2')).toBeInTheDocument();

    // Rate card
    expect(screen.getByText('Nhớ rất tốt')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Nhớ rất tốt'));

    // Should see session complete screen
    expect(screen.getByText(/Xuất sắc! Bạn đã hoàn thành phiên ôn tập!/i)).toBeInTheDocument();
    expect(screen.getByText('Về trang ôn tập')).toBeInTheDocument();
  });
});
