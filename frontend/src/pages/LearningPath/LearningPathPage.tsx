import { useState } from 'react'
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  FileQuestion,
  Play,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { SubjectLearningPathSection } from '@/components/subjects/SubjectLearningPathSection'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { PageErrorState } from '@/components/ui/PageErrorState'
import { Skeleton } from '@/components/ui/Skeleton'
import { useLearningPath } from '@/hooks/useLearningPath'
import { usePersonalization } from '@/hooks/usePersonalization'
import './LearningPathPage.css'

export function LearningPathPage() {
  const navigate = useNavigate()
  const { learningPath, isLoading, error, reload } = useLearningPath()
  const { data: personalizationData, loading: isPersonalizationLoading } = usePersonalization()

  const [activeMode, setActiveMode] = useState<'adaptive' | 'curriculum'>('adaptive')

  if (isLoading || isPersonalizationLoading) {
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

  const hasPracticeData = Boolean(personalizationData?.hasData && personalizationData?.learningPath.steps.length > 0)
  const adaptivePath = personalizationData?.learningPath

  return (
    <div className="learning-path-root">
      {/* Breadcrumb */}
      <Breadcrumb items={[{ label: 'Lộ trình học tập' }]} />

      {/* Mode Switcher */}
      <div className="path-mode-switcher" style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <Button
          variant={activeMode === 'adaptive' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setActiveMode('adaptive')}
        >
          <Compass size={15} aria-hidden /> Lộ trình thích ứng cá nhân (Thực chứng)
        </Button>
        <Button
          variant={activeMode === 'curriculum' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setActiveMode('curriculum')}
        >
          <BookOpen size={15} aria-hidden /> Khung chương trình GDPT 2018
        </Button>
      </div>

      {activeMode === 'adaptive' ? (
        /* ADAPTIVE LEARNING PATH (Phase 13 Engine) */
        hasPracticeData && adaptivePath ? (
          <div className="adaptive-path-container" data-testid="adaptive-path-view">
            {/* Header Banner */}
            <header className="path-header-card">
              <div className="path-header-main">
                <div className="path-target-badge">
                  <Compass size={14} aria-hidden />
                  <span>LỘ TRÌNH CÁ NHÂN HÓA THỰC CHỨNG</span>
                </div>
                <h1 className="path-title">Lộ trình ôn luyện điều chỉnh theo năng lực thực tế</h1>
                <p className="path-days-left">
                  {adaptivePath.explanation}
                </p>
              </div>

              <div className="path-header-stats">
                <div className="path-stat-row">
                  <span className="path-stat-label">Lượt làm bài</span>
                  <span className="path-stat-value">{personalizationData?.summary.totalSessions} bài</span>
                </div>
                <div className="path-stat-row">
                  <span className="path-stat-label">Tỷ lệ điểm quan sát</span>
                  <span className="path-stat-value">{Math.round((personalizationData?.summary.overallScoreRatio || 0) * 100)}%</span>
                </div>
                <div className="path-stat-row">
                  <span className="path-stat-label">Lỗ hổng cần khắc phục</span>
                  <span className="path-stat-value">{personalizationData?.summary.knowledgeGapsCount} mục</span>
                </div>
              </div>
            </header>

            {/* Steps Timeline */}
            <section className="path-roadmap-section">
              <h2 className="roadmap-heading">Các bước học tập thích ứng được đề xuất</h2>

              <div className="stages-timeline">
                {adaptivePath.steps.map((step) => (
                  <div key={step.id} className="stage-timeline-card is-current">
                    <div className="stage-marker" aria-hidden>
                      <span className="marker-num">{step.stepNumber}</span>
                    </div>

                    <div className="stage-content-box">
                      <div className="stage-top-row">
                        <div className="stage-num-label">Bước {step.stepNumber}</div>
                        <div className="stage-status-badge">
                          <span className="badge-active">{step.badgeText || 'Đề xuất'}</span>
                        </div>
                      </div>

                      <h3 className="stage-name">{step.title}</h3>
                      <p style={{ margin: '4px 0 8px', fontSize: '0.9rem', color: '#334e68' }}>
                        <strong>Mục tiêu:</strong> {step.objective}
                      </p>
                      <p style={{ margin: '0 0 12px', fontSize: '0.85rem', color: '#627d98', fontStyle: 'italic' }}>
                        Lý do: {step.reason}
                      </p>

                      <div className="stage-action-wrap">
                        <Button
                          variant="primary"
                          icon={Play}
                          onClick={() => navigate(step.targetRoute)}
                        >
                          Bắt đầu bước này
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : (
          /* Empty State */
          <div
            className="p-empty-state-card"
            data-testid="adaptive-path-empty-state"
            style={{
              background: '#ffffff',
              border: '1px dashed #bcccdc',
              borderRadius: '8px',
              padding: '48px 24px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
              maxWidth: '640px',
              margin: '32px auto',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: '#f0f4f8',
                color: '#102a43',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileQuestion size={28} aria-hidden />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#102a43', margin: 0 }}>
              Chưa có đủ kết quả đánh giá
            </h2>
            <p style={{ fontSize: '0.95rem', color: '#486581', lineHeight: 1.5, margin: 0, maxWidth: '480px' }}>
              Bạn chưa có đủ kết quả đánh giá để tạo lộ trình cá nhân hóa. Hãy hoàn thành một bài luyện tập để bắt đầu.
            </p>
            <Button variant="primary" onClick={() => navigate('/practice')}>
              <Play size={16} aria-hidden /> Đến trang Luyện tập & Thi
            </Button>
          </div>
        )
      ) : (
        /* CURRICULUM ROADMAP VIEW */
        <div className="curriculum-roadmap-container">
          <header className="path-header-card">
            <div className="path-header-main">
              <div className="path-target-badge">
                <Calendar size={14} aria-hidden />
                <span>Mục tiêu: {learningPath.targetExam}</span>
              </div>
              <h1 className="path-title">{learningPath.goalTitle}</h1>
              <p className="path-days-left">
                Khung phân phối chương trình chính thức Toán 12 — Kết nối tri thức với cuộc sống
              </p>
            </div>
          </header>

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
                    <div className="stage-marker" aria-hidden>
                      {isCompleted && <CheckCircle2 size={20} className="marker-completed" />}
                      {isCurrent && <Play size={16} className="marker-current" />}
                      {isUpcoming && <span className="marker-num">{stage.orderNumber}</span>}
                    </div>

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

          <SubjectLearningPathSection />
        </div>
      )}
    </div>
  )
}

export default LearningPathPage
