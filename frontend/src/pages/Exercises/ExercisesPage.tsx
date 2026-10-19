import { useState } from 'react'
import { ArrowRight, Clock, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageErrorState } from '@/components/ui/PageErrorState'
import { Skeleton } from '@/components/ui/Skeleton'
import { useExercises } from '@/hooks/useSupporting'
import './ExercisesPage.css'

export function ExercisesPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'all' | 'in-progress' | 'completed'>('all')
  const [selectedSubject, setSelectedSubject] = useState<string>('all')

  const { exercises, isLoading, error, reload } = useExercises({
    status: activeTab,
    subjectId: selectedSubject,
  })

  const subjectOptions = [
    { id: 'all', label: 'Tất cả môn' },
    { id: 'math', label: 'Toán học' },
    { id: 'physics', label: 'Vật lý' },
    { id: 'chemistry', label: 'Hóa học' },
    { id: 'english', label: 'Tiếng Anh' },
  ]

  if (isLoading) {
    return (
      <div className="exercises-page-root">
        <Skeleton variant="text" width={200} height={28} />
        <div className="exercises-list">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} variant="rect" width="100%" height={80} />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="exercises-page-root">
        <Breadcrumb items={[{ label: 'Bài tập & Luyện đề' }]} />
        <PageErrorState description={error} onRetry={reload} />
      </div>
    )
  }

  return (
    <div className="exercises-page-root">
      <Breadcrumb items={[{ label: 'Bài tập & Luyện đề' }]} />

      <div className="page-header-row">
        <div>
          <h1 className="page-title">Ngân hàng bài tập</h1>
          <p className="page-subtitle">Luyện đề trắc nghiệm và củng cố kiến thức theo mức độ nhận thức</p>
        </div>
      </div>

      {/* Tabs and Subject Filters */}
      <div className="exercises-toolbar">
        <div className="exercises-tabs" role="tablist">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            Tất cả
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'in-progress' ? 'active' : ''}`}
            onClick={() => setActiveTab('in-progress')}
          >
            Đang làm
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            Đã hoàn thành
          </button>
        </div>

        <div className="subject-chips">
          {subjectOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`chip-btn ${selectedSubject === opt.id ? 'active' : ''}`}
              onClick={() => setSelectedSubject(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Exercise Rows List (evondev compact list-row pattern, not giant cards) */}
      {exercises.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Không tìm thấy bài tập nào"
          description="Chưa có bài tập nào trong phân loại hoặc bộ lọc hiện tại."
          actionLabel="Xem tất cả bài tập"
          onAction={() => {
            setActiveTab('all')
            setSelectedSubject('all')
          }}
        />
      ) : (
        <div className="exercises-list-container">
          {exercises.map((ex) => {
            const isCompleted = ex.status === 'completed'
            const isInProgress = ex.status === 'in-progress'

            return (
              <div key={ex.id} className="exercise-row-item">
                <div className="exercise-info-col">
                  <div className="exercise-meta-top">
                    <span className="ex-subject-name">{ex.subjectName}</span>
                    <span className="ex-dot">·</span>
                    <span className={`ex-difficulty ${ex.difficulty.toLowerCase().replace(/\s+/g, '-')}`}>
                      {ex.difficulty}
                    </span>
                  </div>

                  <h2 className="ex-title">{ex.title}</h2>

                  <div className="ex-meta-bottom">
                    <span className="ex-metric">
                      <Clock size={13} aria-hidden /> {ex.durationMinutes} phút
                    </span>
                    <span className="ex-metric">
                      {ex.completedQuestions} / {ex.totalQuestions} câu
                    </span>
                  </div>
                </div>

                <div className="exercise-action-col">
                  <Button
                    variant={isCompleted ? 'outline' : 'primary'}
                    icon={ArrowRight}
                    onClick={() => navigate(`/quiz/${ex.quizId}`)}
                  >
                    {isCompleted ? 'Làm lại' : isInProgress ? 'Tiếp tục' : 'Bắt đầu làm'}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ExercisesPage
