import React, { useEffect, useState } from 'react'
import {
  Database,
  FileQuestion,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { QuestionBankFilterBar } from '@/components/question-bank/QuestionBankFilterBar'
import { QuestionItemView } from '@/components/question-bank/QuestionItemView'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { SummaryStrip } from '@/components/ui/SummaryStrip'
import { learningContextService } from '@/services/learningContext.service'
import { questionBankService } from '@/services/questionBank.service'
import type {
  QuestionBankStats,
  QuestionFilterCriteria,
  QuestionItem,
} from '@/types/questionBank'
import './QuestionBankPage.css'

export const QuestionBankPage: React.FC = () => {
  const navigate = useNavigate()
  const [questions, setQuestions] = useState<QuestionItem[]>([])
  const [filteredQuestions, setFilteredQuestions] = useState<QuestionItem[]>([])
  const [stats, setStats] = useState<QuestionBankStats | null>(null)
  const [loading, setLoading] = useState(true)

  const [criteria, setCriteria] = useState<QuestionFilterCriteria>({
    subjectId: 'math',
    reviewStatus: 'all',
  })

  useEffect(() => {
    let isMounted = true
    const fetchData = async () => {
      setLoading(true)
      try {
        const [all, st] = await Promise.all([
          questionBankService.getAllQuestions(),
          questionBankService.getStats(),
        ])
        if (isMounted) {
          setQuestions(all)
          setStats(st)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }
    fetchData()
    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    const applyFilter = async () => {
      const result = await questionBankService.filterQuestions(criteria)
      setFilteredQuestions(result)
    }
    applyFilter()
  }, [criteria])

  const handleResetFilter = () => {
    setCriteria({
      subjectId: 'math',
      reviewStatus: 'all',
      search: '',
    })
  }

  const handleAskAIContext = (q: QuestionItem) => {
    learningContextService.setContext({
      source: 'assessment-question',
      title: `Câu hỏi ${q.id}`,
      subjectId: q.subjectId,
      subjectName: 'Toán học',
      lessonId: q.lessonId,
      lessonTitle: 'Toán 12 — Khảo sát hàm số',
      sectionId: q.id,
      sectionTitle: `Câu hỏi: ${q.id}`,
      excerpt: q.stem,
      returnUrl: '/question-bank',
    })
    navigate('/ai-tutor')
  }

  return (
    <div className="qb-page-root">
      {/* Breadcrumb & Navigation */}
      <div className="qb-page-header-row">
        <Breadcrumb
          items={[
            { label: 'Học tập', to: '/dashboard' },
            { label: 'Môn Toán 12', to: '/subjects/math' },
            { label: 'Ngân hàng câu hỏi chuẩn GDPT 2018' },
          ]}
        />
      </div>

      {/* Main Hero Header */}
      <div className="qb-hero-card">
        <div className="qb-hero-content">
          <div className="qb-hero-badge">
            <Database size={14} aria-hidden />
            <span>NGÂN HÀNG CÂU HỎI TOÁN 12 GDPT 2018</span>
          </div>
          <h1 className="qb-hero-title">Kho câu hỏi kiểm chứng · Chương 1: Đạo hàm & Khảo sát đồ thị</h1>
          <p className="qb-hero-desc">
            Tuyển tập 22 câu hỏi chuẩn hóa sư phạm bao gồm 3 dạng: Trắc nghiệm 4 lựa chọn (MCQ), Trắc nghiệm
            Đúng/Sai theo cụm 4 ý và Trả lời ngắn số học. Toàn bộ câu hỏi được gắn mã kỹ năng năng lực và lời
            giải KaTeX chi tiết từng bước.
          </p>
        </div>
      </div>

      {/* Summary KPI Strip */}
      {stats && (
        <div className="qb-summary-strip-wrap">
          <SummaryStrip
            items={[
              {
                id: 'kpi-total',
                label: 'Tổng số câu hỏi',
                value: stats.total,
                color: '#102a43',
              },
              {
                id: 'kpi-approved',
                label: 'Đã duyệt (Approved)',
                value: stats.approvedCount,
                color: '#16a34a',
              },
              {
                id: 'kpi-review',
                label: 'Chờ duyệt chuyên môn',
                value: stats.needsReviewCount,
                color: '#d97706',
              },
              {
                id: 'kpi-mcq',
                label: 'Trắc nghiệm MCQ (A,B,C,D)',
                value: stats.byType.multiple_choice,
                color: '#0284c7',
              },
              {
                id: 'kpi-tfg',
                label: 'Đúng/Sai theo cụm (4 ý)',
                value: stats.byType.true_false_group,
                color: '#059669',
              },
              {
                id: 'kpi-sa',
                label: 'Trả lời ngắn (Số/Chuẩn)',
                value: stats.byType.short_answer,
                color: '#b45309',
              },
            ]}
          />
        </div>
      )}

      {/* Filter and Search Bar */}
      <QuestionBankFilterBar
        criteria={criteria}
        onChangeCriteria={setCriteria}
        onReset={handleResetFilter}
        totalCount={questions.length}
        filteredCount={filteredQuestions.length}
      />

      {/* Question Items Listing */}
      <div className="qb-items-listing-container">
        {loading ? (
          <div className="qb-skeleton-list">
            <Skeleton variant="rect" width="100%" height={160} />
            <Skeleton variant="rect" width="100%" height={160} />
            <Skeleton variant="rect" width="100%" height={160} />
          </div>
        ) : filteredQuestions.length === 0 ? (
          <EmptyState
            title="Không tìm thấy câu hỏi phù hợp"
            description="Hãy thử thay đổi từ khóa tìm kiếm hoặc đặt lại các bộ lọc dạng câu hỏi và độ khó."
            icon={FileQuestion}
            actionLabel="Đặt lại bộ lọc"
            onAction={handleResetFilter}
          />
        ) : (
          filteredQuestions.map((q, idx) => (
            <QuestionItemView
              key={q.id}
              question={q}
              index={idx}
              onAskAI={handleAskAIContext}
            />
          ))
        )}
      </div>
    </div>
  )
}

export default QuestionBankPage
