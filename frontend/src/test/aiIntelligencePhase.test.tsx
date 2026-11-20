import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { PracticeQuestionCard } from '@/components/practice/PracticeQuestionCard'
import { AdminSettingsPage } from '@/pages/Admin/AdminSettingsPage'
import { aiTutorService } from '@/services/aiTutor.service'
import type { MultipleChoiceQuestion } from '@/types/questionBank'

const mockQuestion: MultipleChoiceQuestion = {
  id: 'q-101',
  subjectId: 'toan-hoc',
  chapterId: 'c-1',
  lessonId: 'l-1',
  skillIds: ['SKILL-DERIV-01'],
  type: 'multiple_choice',
  difficulty: 'medium',
  cognitiveLevel: 'comprehension',
  stem: 'Tìm các khoảng đồng biến của hàm số $y = x^3 - 3x^2 + 2$',
  explanation: 'Đạo hàm $y\' = 3x^2 - 6x = 3x(x - 2)$. $y\' > 0 \\iff x \\in (-\\infty; 0) \\cup (2; +\\infty)$.',
  options: [
    { id: 'A', text: '$(-\\infty; 0)$ và $(2; +\\infty)$' },
    { id: 'B', text: '$(0; 2)$' },
    { id: 'C', text: '$(-\\infty; 2)$' },
    { id: 'D', text: '$(0; +\\infty)$' },
  ],
  correctAnswer: 'A',
  reviewStatus: 'approved',
  createdAt: '2026-11-15T00:00:00Z',
  updatedAt: '2026-11-15T00:00:00Z',
}

describe('Phase AI-01: AI Intelligence Frontend Components', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  describe('PracticeQuestionCard AI Hint Ladder', () => {
    it('renders AI Hint toggle button in practice mode', () => {
      render(
        <MemoryRouter>
          <PracticeQuestionCard
            question={mockQuestion}
            index={0}
            totalCount={1}
            onAnswerChange={vi.fn()}
            mode="practice"
            sessionId="test-session-1"
          />
        </MemoryRouter>
      )

      const hintBtn = screen.getByRole('button', { name: /Gợi ý Socratic \(AI Hint\)/i })
      expect(hintBtn).toBeInTheDocument()
    })

    it('hides AI Hint button in exam mode to ensure integrity', () => {
      render(
        <MemoryRouter>
          <PracticeQuestionCard
            question={mockQuestion}
            index={0}
            totalCount={1}
            onAnswerChange={vi.fn()}
            mode="exam"
            sessionId="test-session-2"
          />
        </MemoryRouter>
      )

      const hintBtn = screen.queryByRole('button', { name: /Gợi ý Socratic \(AI Hint\)/i })
      expect(hintBtn).toBeNull()
    })

    it('fetches and displays 3-level hints when hint drawer is opened', async () => {
      vi.spyOn(aiTutorService, 'getHintLadder').mockResolvedValue({
        questionId: 'q-101',
        hintLevel: 1,
        hintLevelName: 'Gợi ý Cấp 1: Định hướng & Khái niệm',
        hintText: 'Nhớ lại định lý về dấu của đạo hàm bậc nhất.',
        mathFormulas: ["y' = f'(x)"],
        suggestedNextSteps: ['Tính đạo hàm y\'', 'Lập bảng xét dấu y\''],
      })

      render(
        <MemoryRouter>
          <PracticeQuestionCard
            question={mockQuestion}
            index={0}
            totalCount={1}
            onAnswerChange={vi.fn()}
            mode="practice"
            sessionId="test-session-1"
          />
        </MemoryRouter>
      )

      const hintBtn = screen.getByRole('button', { name: /Gợi ý Socratic \(AI Hint\)/i })
      fireEvent.click(hintBtn)

      await waitFor(() => {
        expect(aiTutorService.getHintLadder).toHaveBeenCalledWith('q-101', 1, undefined, 'test-session-1', 'practice')
      })

      expect(await screen.findByText(/Gợi ý Cấp 1: Định hướng & Khái niệm/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Cấp 1: Định hướng/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Cấp 2: Phương pháp/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Cấp 3: Bước then chốt/i })).toBeInTheDocument()
      expect(screen.getByText(/Tính đạo hàm y'/i)).toBeInTheDocument()
    })
  })

  describe('AdminSettingsPage AI Operations Section F', () => {
    it('renders Section F AI Operations with toggles and status', async () => {
      vi.spyOn(aiTutorService, 'getAdminAiStatus').mockResolvedValue({
        enableTutor: true,
        enableHints: true,
        enableErrorAnalysis: true,
        enableLearningPath: true,
        providerName: 'MockPedagogicalEngine',
        modelName: 'deepseek-chat',
        isConfigured: true,
        maxDailyTokensPerUser: 50000,
      })

      vi.spyOn(aiTutorService, 'getAdminAiStats').mockResolvedValue({
        totalRequests: 1420,
        totalInputTokens: 75000,
        totalOutputTokens: 50000,
        estimatedTotalCostUsd: 0.05,
        averageLatencyMs: 18,
        successCount: 1400,
        errorCount: 20,
        featureBreakdown: { hints: 320, error_analysis: 110 },
        modelBreakdown: { 'deepseek-chat': 1420 },
      })

      render(
        <MemoryRouter>
          <AdminSettingsPage />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText(/Quản trị & Giám sát Trí tuệ Nhân tạo/i)).toBeInTheDocument()
      })

      expect(screen.getByText(/MockPedagogicalEngine/i)).toBeInTheDocument()
      expect(screen.getByText('1420')).toBeInTheDocument()
      expect(screen.getByText('$0.0500')).toBeInTheDocument()
    })
  })
})
