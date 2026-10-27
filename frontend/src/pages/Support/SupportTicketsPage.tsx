import { Link } from 'react-router-dom'
import { useSupportTickets } from '@/hooks/useSupport'
import { FilterBar } from '@/components/ui/FilterBar'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageErrorState } from '@/components/ui/PageErrorState'

export function SupportTicketsPage() {
  const {
    tickets,
    loading,
    error,
    category,
    setCategory,
    priority,
    setPriority,
    status,
    setStatus,
    search,
    setSearch,
    refresh,
  } = useSupportTickets()

  return (
    <div className="staff-page">
      <div className="staff-page-header">
        <div className="staff-page-title-row">
          <div>
            <nav className="staff-breadcrumbs" aria-label="Breadcrumb">
              <Link to="/support">Hỗ trợ</Link>
              <span>/</span>
              <span aria-current="page">Danh sách ticket</span>
            </nav>
            <h1>Yêu cầu hỗ trợ (Support Tickets)</h1>
            <p className="staff-page-desc">Theo dõi và phân công xử lý các thắc mắc, sự cố phát sinh của người dùng.</p>
          </div>
          <div className="staff-page-actions">
            <Link to="/support/users" className="staff-btn staff-btn-secondary">
              Tra cứu hồ sơ người dùng
            </Link>
          </div>
        </div>
      </div>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Tìm mã ticket, tên, email hoặc nội dung..."
        filters={[
          {
            key: 'category',
            label: 'Chuyên mục',
            value: category,
            options: [
              { label: 'Tất cả chuyên mục', value: 'all' },
              { label: 'Đồng bộ dữ liệu (Sync)', value: 'sync' },
              { label: 'Tài khoản & Đăng nhập', value: 'account' },
              { label: 'Nội dung bài học', value: 'content' },
              { label: 'Khác', value: 'other' },
            ],
            onChange: setCategory,
          },
          {
            key: 'priority',
            label: 'Độ ưu tiên',
            value: priority,
            options: [
              { label: 'Tất cả độ ưu tiên', value: 'all' },
              { label: 'Khẩn cấp (Urgent)', value: 'urgent' },
              { label: 'Cao (High)', value: 'high' },
              { label: 'Trung bình (Medium)', value: 'medium' },
              { label: 'Thấp (Low)', value: 'low' },
            ],
            onChange: setPriority,
          },
          {
            key: 'status',
            label: 'Trạng thái',
            value: status,
            options: [
              { label: 'Tất cả trạng thái', value: 'all' },
              { label: 'Mới mở', value: 'open' },
              { label: 'Đang xử lý', value: 'in-progress' },
              { label: 'Chờ phản hồi', value: 'waiting' },
              { label: 'Đã giải quyết', value: 'resolved' },
            ],
            onChange: setStatus,
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
      ) : tickets.length === 0 ? (
        <EmptyState title="Không tìm thấy ticket nào" description="Thử thay đổi bộ lọc tìm kiếm hoặc từ khóa tra cứu." />
      ) : (
        <div className="staff-table-wrapper">
          <table className="staff-table">
            <thead>
              <tr>
                <th>Mã Ticket</th>
                <th>Tiêu đề</th>
                <th>Người dùng</th>
                <th>Phân loại</th>
                <th>Ưu tiên</th>
                <th>Trạng thái</th>
                <th>Phụ trách</th>
                <th>Cập nhật</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id}>
                  <td>
                    <Link
                      to={`/support/tickets/${t.id}`}
                      style={{ fontWeight: 600, color: 'var(--color-primary)', textDecoration: 'none' }}
                    >
                      {t.id}
                    </Link>
                  </td>
                  <td>
                    <Link
                      to={`/support/tickets/${t.id}`}
                      style={{ color: 'var(--color-navy-dark)', textDecoration: 'none', fontWeight: 500 }}
                    >
                      {t.title}
                    </Link>
                    <div style={{ fontSize: '11px', color: 'var(--color-ink-muted)' }}>
                      {t.messageCount} trao đổi
                    </div>
                  </td>
                  <td>
                    <Link
                      to={`/support/users/${t.userId}`}
                      style={{ color: 'inherit', textDecoration: 'underline', fontSize: '13px' }}
                    >
                      {t.userName}
                    </Link>
                    <div style={{ fontSize: '11px', color: 'var(--color-ink-muted)' }}>{t.userEmail}</div>
                  </td>
                  <td>
                    <span style={{ fontSize: '12px', textTransform: 'capitalize' }}>{t.category}</span>
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        color:
                          t.priority === 'urgent' || t.priority === 'high'
                            ? 'var(--color-danger, #e03131)'
                            : 'var(--color-ink-muted)',
                      }}
                    >
                      {t.priority}
                    </span>
                  </td>
                  <td>
                    <StatusBadge
                      status={t.status}
                      label={
                        t.status === 'open'
                          ? 'Mới mở'
                          : t.status === 'in-progress'
                            ? 'Đang xử lý'
                            : t.status === 'waiting'
                              ? 'Chờ phản hồi'
                              : 'Đã giải quyết'
                      }
                    />
                  </td>
                  <td>{t.assignedTo || <span style={{ color: 'var(--color-ink-muted)' }}>Chưa gán</span>}</td>
                  <td>{new Date(t.updatedAt).toLocaleDateString('vi-VN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
