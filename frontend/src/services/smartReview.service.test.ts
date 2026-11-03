import { describe, it, expect, beforeEach } from 'vitest';
import { smartReviewService } from './smartReview.service';
import { knowledgeGapsService } from './knowledgeGaps.service';
import type { KnowledgeGap } from '../types/knowledgeGaps';

describe('smartReviewService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const mockGap: KnowledgeGap = {
    id: 'gap-test-1',
    knowledgePointId: 'kp-test-derivatives',
    title: 'Đạo hàm hàm số hợp',
    subjectId: 'toan-hoc',
    subjectName: 'Toán học',
    lessonId: 'les-math-12-01',
    lessonTitle: 'Đạo hàm và Khảo sát đồ thị',
    sectionId: 'section-2',
    sectionTitle: 'Quy tắc chuỗi và đạo hàm hàm hợp',
    questionPrompt: 'Đạo hàm của ln(x^2 + 1) là gì?',
    explanation: "Sử dụng công thức đạo hàm hàm hợp: (ln u)' = u' / u",
    wrongAttemptsCount: 2,
    correctReviewCount: 0,
    severity: 'medium',
    status: 'needs-review',
    source: 'assessment_attempt',
    lastDetectedAt: '2026-11-01T10:00:00Z',
    createdAt: '2026-11-01T10:00:00Z',
    updatedAt: '2026-11-02T10:00:00Z',
    sourceAttemptId: 'att-123',
  };

  it('syncs review items from knowledge gaps when initializing', () => {
    knowledgeGapsService.saveGap(mockGap);
    const items = smartReviewService.getAllItems();
    expect(items.length).toBe(1);
    expect(items[0].gapId).toBe(mockGap.id);
    expect(items[0].intervalDays).toBe(1);
    expect(items[0].reviewCount).toBe(0);
  });

  it('calculates due status correctly based on date', () => {
    knowledgeGapsService.saveGap(mockGap);
    const summary = smartReviewService.getSummary();
    expect(summary.totalItems).toBe(1);
    // Newly created item scheduled for today is due
    expect(summary.dueTodayCount).toBe(1);
  });

  it('adjusts spaced repetition interval when rating item', () => {
    knowledgeGapsService.saveGap(mockGap);
    const item = smartReviewService.getAllItems()[0];

    // Case 1: unremembered resets to 1 day
    const res1 = smartReviewService.recordReviewRating(item.id, 'unremembered');
    expect(res1?.item.intervalDays).toBe(1);
    expect(res1?.nextGapStatus).toBe('needs-review');

    // Case 2: well-remembered advances to next interval [1, 3, 7, 14, 30] -> 3
    const res2 = smartReviewService.recordReviewRating(item.id, 'well-remembered');
    expect(res2?.item.intervalDays).toBe(3);

    // Case 3: well-remembered again -> 7
    const res3 = smartReviewService.recordReviewRating(item.id, 'well-remembered');
    expect(res3?.item.intervalDays).toBe(7);

    // Case 4: partially-remembered keeps conservative interval (round(7 * 1.5) = 11)
    const res4 = smartReviewService.recordReviewRating(item.id, 'partially-remembered');
    expect(res4?.item.intervalDays).toBeGreaterThan(7);
  });

  it('manages review session lifecycle correctly', () => {
    knowledgeGapsService.saveGap(mockGap);
    const session = smartReviewService.startSession();
    expect(session).not.toBeNull();
    expect(session?.items.length).toBe(1);
    expect(session?.currentIndex).toBe(0);
    expect(session?.status).toBe('active');

    const active = smartReviewService.getActiveSession();
    expect(active).not.toBeNull();
    expect(active?.id).toBe(session.id);

    smartReviewService.clearActiveSession();
    expect(smartReviewService.getActiveSession()).toBeNull();
  });
});
