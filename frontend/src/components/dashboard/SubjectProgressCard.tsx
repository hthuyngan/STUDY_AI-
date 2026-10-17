import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Progress } from '@/components/ui/Progress'
import type { SubjectProgressItemData } from '@/types/dashboard'

export interface SubjectProgressCardProps {
  subjects: SubjectProgressItemData[]
}

export function SubjectProgressCard({ subjects }: SubjectProgressCardProps) {
  const viewAllAction = (
    <Link to="/courses" className="card-link-action">
      <span>Xem tất cả môn</span>
      <ArrowRight size={14} aria-hidden />
    </Link>
  )

  return (
    <Card
      title="Môn học của bạn"
      subtitle="Tổng quan tiến độ các môn học chính khóa"
      action={viewAllAction}
      className="subject-progress-card"
    >
      <div className="subject-progress-grid">
        {subjects.map((subject) => {
          return (
            <Link
              key={subject.id}
              to={`/subjects/${subject.id}`}
              className="subject-progress-item"
            >
              <div className="subject-item-header">
                <div
                  className="subject-item-icon"
                  style={{
                    backgroundColor: subject.bgColor,
                    color: subject.color,
                  }}
                  aria-hidden
                >
                  {subject.icon}
                </div>
                <div className="subject-item-info">
                  <h3 className="subject-item-name">{subject.name}</h3>
                  <span className="subject-item-lessons">
                    {subject.completedLessons}/{subject.totalLessons} bài học
                  </span>
                </div>
                <div className="subject-item-percentage">{subject.progress}%</div>
              </div>

              <div className="subject-item-bar">
                <Progress value={subject.progress} height={6} />
              </div>
            </Link>
          )
        })}
      </div>
    </Card>
  )
}
