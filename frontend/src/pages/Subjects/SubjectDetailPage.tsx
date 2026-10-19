import { CheckCircle2, ChevronRight, Lock, Play } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { PageErrorState } from '@/components/ui/PageErrorState'
import { Progress } from '@/components/ui/Progress'
import { Skeleton } from '@/components/ui/Skeleton'
import { useSubjectDetail } from '@/hooks/useSubjects'
import './SubjectDetailPage.css'

export function SubjectDetailPage() {
  const { subjectId } = useParams<{ subjectId: string }>()
  const navigate = useNavigate()
  const { subject, isLoading, error, reload } = useSubjectDetail(subjectId)

  if (isLoading) {
    return (
      <div className="subject-detail-root">
        <Skeleton variant="text" width={220} height={16} />
        <div className="subject-detail-header-skeleton">
          <Skeleton variant="rect" width="100%" height={140} />
        </div>
        <div className="chapter-skeleton">
          <Skeleton variant="text" width="40%" height={24} />
          <Skeleton variant="rect" width="100%" height={180} />
        </div>
      </div>
    )
  }

  if (error || !subject) {
    return (
      <div className="subject-detail-root">
        <Breadcrumb items={[{ label: 'Môn học', to: '/subjects' }, { label: 'Chi tiết' }]} />
        <PageErrorState description={error || 'Không tìm thấy môn học'} onRetry={reload} />
      </div>
    )
  }

  // Find the current active lesson to continue
  let currentLessonToContinue = { courseId: 'math-12', lessonId: 'lesson-math-08' }
  for (const chap of subject.chapters) {
    const inProg = chap.lessons.find((l) => l.status === 'in-progress')
    if (inProg) {
      currentLessonToContinue = { courseId: inProg.courseId, lessonId: inProg.id }
      break
    }
  }

  return (
    <div className="subject-detail-root">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Môn học', to: '/subjects' },
          { label: subject.name },
        ]}
      />

      {/* Header Banner */}
      <div className="subject-header-card">
        <div className="subject-header-main">
          <div
            className="subject-large-icon"
            style={{ backgroundColor: subject.bgColor, color: subject.color }}
            aria-hidden
          >
            {subject.icon}
          </div>

          <div className="subject-header-text">
            <div className="subject-grade-tag">{subject.grade} · {subject.teacherName}</div>
            <h1 className="subject-title">{subject.name}</h1>
            <p className="subject-subtitle">{subject.description}</p>
          </div>
        </div>

        <div className="subject-header-stats">
          <div className="progress-stat-row">
            <div className="stat-item">
              <span className="stat-label">Tiến độ hoàn thành</span>
              <span className="stat-val">{subject.progress}%</span>
            </div>
            <div className="stat-item text-right">
              <span className="stat-label">Số bài học</span>
              <span className="stat-val">{subject.completedLessons} / {subject.totalLessons}</span>
            </div>
          </div>

          <Progress value={subject.progress} height={8} />

          <div className="subject-cta-wrap">
            <Button
              variant="primary"
              icon={Play}
              onClick={() =>
                navigate(
                  `/learn/${currentLessonToContinue.courseId}/${currentLessonToContinue.lessonId}`
                )
              }
            >
              Tiếp tục bài học
            </Button>
          </div>
        </div>
      </div>

      {/* Chapter List */}
      <div className="chapters-container">
        {subject.chapters.length === 0 ? (
          <div className="empty-chapters-msg">
            Chưa có danh sách bài giảng được công bố cho môn học này.
          </div>
        ) : (
          subject.chapters.map((chapter) => (
            <section key={chapter.id} className="chapter-section">
              <div className="chapter-header">
                <h2 className="chapter-title">{chapter.title}</h2>
                {chapter.description && (
                  <p className="chapter-desc">{chapter.description}</p>
                )}
              </div>

              {/* Evondev list-row container with dividers */}
              <div className="lesson-list-container">
                {chapter.lessons.map((lesson) => {
                  const isLocked = lesson.status === 'locked'
                  const isCompleted = lesson.status === 'completed'
                  const isInProgress = lesson.status === 'in-progress'

                  return (
                    <div
                      key={lesson.id}
                      className={`lesson-list-row ${isLocked ? 'is-locked' : ''} ${isInProgress ? 'is-active' : ''}`}
                    >
                      {/* Status Icon */}
                      <div className="lesson-status-col" aria-hidden>
                        {isCompleted && <CheckCircle2 size={18} className="status-icon completed" />}
                        {isInProgress && <Play size={16} className="status-icon in-progress" />}
                        {lesson.status === 'available' && <div className="status-dot available" />}
                        {isLocked && <Lock size={16} className="status-icon locked" />}
                      </div>

                      {/* Title and duration */}
                      <div className="lesson-info-col">
                        <Link
                          to={isLocked ? '#' : `/learn/${lesson.courseId}/${lesson.id}`}
                          className={`lesson-title-link ${isLocked ? 'disabled' : ''}`}
                          tabIndex={isLocked ? -1 : 0}
                        >
                          {lesson.title}
                        </Link>
                        <span className="lesson-duration">{lesson.durationMinutes} phút</span>
                      </div>

                      {/* Action */}
                      <div className="lesson-action-col">
                        {isLocked ? (
                          <span className="locked-label">Khóa</span>
                        ) : (
                          <Link
                            to={`/learn/${lesson.courseId}/${lesson.id}`}
                            className="lesson-open-btn"
                            aria-label={`Mở bài học: ${lesson.title}`}
                          >
                            <span className="action-text">
                              {isCompleted ? 'Ôn lại' : isInProgress ? 'Học tiếp' : 'Bắt đầu'}
                            </span>
                            <ChevronRight size={16} aria-hidden />
                          </Link>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  )
}

export default SubjectDetailPage
