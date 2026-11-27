import React, { useEffect, useState } from 'react'
import { Calendar } from 'lucide-react'
import { teacherWorkspaceService, type TeacherScheduleItem } from '@/services/teacherWorkspace.service'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageErrorState } from '@/components/ui/PageErrorState'
import { Skeleton } from '@/components/ui/Skeleton'
import { StatusBadge } from '@/components/ui/StatusBadge'
import './TeacherPages.css'

export const TeacherSchedulePage: React.FC = () => {
  const [items, setItems] = useState<TeacherScheduleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    setError(null)
    teacherWorkspaceService.getSchedule()
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : 'Không thể tải lịch giảng dạy.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="staff-page">
      <div className="staff-page-header">
        <div className="staff-page-title-row">
          <div>
            <h1>Lịch giảng dạy & Hạn nộp</h1>
            <p className="staff-page-desc">
              Theo dõi lịch kiểm tra và hạn nộp bài tập của các lớp Toán 12 đang phụ trách.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <Skeleton height={120} />
      ) : error ? (
        <PageErrorState title="Không thể tải lịch giảng dạy" message={error} onRetry={load} />
      ) : items.length === 0 ? (
        <EmptyState icon={Calendar} title="Chưa có lịch kiểm tra hoặc hạn nộp" description="Các bài tập và đề kiểm tra bạn giao sẽ tự động hiển thị tại đây." />
      ) : (
        <div className="staff-card">
          <div className="staff-table-wrapper">
            <table className="staff-table">
              <thead>
                <tr>
                  <th>Sự kiện</th>
                  <th>Loại</th>
                  <th>Lớp học</th>
                  <th>Thời gian</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.title}</strong></td>
                    <td>{item.kind === 'exam_window' ? 'Kiểm tra' : 'Hạn nộp bài tập'}</td>
                    <td>{item.classroomName}</td>
                    <td>{new Date(item.scheduledAt).toLocaleString('vi-VN')}</td>
                    <td><StatusBadge status={item.status === 'published' || item.status === 'active' ? 'published' : 'draft'} label={item.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
