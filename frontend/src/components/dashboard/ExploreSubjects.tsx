import { Atom, BookOpen, Calculator, FlaskConical, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { DashboardSubject } from '@/types/dashboard'

interface ExploreSubjectsProps {
  subjects: DashboardSubject[]
}

const ICON_MAP = {
  calculator: Calculator,
  atom: Atom,
  flask: FlaskConical,
  book: BookOpen,
}

export function ExploreSubjects({ subjects }: ExploreSubjectsProps) {
  return (
    <section className="explore-subjects-root" aria-labelledby="explore-subjects-heading">
      <div className="section-header-row">
        <h2 id="explore-subjects-heading" className="section-heading-title">
          Khám phá môn học
        </h2>
        <Link to="/courses" className="section-see-all-link">
          <span>Xem tất cả</span>
          <ChevronRight size={14} aria-hidden />
        </Link>
      </div>

      <div className="explore-subjects-grid" role="list">
        {subjects.map((sub) => {
          const IconComponent = ICON_MAP[sub.icon] || BookOpen
          return (
            <Link
              key={sub.id}
              to={`/courses`}
              className="subject-card-item"
              role="listitem"
            >
              <div className="subject-icon-box">
                <IconComponent size={22} className="subject-icon-svg" aria-hidden />
              </div>
              <div className="subject-meta-text">
                <span className="subject-name">{sub.name}</span>
                <span className="subject-lesson-count">{sub.lessonCount} bài học</span>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
