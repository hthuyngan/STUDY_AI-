import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTeacherAssignments } from '@/hooks/useTeacher'
import { FilterBar } from '@/components/ui/FilterBar'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageErrorState } from '@/components/ui/PageErrorState'

export function TeacherAssignmentsPage() {
  const { assignments, loading, error, refresh } = useTeacherAssignments()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = useMemo(() => {
    return assignments.filter((item) => {
      const matchSearch =
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.className.toLowerCase().includes(search.toLowerCase()) ||
        item.subject.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === 'all' || item.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [assignments, search, statusFilter])

  return (
    <div className="staff-page">
      <div className="staff-page-header">
        <div className="staff-page-title-row">
          <div>
            <nav className="staff-breadcrumbs" aria-label="Breadcrumb">
              <Link to="/teacher">Giáo viên</Link>
              <span>/</span>
              <span aria-current="page">Bài tập</span>
            </nav>
            <h1>Quản lý giao bài tập</h1>
            <p className="staff-page-desc">Theo dõi tiến độ hoàn thành bài nộp và quản lý bài tập theo từng lớp.</p>
          </div>
          <div className="staff-page-actions">
            <Link to="/teacher/assignments/new" className="staff-btn staff-btn-primary">
              + Giao bài tập mới
            </Link>
          </div>
        </div>
      </div>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Tìm theo tên bài tập, lớp, môn học..."
        filters={[
          {
            key: 'status',
            label: 'Trạng thái',
            value: statusFilter,
            options: [
              { label: 'Tất cả trạng thái', value: 'all' },
              { label: 'Đang mở', value: 'active' },
              { label: 'Lên lịch', value: 'scheduled' },
              { label: 'Đã đóng', value: 'closed' },
            ],
            onChange: setStatusFilter,
          },
        ]}
      />

      {loading ? (
        <div style={{ display: 'grid', gap: '8px' }}>
          <Skeleton height={52} />
          <Skeleton height={52} />
          <Skeleton height={52} />
        </div>
      ) : error ? (
        <PageErrorState title="Lỗi tải danh sách bài tập" message={error} onRetry={refresh} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Không tìm thấy bài tập"
          description="Thử thay đổi bộ lọc tìm kiếm hoặc tạo bài tập mới cho học sinh."
        />
      ) : (
        <div className="staff-table-wrapper">
          <table className="staff-table">
            <thead>
              <tr>
                <th>Bài tập</th>
                <th>Lớp học</th>
                <th>Môn học</th>
                <th>Hạn nộp</th>
                <th>Tỷ lệ hoàn thành</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const percent = Math.round((item.submissionsCount / item.totalStudents) * 100) || 0
                return (
                  <tr key={item.id}>
                    <td>
                      <strong style={{ display: 'block', color: 'var(--color-navy-dark)' }}>{item.title}</strong>
                      <span style={{ fontSize: '12px', color: 'var(--color-ink-muted)' }}>
                        {item.lessonIds.length} bài học liên kết
                      </span>
                    </td>
                    <td>{item.className}</td>
                    <td>{item.subject}</td>
                    <td>{new Date(item.dueDate).toLocaleDateString('vi-VN')}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            flex: 1,
                            maxWidth: '120px',
                            height: '6px',
                            background: 'var(--color-border)',
                            borderRadius: '3px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${percent}%`,
                              height: '100%',
                              background: percent > 70 ? 'var(--color-success, #2b8a3e)' : 'var(--color-primary)',
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: 500 }}>
                          {item.submissionsCount}/{item.totalStudents} ({percent}%)
                        </span>
                      </div>
                    </td>
                    <td>
                      <StatusBadge
                        status={item.status}
                        label={
                          item.status === 'active'
                            ? 'Đang mở'
                            : item.status === 'scheduled'
                              ? 'Lên lịch'
                              : 'Đã đóng'
                        }
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
