import { useState } from 'react'
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  Play,
  Sparkles,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Progress } from '@/components/ui/Progress'
import { useSubjectLearningPath } from '@/hooks/useSubjectLearningPath'
import './SubjectLearningPathSection.css'

export interface SubjectLearningPathSectionProps {
  initialSubjectId?: string
  showSubjectSelector?: boolean
}

const SUBJECT_OPTIONS = [
  { id: 'math', label: 'Toán học', icon: '∑' },
  { id: 'physics', label: 'Vật lý', icon: '⚛' },
  { id: 'chemistry', label: 'Hóa học', icon: '⚗' },
  { id: 'english', label: 'Tiếng Anh', icon: 'A' },
]

export function SubjectLearningPathSection({
  initialSubjectId = 'math',
  showSubjectSelector = true,
}: SubjectLearningPathSectionProps) {
  const [selectedSubjectId, setSelectedSubjectId] = useState(initialSubjectId)
  const navigate = useNavigate()
  const { path } = useSubjectLearningPath(selectedSubjectId)

  const handleOpenLesson = (lessonId: string, sectionId?: string) => {
    const target = `/subjects/${selectedSubjectId}/lessons/${lessonId}${
      sectionId ? `#${sectionId}` : ''
    }`
    navigate(target)
  }

  return (
    <section className="subject-path-section" aria-label="Lộ trình chi tiết theo môn">
      <div className="subject-path-section-header">
        <div>
          <h2 className="subject-path-title">Lộ trình học theo từng môn</h2>
          <p className="subject-path-desc">
            Sắp xếp bài học tuần tự theo giáo trình, tự động xác định bài học tối ưu nên tiếp tục.
          </p>
        </div>

        {showSubjectSelector && (
          <div className="subject-path-pill-selector" role="tablist">
            {SUBJECT_OPTIONS.map((subj) => (
              <button
                key={subj.id}
                type="button"
                role="tab"
                aria-selected={selectedSubjectId === subj.id}
                className={`subject-path-pill ${selectedSubjectId === subj.id ? 'active' : ''}`}
                onClick={() => setSelectedSubjectId(subj.id)}
              >
                <span className="subj-icon">{subj.icon}</span>
                <span>{subj.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Recommended Next Lesson Banner */}
      {path.recommendedLesson && !path.allCompleted ? (
        <div className="recommended-next-card">
          <div className="rec-badge-row">
            <span className="rec-badge">
              <Sparkles size={13} aria-hidden /> BÀI NÊN HỌC TIẾP
            </span>
            <span className="rec-chap-tag">{path.recommendedLesson.chapterTitle}</span>
          </div>

          <div className="rec-main-row">
            <div className="rec-info">
              <h3 className="rec-lesson-title">{path.recommendedLesson.title}</h3>
              <div className="rec-meta-row">
                <span className="rec-meta-item">
                  <Clock size={13} aria-hidden /> {path.recommendedLesson.durationMinutes} phút
                </span>
                <span className="rec-meta-item">
                  +{path.recommendedLesson.xp} XP
                </span>
                {path.recommendedLesson.progress > 0 && (
                  <span className="rec-meta-item progress">
                    Đang học dở: {path.recommendedLesson.progress}%
                  </span>
                )}
              </div>
            </div>

            <Button
              variant="primary"
              icon={Play}
              onClick={() =>
                handleOpenLesson(
                  path.recommendedLesson!.id,
                  path.recommendedLesson!.lastActiveSectionId
                )
              }
            >
              {path.recommendedLesson.progress > 0 ? 'Học tiếp bài này' : 'Bắt đầu bài học'}
            </Button>
          </div>
        </div>
      ) : path.allCompleted ? (
        <div className="recommended-completed-card">
          <CheckCircle2 size={24} className="completed-icon" aria-hidden />
          <div>
            <h3 className="completed-title">Chúc mừng! Bạn đã hoàn thành toàn bộ bài học môn {path.subjectName}!</h3>
            <p className="completed-desc">Hãy luyện tập thêm các đề thi thử hoặc làm bài tập củng cố.</p>
          </div>
        </div>
      ) : null}

      {/* Chapter Breakdown */}
      <div className="path-chapters-grid">
        {path.chapters.map((chap) => (
          <div key={chap.id} className="path-chapter-card">
            <div className="path-chapter-header">
              <div className="path-chapter-title-group">
                <span className="path-chapter-num">Chương {chap.order}</span>
                <h4 className="path-chapter-title">{chap.title}</h4>
              </div>
              <div className="path-chapter-stats">
                <span className="path-chapter-percent">{chap.progressPercent}%</span>
                <span className="path-chapter-fraction">
                  {chap.completedLessons}/{chap.totalLessons} bài
                </span>
              </div>
            </div>

            <div className="path-chapter-progress">
              <Progress value={chap.progressPercent} height={5} />
            </div>

            <div className="path-lessons-list">
              {chap.lessons.map((les) => {
                const isRecommended = path.recommendedLesson?.id === les.id
                return (
                  <div
                    key={les.id}
                    className={`path-lesson-item ${
                      les.status === 'completed'
                        ? 'is-completed'
                        : les.status === 'in-progress'
                          ? 'is-in-progress'
                          : ''
                    } ${isRecommended ? 'is-recommended' : ''}`}
                    onClick={() => handleOpenLesson(les.id, les.lastActiveSectionId)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleOpenLesson(les.id, les.lastActiveSectionId)
                      }
                    }}
                  >
                    <div className="path-lesson-left">
                      <div className="path-lesson-icon" aria-hidden>
                        {les.status === 'completed' ? (
                          <CheckCircle2 size={16} className="text-success" />
                        ) : les.status === 'in-progress' ? (
                          <span className="in-progress-dot" />
                        ) : (
                          <BookOpen size={15} className="text-muted" />
                        )}
                      </div>
                      <span className="path-lesson-title">{les.title}</span>
                    </div>

                    <div className="path-lesson-right">
                      {isRecommended && (
                        <span className="recommended-tag">Nên học tiếp</span>
                      )}
                      {les.status === 'in-progress' && !isRecommended && (
                        <span className="progress-tag">{les.progress}%</span>
                      )}
                      <ChevronRight size={14} className="chevron-icon" aria-hidden />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
