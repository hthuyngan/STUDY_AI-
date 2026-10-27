import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useContentReviewQueue } from '@/hooks/useContent'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageErrorState } from '@/components/ui/PageErrorState'

export function ContentReviewPage() {
  const { queue, loading, error, processReview, refresh } = useContentReviewQueue()
  const [activeItem, setActiveItem] = useState<{ id: string; action: 'approve' | 'request-changes'; title: string } | null>(null)
  const [processing, setProcessing] = useState(false)

  const handleConfirm = async () => {
    if (!activeItem) return
    setProcessing(true)
    try {
      await processReview(activeItem.id, activeItem.action)
      setActiveItem(null)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="staff-page">
      <div className="staff-page-header">
        <div className="staff-page-title-row">
          <div>
            <nav className="staff-breadcrumbs" aria-label="Breadcrumb">
              <Link to="/content">Nội dung</Link>
              <span>/</span>
              <span aria-current="page">Hàng đợi kiểm duyệt</span>
            </nav>
            <h1>Kiểm duyệt chất lượng nội dung</h1>
            <p className="staff-page-desc">
              Phê duyệt hoặc yêu cầu chỉnh sửa đối với các bài học và bộ câu hỏi do biên tập viên nộp lên.
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
        <PageErrorState title="Lỗi tải hàng đợi kiểm duyệt" message={error} onRetry={refresh} />
      ) : queue.length === 0 ? (
        <EmptyState title="Hàng đợi trống" description="Tất cả các nội dung gửi lên đã được xử lý xong." />
      ) : (
        <div className="staff-table-wrapper">
          <table className="staff-table">
            <thead>
              <tr>
                <th>Nội dung</th>
                <th>Loại</th>
                <th>Môn học</th>
                <th>Tác giả</th>
                <th>Ngày gửi</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong style={{ display: 'block', color: 'var(--color-navy-dark)' }}>{item.title}</strong>
                    <span style={{ fontSize: '12px', color: 'var(--color-ink-muted)' }}>
                      {item.commentsCount > 0 ? `${item.commentsCount} phản hồi` : 'Chưa có ghi chú'}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '12px', textTransform: 'uppercase', fontWeight: 600 }}>
                      {item.type === 'lesson' ? 'Bài học' : 'Bài thu hoạch'}
                    </span>
                  </td>
                  <td>{item.subject}</td>
                  <td>{item.author}</td>
                  <td>{new Date(item.submittedAt).toLocaleDateString('vi-VN')}</td>
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
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        className="staff-btn staff-btn-primary"
                        style={{ fontSize: '12px', padding: '4px 8px' }}
                        onClick={() => setActiveItem({ id: item.id, action: 'approve', title: item.title })}
                      >
                        Phê duyệt
                      </button>
                      <button
                        type="button"
                        className="staff-btn staff-btn-secondary"
                        style={{ fontSize: '12px', padding: '4px 8px' }}
                        onClick={() => setActiveItem({ id: item.id, action: 'request-changes', title: item.title })}
                      >
                        Yêu cầu sửa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirmation dialog for review actions */}
      <ConfirmDialog
        isOpen={Boolean(activeItem)}
        title={activeItem?.action === 'approve' ? 'Xác nhận phê duyệt nội dung' : 'Yêu cầu sửa đổi nội dung'}
        description={`Bạn đang ${activeItem?.action === 'approve' ? 'phê duyệt' : 'yêu cầu sửa lại'} nội dung: ${activeItem?.title || ''}.`}
        confirmText={activeItem?.action === 'approve' ? 'Phê duyệt ngay' : 'Gửi yêu cầu sửa'}
        isDestructive={activeItem?.action === 'request-changes'}
        isLoading={processing}
        onConfirm={handleConfirm}
        onCancel={() => {
          setActiveItem(null)
        }}
      />
    </div>
  )
}
