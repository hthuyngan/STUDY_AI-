import { Link } from 'react-router-dom'
import { useContentDashboard } from '@/hooks/useContent'
import { StaffMetricCard } from '@/components/ui/StaffMetricCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageErrorState } from '@/components/ui/PageErrorState'
import './ContentPages.css'

export function ContentDashboardPage() {
  const { data, loading, error, refresh } = useContentDashboard()

  if (loading) {
    return (
      <div className="staff-page">
        <Skeleton height={36} width={260} />
        <div className="staff-metrics-grid" style={{ marginTop: '20px' }}>
          <Skeleton height={96} />
          <Skeleton height={96} />
          <Skeleton height={96} />
          <Skeleton height={96} />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="staff-page">
        <PageErrorState title="Không thể kết nối máy chủ quản trị." message={error || 'Không có dữ liệu'} onRetry={refresh} />
      </div>
    )
  }

  return (
    <div className="staff-page">
      <div className="staff-page-header">
        <div className="staff-page-title-row">
          <div>
            <nav className="staff-breadcrumbs" aria-label="Breadcrumb">
              <span>Không gian làm việc</span>
              <span>/</span>
              <span aria-current="page">Nội dung học tập</span>
            </nav>
            <h1>Biên tập & Xuất bản Giáo trình</h1>
            <p className="staff-page-desc">
              Quản lý tiến độ soạn thảo bài học, bộ câu hỏi thu hoạch và hàng đợi kiểm duyệt chất lượng.
            </p>
          </div>
          <div className="staff-page-actions">
            <Link to="/content/lessons" className="staff-btn staff-btn-primary">
              Danh sách bài học
            </Link>
          </div>
        </div>
      </div>

      <div className="staff-metrics-grid">
        <StaffMetricCard
          label="Bài học bản nháp"
          value={data.draftCount}
          hint="Đang trong tiến trình soạn thảo"
        />
        <StaffMetricCard
          label="Chờ duyệt chất lượng"
          value={data.needsReviewCount}
          hint="Cần biên tập viên phê duyệt"
        />
        <StaffMetricCard
          label="Xuất bản tuần này"
          value={data.publishedThisWeek}
          hint="Đã phát hành cho học sinh"
        />
        <StaffMetricCard
          label="Độ phủ bài thu hoạch"
          value={`${data.assessmentCoveragePercent}%`}
          hint="Tỷ lệ bài học có bài tập kèm"
        />
      </div>

      <div className="staff-dashboard-grid" style={{ marginTop: '24px' }}>
        <div className="staff-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 className="staff-card-title" style={{ margin: 0 }}>
              Hàng đợi kiểm duyệt nội dung
            </h2>
            <Link to="/content/review" className="staff-btn staff-btn-secondary" style={{ fontSize: '13px', padding: '4px 10px' }}>
              Xem tất cả ({data.reviewQueue.length})
            </Link>
          </div>

          {data.reviewQueue.length === 0 ? (
            <EmptyState title="Không có bài chờ duyệt" description="Hiện tại chưa có nội dung nào cần kiểm duyệt." />
          ) : (
            <div className="staff-table-wrapper">
              <table className="staff-table">
                <thead>
                  <tr>
                    <th>Nội dung</th>
                    <th>Loại</th>
                    <th>Tác giả</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {data.reviewQueue.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong style={{ display: 'block', color: 'var(--color-navy-dark)' }}>{item.title}</strong>
                        <span style={{ fontSize: '12px', color: 'var(--color-ink-muted)' }}>{item.subject}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', textTransform: 'uppercase', fontWeight: 600 }}>
                          {item.type === 'lesson' ? 'Bài học' : 'Bài thu hoạch'}
                        </span>
                      </td>
                      <td>{item.author}</td>
                      <td>
                        <StatusBadge
                          status={item.status}
                          label={
                            item.status === 'pending'
                              ? 'Chờ duyệt'
                              : item.status === 'changes-requested'
                                ? 'Cần sửa đổi'
                                : 'Đã duyệt'
                          }
                        />
                      </td>
                      <td>
                        <Link to="/content/review" className="staff-btn staff-btn-secondary" style={{ fontSize: '12px', padding: '4px 8px' }}>
                          Duyệt
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="staff-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 className="staff-card-title" style={{ margin: 0 }}>
              Bài học vừa cập nhật
            </h2>
            <Link to="/content/lessons" className="staff-btn staff-btn-secondary" style={{ fontSize: '13px', padding: '4px 10px' }}>
              Quản lý bài học
            </Link>
          </div>

          <div style={{ display: 'grid', gap: '10px' }}>
            {data.recentLessons.map((lesson) => (
              <div
                key={lesson.id}
                style={{
                  padding: '12px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <Link
                    to={`/content/lessons/${lesson.id}`}
                    style={{ fontWeight: 600, color: 'var(--color-primary)', textDecoration: 'none' }}
                  >
                    {lesson.title}
                  </Link>
                  <div style={{ fontSize: '12px', color: 'var(--color-ink-muted)', marginTop: '4px' }}>
                    {lesson.subjectName} • {lesson.authorName} • {new Date(lesson.updatedAt).toLocaleDateString('vi-VN')}
                  </div>
                </div>
                <StatusBadge
                  status={lesson.status}
                  label={
                    lesson.status === 'published'
                      ? 'Đã xuất bản'
                      : lesson.status === 'in-review'
                        ? 'Chờ duyệt'
                        : 'Bản nháp'
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
