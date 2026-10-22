import { ArrowRight, Calendar, CheckCircle2, Clock, Play, Sparkles } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { PageErrorState } from '@/components/ui/PageErrorState'
import { Progress } from '@/components/ui/Progress'
import { Skeleton } from '@/components/ui/Skeleton'
import { useLearningPath } from '@/hooks/useLearningPath'
import './LearningPathPage.css'

export function LearningPathPage() {
  const navigate = useNavigate()
  const { learningPath, isLoading, error, reload } = useLearningPath()

  if (isLoading) {
    return (
      <div className="learning-path-root">
        <Skeleton variant="text" width={200} height={16} />
        <Skeleton variant="rect" width="100%" height={140} />
        <Skeleton variant="rect" width="100%" height={300} />
      </div>
    )
  }

  if (error || !learningPath) {
    return (
      <div className="learning-path-root">
        <Breadcrumb items={[{ label: 'Lộ trình cá nhân' }]} />
        <PageErrorState description={error || 'Không tìm thấy lộ trình'} onRetry={reload} />
      </div>
    )
  }

  return (
    <div className="learning-path-root">
      {/* Breadcrumb */}
      <Breadcrumb items={[{ label: 'Lộ trình học tập' }]} />

      {/* Header Banner */}
      <header className="path-header-card">
        <div className="path-header-main">
          <div className="path-target-badge">
            <Calendar size={14} aria-hidden />
            <span>Mục tiêu: {learningPath.targetExam}</span>
          </div>
          <h1 className="path-title">{learningPath.goalTitle}</h1>
          <p className="path-days-left">
            Thời gian còn lại: <strong>{learningPath.daysRemaining} ngày</strong> tới kỳ thi chính thức
          </p>
        </div>

        <div className="path-header-stats">
          <div className="path-stat-row">
            <span className="path-stat-label">Tiến độ lộ trình</span>
            <span className="path-stat-value">{learningPath.overallProgress}%</span>
          </div>
          <Progress value={learningPath.overallProgress} height={8} />
          <div className="path-streak-text">
            Chuỗi học liên tục: <strong>{learningPath.currentStreak} ngày 🔥</strong>
          </div>
        </div>
      </header>

      {/* AI Tutor Suggestion Section (Section 24) */}
      <section className="path-ai-suggestion-box" aria-label="Gợi ý từ AI Tutor">
        <div className="ai-suggestion-icon" aria-hidden>
          <Sparkles size={18} />
        </div>

        <div className="ai-suggestion-content">
          <div className="ai-suggestion-title-row">
            <span className="ai-suggestion-tag">GỢI Ý TỪ AI TUTOR</span>
            <span className="ai-suggestion-topic">{learningPath.aiSuggestion.topic}</span>
          </div>
          <p className="ai-suggestion-reason">{learningPath.aiSuggestion.reason}</p>
        </div>

        <div className="ai-suggestion-action">
          <Button
            variant="outline"
            icon={ArrowRight}
            onClick={() => navigate(learningPath.aiSuggestion.actionUrl)}
          >
            {learningPath.aiSuggestion.actionLabel}
          </Button>
        </div>
      </section>

      {/* Roadmap Stages */}
      <section className="path-roadmap-section">
        <h2 className="roadmap-heading">Chặng đường ôn luyện chi tiết</h2>

        <div className="stages-timeline">
          {learningPath.stages.map((stage) => {
            const isCompleted = stage.status === 'completed'
            const isCurrent = stage.status === 'current'
            const isUpcoming = stage.status === 'upcoming'

            return (
              <div
                key={stage.id}
                className={`stage-timeline-card ${isCurrent ? 'is-current' : ''} ${isCompleted ? 'is-completed' : ''}`}
              >
                {/* Timeline connector circle */}
                <div className="stage-marker" aria-hidden>
                  {isCompleted && <CheckCircle2 size={20} className="marker-completed" />}
                  {isCurrent && <Play size={16} className="marker-current" />}
                  {isUpcoming && <span className="marker-num">{stage.orderNumber}</span>}
                </div>

                {/* Stage Content */}
                <div className="stage-content-box">
                  <div className="stage-top-row">
                    <div className="stage-num-label">Giai đoạn {stage.orderNumber}</div>
                    <div className="stage-status-badge">
                      {isCompleted && <span className="badge-done">Hoàn thành</span>}
                      {isCurrent && <span className="badge-active">Đang học · {stage.progress}%</span>}
                      {isUpcoming && <span className="badge-locked">Sắp tới</span>}
                    </div>
                  </div>

                  <h3 className="stage-name">{stage.title}</h3>

                  <div className="stage-topics-list">
                    {stage.keyTopics.map((topic, tIdx) => (
                      <span key={tIdx} className="stage-topic-chip">
                        {topic}
                      </span>
                    ))}
                  </div>

                  <div className="stage-metrics-row">
                    <span className="metric-text">
                      <Clock size={13} aria-hidden /> {stage.estimatedHours} giờ học
                    </span>
                    <span className="metric-text">
                      {stage.completedLessons} / {stage.totalLessons} bài học
                    </span>
                  </div>

                  {isCurrent && stage.primaryCourseId && stage.primaryLessonId && (
                    <div className="stage-action-wrap">
                      <Link
                        to={`/subjects/${stage.primaryCourseId.startsWith('math') ? 'math' : stage.primaryCourseId.startsWith('phy') ? 'physics' : stage.primaryCourseId.startsWith('chem') ? 'chemistry' : 'english'}/lessons/${stage.primaryLessonId}`}
                      >
                        <Button variant="primary" icon={Play}>
                          Học tiếp giai đoạn này
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

export default LearningPathPage
