import { Link } from 'react-router-dom'
import { useContentSubjects } from '@/hooks/useContent'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageErrorState } from '@/components/ui/PageErrorState'

export function ContentSubjectsPage() {
  const { subjects, loading, error, refresh } = useContentSubjects()

  return (
    <div className="staff-page">
      <div className="staff-page-header">
        <div className="staff-page-title-row">
          <div>
            <nav className="staff-breadcrumbs" aria-label="Breadcrumb">
              <Link to="/content">Nội dung</Link>
              <span>/</span>
              <span aria-current="page">Môn học</span>
            </nav>
            <h1>Chương trình môn học</h1>
            <p className="staff-page-desc">
              Cấu trúc khung chương trình, số lượng chương mục và mức độ bao phủ bài học theo từng môn.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gap: '8px' }}>
          <Skeleton height={52} />
          <Skeleton height={52} />
          <Skeleton height={52} />
        </div>
      ) : error ? (
        <PageErrorState title="Lỗi tải danh sách môn học" message={error} onRetry={refresh} />
      ) : subjects.length === 0 ? (
        <EmptyState title="Chưa có môn học" description="Không tìm thấy môn học nào trong hệ thống." />
      ) : (
        <div className="staff-table-wrapper">
          <table className="staff-table">
            <thead>
              <tr>
                <th>Môn học</th>
                <th>Khối lớp</th>
                <th>Số chương</th>
                <th>Số bài học</th>
                <th>Bài thu hoạch</th>
                <th>Tỷ lệ xuất bản</th>
                <th>Cập nhật gần nhất</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((s) => (
                <tr key={s.id}>
                  <td>
                    <strong style={{ color: 'var(--color-navy-dark)' }}>{s.name}</strong>
                  </td>
                  <td>{s.grade}</td>
                  <td>{s.chapterCount} chương</td>
                  <td>{s.lessonCount} bài học</td>
                  <td>{s.assessmentCount} bài</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '80px',
                          height: '6px',
                          background: 'var(--color-border)',
                          borderRadius: '3px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${s.publishedPercent}%`,
                            height: '100%',
                            background: 'var(--color-primary)',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>{s.publishedPercent}%</span>
                    </div>
                  </td>
                  <td>{new Date(s.updatedAt).toLocaleDateString('vi-VN')}</td>
                  <td>
                    <Link
                      to={`/content/subjects/${s.id}`}
                      className="staff-btn staff-btn-secondary"
                      style={{ fontSize: '12px', padding: '4px 10px' }}
                    >
                      Quản lý giáo trình
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
