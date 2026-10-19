import { CheckCircle2, ChevronRight, Lock, Play } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { PageErrorState } from '@/components/ui/PageErrorState'
import { Progress } from '@/components/ui/Progress'
import { Skeleton } from '@/components/ui/Skeleton'
import { useCourseDetail } from '@/hooks/useCourses'
import './CourseDetailPage.css'

export function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const { course, isLoading, error, reload } = useCourseDetail(courseId)

  if (isLoading) {
    return (
      <div className="course-detail-root">
        <Skeleton variant="text" width={240} height={16} />
        <Skeleton variant="rect" width="100%" height={160} />
        <Skeleton variant="rect" width="100%" height={240} />
      </div>
    )
  }

  if (error || !course) {
    return (
      <div className="course-detail-root">
        <Breadcrumb items={[{ label: 'Khóa học', to: '/courses' }, { label: 'Chi tiết' }]} />
        <PageErrorState description={error || 'Không tìm thấy khóa học'} onRetry={reload} />
      </div>
    )
  }

  return (
    <div className="course-detail-root">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Khóa học', to: '/courses' },
          { label: course.title },
        ]}
      />

      {/* Course Header Banner */}
      <div className="course-header-box">
        <div className="course-header-info">
          <div className="course-meta-tags">
            <span className="subject-chip">{course.subjectName}</span>
            <span className="grade-chip">{course.grade}</span>
          </div>

          <h1 className="course-detail-title">{course.title}</h1>
          <p className="course-detail-desc">{course.description}</p>

          <div className="instructor-badge">
            <Avatar src={course.instructor.avatar} alt={course.instructor.name} size="sm" />
            <div className="instructor-text">
              <span className="instructor-name">{course.instructor.name}</span>
              <span className="instructor-role">{course.instructor.title}</span>
            </div>
          </div>
        </div>

        <div className="course-header-side">
          <div className="course-summary-card">
            <div className="summary-stat-row">
              <span className="stat-label">Tiến độ khóa học</span>
              <span className="stat-percentage">{course.progress}%</span>
            </div>
            <Progress value={course.progress} height={8} />

            <div className="summary-lessons-count">
              {course.completedLessons} / {course.totalLessons} bài học hoàn thành
            </div>

            <Button
              variant="primary"
              icon={Play}
              fullWidth
              onClick={() => navigate(`/learn/${course.id}/${course.firstLessonId}`)}
            >
              Tiếp tục học
            </Button>
          </div>
        </div>
      </div>

      {/* Course Outline Section */}
      <div className="course-outline-wrapper">
        <div className="outline-section-header">
          <h2 className="section-title">Nội dung khóa học</h2>
          <span className="section-subtitle">
            {course.chapters.length} chương · {course.totalLessons} bài học
          </span>
        </div>

        {course.chapters.map((chapter) => (
          <section key={chapter.id} className="chapter-block">
            <div className="chapter-block-header">
              <h3 className="chapter-block-title">{chapter.title}</h3>
            </div>

            <div className="chapter-lessons-list">
              {chapter.lessons.map((lesson) => {
                const isLocked = lesson.status === 'locked'
                const isCompleted = lesson.status === 'completed'
                const isInProgress = lesson.status === 'in-progress'

                return (
                  <div
                    key={lesson.id}
                    className={`outline-lesson-row ${isLocked ? 'locked' : ''} ${isInProgress ? 'active' : ''}`}
                  >
                    <div className="lesson-left-icon" aria-hidden>
                      {isCompleted && <CheckCircle2 size={18} className="icon-completed" />}
                      {isInProgress && <Play size={16} className="icon-in-progress" />}
                      {lesson.status === 'available' && <div className="dot-available" />}
                      {isLocked && <Lock size={16} className="icon-locked" />}
                    </div>

                    <div className="lesson-middle">
                      <Link
                        to={isLocked ? '#' : `/learn/${course.id}/${lesson.id}`}
                        className={`lesson-link ${isLocked ? 'disabled' : ''}`}
                        tabIndex={isLocked ? -1 : 0}
                      >
                        {lesson.title}
                      </Link>
                      <span className="lesson-time">{lesson.durationMinutes} phút</span>
                    </div>

                    <div className="lesson-right">
                      {isLocked ? (
                        <span className="locked-text">Khóa</span>
                      ) : (
                        <Link
                          to={`/learn/${course.id}/${lesson.id}`}
                          className="start-lesson-link"
                          aria-label={`Mở bài: ${lesson.title}`}
                        >
                          <span>{isCompleted ? 'Ôn lại' : isInProgress ? 'Tiếp tục' : 'Bắt đầu'}</span>
                          <ChevronRight size={15} aria-hidden />
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

export default CourseDetailPage
