import { useState } from 'react'
import { ArrowRight, BookOpen, Clock } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageErrorState } from '@/components/ui/PageErrorState'
import { Progress } from '@/components/ui/Progress'
import { Skeleton } from '@/components/ui/Skeleton'
import { useCourses } from '@/hooks/useCourses'
import './CoursesPage.css'

export function CoursesPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'all' | 'in-progress' | 'completed'>('in-progress')
  const [selectedSubject, setSelectedSubject] = useState<string>('all')

  const { courses, isLoading, error, reload } = useCourses({
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
      <div className="courses-page-root">
        <Skeleton variant="text" width={220} height={28} />
        <div className="courses-grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="course-card-skeleton">
              <Skeleton variant="text" width="30%" height={14} />
              <Skeleton variant="text" width="80%" height={22} />
              <Skeleton variant="text" width="100%" height={14} />
              <Skeleton variant="rect" width="100%" height={8} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="courses-page-root">
        <PageErrorState description={error} onRetry={reload} />
      </div>
    )
  }

  return (
    <div className="courses-page-root">
      {/* Header */}
      <div className="courses-header-row">
        <div>
          <h1 className="page-title">Khóa học của tôi</h1>
          <p className="page-subtitle">Các lộ trình học tập và chuyên đề ôn thi bám sát kỳ thi THPT</p>
        </div>
      </div>

      {/* Filter and Tabs toolbar */}
      <div className="courses-toolbar">
        {/* Tabs */}
        <div className="courses-tabs-group" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'in-progress'}
            className={`tab-btn ${activeTab === 'in-progress' ? 'active' : ''}`}
            onClick={() => setActiveTab('in-progress')}
          >
            Đang học
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'all'}
            className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            Tất cả khóa
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'completed'}
            className={`tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            Đã hoàn thành
          </button>
        </div>

        {/* Subject filter chips */}
        <div className="subject-chips-list">
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

      {/* Courses List */}
      {courses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Không tìm thấy khóa học nào"
          description="Bạn chưa đăng ký khóa học nào trong mục này hoặc bộ lọc không có kết quả."
          actionLabel="Khám phá các môn học"
          onAction={() => navigate('/subjects')}
        />
      ) : (
        <div className="courses-grid">
          {courses.map((course) => {
            const isCompleted = course.status === 'completed'
            return (
              <Card key={course.id} className="course-card-item">
                <div className="course-card-badge-row">
                  <span className="course-subject-tag">{course.subjectName}</span>
                  <span className="course-grade-tag">{course.grade}</span>
                </div>

                <h2 className="course-title">
                  <Link to={`/courses/${course.id}`} className="course-title-link">
                    {course.title}
                  </Link>
                </h2>

                <p className="course-desc">{course.description}</p>

                <div className="course-metrics-row">
                  <span className="metric-item">
                    <Clock size={14} aria-hidden />
                    {course.durationHours} giờ
                  </span>
                  <span className="metric-item">
                    {course.completedLessons} / {course.totalLessons} bài học
                  </span>
                </div>

                <div className="course-progress-wrap">
                  <div className="progress-labels">
                    <span className="progress-status-text">
                      {isCompleted ? 'Đã hoàn thành' : `Tiến độ: ${course.progress}%`}
                    </span>
                    <span className="percentage-val">{course.progress}%</span>
                  </div>
                  <Progress value={course.progress} height={6} />
                </div>

                <div className="course-footer-row">
                  <Link to={`/courses/${course.id}`} className="w-full">
                    <Button
                      variant={isCompleted ? 'outline' : 'primary'}
                      icon={ArrowRight}
                      fullWidth
                    >
                      {isCompleted ? 'Xem lại khóa học' : 'Tiếp tục học'}
                    </Button>
                  </Link>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default CoursesPage
