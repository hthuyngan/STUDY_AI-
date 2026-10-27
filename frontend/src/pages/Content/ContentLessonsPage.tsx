import { Link } from 'react-router-dom'
import { useContentLessons } from '@/hooks/useContent'
import { FilterBar } from '@/components/ui/FilterBar'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageErrorState } from '@/components/ui/PageErrorState'

export function ContentLessonsPage() {
  const {
    lessons,
    loading,
    error,
    subjectFilter,
    setSubjectFilter,
    statusFilter,
    setStatusFilter,
    search,
    setSearch,
    refresh,
  } = useContentLessons()

  return (
    <div className="staff-page">
      <div className="staff-page-header">
        <div className="staff-page-title-row">
          <div>
            <nav className="staff-breadcrumbs" aria-label="Breadcrumb">
              <Link to="/content">Nội dung</Link>
              <span>/</span>
              <span aria-current="page">Bài học</span>
            </nav>
            <h1>Quản lý bài học</h1>
            <p className="staff-page-desc">
              Tất cả các bài giảng trong kho tài liệu, trạng thái xuất bản và biên soạn nội dung.
            </p>
          </div>
          <div className="staff-page-actions">
            <Link to="/content/lessons/new" className="staff-btn staff-btn-primary">
              + Tạo bài học mới
            </Link>
          </div>
        </div>
      </div>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Tìm theo tên bài học, tác giả..."
        filters={[
          {
            key: 'subject',
            label: 'Môn học',
            value: subjectFilter,
            options: [
              { label: 'Tất cả môn học', value: 'all' },
              { label: 'Toán học 12', value: 'math' },
              { label: 'Vật lý 12', value: 'physics' },
              { label: 'Hóa học 12', value: 'chemistry' },
            ],
            onChange: setSubjectFilter,
          },
          {
            key: 'status',
            label: 'Trạng thái',
            value: statusFilter,
            options: [
              { label: 'Tất cả trạng thái', value: 'all' },
              { label: 'Đã xuất bản', value: 'published' },
              { label: 'Chờ duyệt', value: 'in-review' },
              { label: 'Bản nháp', value: 'draft' },
              { label: 'Lưu trữ', value: 'archived' },
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
        <PageErrorState title="Không thể kết nối máy chủ quản trị." message={error} onRetry={refresh} />
      ) : lessons.length === 0 ? (
        <EmptyState title="Không tìm thấy bài học" description="Thử thay đổi bộ lọc tìm kiếm hoặc tạo bài học mới." />
      ) : (
        <div className="staff-table-wrapper">
          <table className="staff-table">
            <thead>
              <tr>
                <th>Bài học</th>
                <th>Môn học</th>
                <th>Chương</th>
                <th>Tác giả</th>
                <th>Bài thu hoạch</th>
                <th>Trạng thái</th>
                <th>Cập nhật</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {lessons.map((lesson) => (
                <tr key={lesson.id}>
                  <td>
                    <strong style={{ display: 'block', color: 'var(--color-navy-dark)' }}>{lesson.title}</strong>
                  </td>
                  <td>{lesson.subjectName}</td>
                  <td style={{ fontSize: '13px', color: 'var(--color-ink-muted)' }}>{lesson.chapterName}</td>
                  <td>{lesson.authorName}</td>
                  <td>
                    {lesson.hasAssessment ? (
                      <span style={{ fontSize: '12px', color: 'var(--color-success, #2b8a3e)' }}>✓ Có</span>
                    ) : (
                      <span style={{ fontSize: '12px', color: 'var(--color-ink-muted)' }}>—</span>
                    )}
                  </td>
                  <td>
                    <StatusBadge
                      status={lesson.status}
                      label={
                        lesson.status === 'published'
                          ? 'Đã xuất bản'
                          : lesson.status === 'in-review'
                            ? 'Chờ duyệt'
                            : lesson.status === 'draft'
                              ? 'Bản nháp'
                              : 'Lưu trữ'
                      }
                    />
                  </td>
                  <td>{new Date(lesson.updatedAt).toLocaleDateString('vi-VN')}</td>
                  <td>
                    <Link
                      to={`/content/lessons/${lesson.id}`}
                      className="staff-btn staff-btn-secondary"
                      style={{ fontSize: '12px', padding: '4px 8px' }}
                    >
                      Chỉnh sửa
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
