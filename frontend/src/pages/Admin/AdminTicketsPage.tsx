import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Eye, MessageSquare, Send } from 'lucide-react'
import {
  AdminButton,
  AdminDetailDrawer,
  AdminEmptyState,
  AdminErrorState,
  AdminFormField,
  AdminIconButton,
  AdminLoadingState,
  AdminPagination,
  AdminSearchInput,
  StatusBadge,
} from '@/components/admin/ui'
import {
  SUPPORT_CATEGORY_LABELS,
  supportService,
  type SupportTicketCategory,
  type SupportTicketDetail,
  type SupportTicketPriority,
  type SupportTicketStatus,
  type SupportTicketSummary,
} from '@/services/support.service'
import './AdminPages.css'
import '@/components/admin/AdminComponents.css'

export const AdminTicketsPage: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicketSummary[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 15

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const [selectedTicket, setSelectedTicket] = useState<SupportTicketDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [replyBody, setReplyBody] = useState('')
  const [replyNextStatus, setReplyNextStatus] = useState<SupportTicketStatus | ''>('')
  const [saving, setSaving] = useState(false)
  const listRequestSeqRef = useRef(0)
  const ticketRequestSeqRef = useRef(0)

  const fetchTickets = useCallback(async () => {
    const reqSeq = ++listRequestSeqRef.current
    setLoading(true)
    setError(null)
    try {
      const res = await supportService.listAdminTickets({
        status: statusFilter,
        category: categoryFilter,
        priority: priorityFilter,
        search,
        page,
        pageSize,
      })
      if (listRequestSeqRef.current !== reqSeq) return
      setTickets(res.items)
      setTotal(res.total)
    } catch (err) {
      if (listRequestSeqRef.current !== reqSeq) return
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách yêu cầu hỗ trợ.')
    } finally {
      if (listRequestSeqRef.current === reqSeq) {
        setLoading(false)
      }
    }
  }, [statusFilter, categoryFilter, priorityFilter, search, page])

  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

  const openTicket = async (ticketId: string) => {
    const reqSeq = ++ticketRequestSeqRef.current
    setDetailLoading(true)
    try {
      const detail = await supportService.getAdminTicket(ticketId)
      if (ticketRequestSeqRef.current !== reqSeq) return
      setSelectedTicket(detail)
      setReplyNextStatus('')
    } catch (err) {
      if (ticketRequestSeqRef.current !== reqSeq) return
      setToast(err instanceof Error ? err.message : 'Không thể mở chi tiết ticket.')
    } finally {
      if (ticketRequestSeqRef.current === reqSeq) {
        setDetailLoading(false)
      }
    }
  }

  const handleUpdateField = async (patch: {
    status?: SupportTicketStatus
    priority?: SupportTicketPriority
    category?: SupportTicketCategory
  }) => {
    if (!selectedTicket) return
    setSaving(true)
    try {
      const updated = await supportService.updateAdminTicket(selectedTicket.id, patch)
      setSelectedTicket(updated)
      setToast('Đã cập nhật trạng thái ticket.')
      await fetchTickets()
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Không thể cập nhật ticket.')
    } finally {
      setSaving(false)
    }
  }

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTicket || !replyBody.trim()) return
    setSaving(true)
    try {
      const updated = await supportService.replyAdminTicket(
        selectedTicket.id,
        replyBody.trim(),
        replyNextStatus || undefined
      )
      setSelectedTicket(updated)
      setReplyBody('')
      setReplyNextStatus('')
      setToast('Đã gửi phản hồi cho người dùng.')
      await fetchTickets()
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Không thể gửi phản hồi.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-users-page">
      <div className="admin-header-row">
        <div className="staff-page-header" style={{ marginBottom: 0 }}>
          <h1 className="staff-page-title">Trung tâm hỗ trợ (Tickets)</h1>
          <p className="staff-page-desc">
            Tiếp nhận, phân loại, thiết lập mức ưu tiên và phản hồi yêu cầu hỗ trợ từ học viên và giáo viên.
          </p>
        </div>
      </div>

      {toast && (
        <div className="admin-toast-banner" role="status" style={{ marginTop: '12px' }}>
          <span>{toast}</span>
        </div>
      )}

      <div style={{ marginTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px' }}>
        <div style={{ flex: '1 1 240px' }}>
          <AdminSearchInput
            value={search}
            onChange={(val) => {
              setSearch(val)
              setPage(1)
            }}
            placeholder="Tìm theo mã TK hoặc tiêu đề..."
            ariaLabel="Tìm kiếm ticket"
          />
        </div>
        <select
          className="admin-select"
          style={{ width: 'auto', minWidth: '150px' }}
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setPage(1)
          }}
          aria-label="Lọc theo trạng thái"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="OPEN">Mới tạo (OPEN)</option>
          <option value="IN_PROGRESS">Đang xử lý</option>
          <option value="WAITING_FOR_USER">Chờ phản hồi</option>
          <option value="RESOLVED">Đã giải quyết</option>
          <option value="CLOSED">Đã đóng</option>
        </select>
        <select
          className="admin-select"
          style={{ width: 'auto', minWidth: '160px' }}
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value)
            setPage(1)
          }}
          aria-label="Lọc theo nhóm vấn đề"
        >
          <option value="all">Tất cả nhóm vấn đề</option>
          {Object.entries(SUPPORT_CATEGORY_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
        <select
          className="admin-select"
          style={{ width: 'auto', minWidth: '140px' }}
          value={priorityFilter}
          onChange={(e) => {
            setPriorityFilter(e.target.value)
            setPage(1)
          }}
          aria-label="Lọc theo mức ưu tiên"
        >
          <option value="all">Tất cả ưu tiên</option>
          <option value="LOW">Thấp</option>
          <option value="MEDIUM">Trung bình</option>
          <option value="HIGH">Cao</option>
          <option value="URGENT">Khẩn cấp</option>
        </select>
      </div>

      <div className="staff-table-wrapper" style={{ marginTop: '16px' }}>
        {loading ? (
          <AdminLoadingState label="Đang tải danh sách yêu cầu hỗ trợ..." />
        ) : error ? (
          <AdminErrorState description={error} onRetry={fetchTickets} />
        ) : tickets.length === 0 ? (
          <AdminEmptyState
            icon={<MessageSquare size={26} />}
            title="Chưa có yêu cầu hỗ trợ nào"
            description="Hiện không có ticket nào khớp với bộ lọc hiện tại."
          />
        ) : (
          <>
            <table className="staff-table" aria-label="Danh sách ticket hỗ trợ">
              <thead>
                <tr>
                  <th scope="col">Mã</th>
                  <th scope="col">Tiêu đề & Người gửi</th>
                  <th scope="col">Nhóm vấn đề</th>
                  <th scope="col">Ưu tiên</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Cập nhật</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <code style={{ fontSize: '12px' }}>{t.ticketCode}</code>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0F172A' }}>{t.subject}</div>
                      <div style={{ fontSize: '12px', color: '#64748B' }}>
                        {t.userName} ({t.userEmail || t.userId}) · {t.messageCount} tin nhắn
                      </div>
                    </td>
                    <td>{SUPPORT_CATEGORY_LABELS[t.category] || t.category}</td>
                    <td>
                      <StatusBadge status={t.priority} />
                    </td>
                    <td>
                      <StatusBadge status={t.status} />
                    </td>
                    <td style={{ fontSize: '12px', color: '#64748B' }}>
                      {new Date(t.updatedAt).toLocaleString('vi-VN')}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <AdminIconButton
                        label={`Xem và xử lý ${t.ticketCode}`}
                        icon={<Eye size={15} />}
                        onClick={() => openTicket(t.id)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <AdminPagination
              currentPage={page}
              totalPages={Math.max(1, Math.ceil(total / pageSize))}
              totalItems={total}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          </>
        )}
      </div>

      <AdminDetailDrawer
        open={!!selectedTicket || detailLoading}
        onClose={() => {
          ticketRequestSeqRef.current++
          setDetailLoading(false)
          setSelectedTicket(null)
        }}
        title={selectedTicket ? `${selectedTicket.ticketCode} — ${selectedTicket.subject}` : 'Đang tải...'}
        subtitle={selectedTicket ? `Người gửi: ${selectedTicket.userName} (${selectedTicket.userEmail})` : undefined}
        width="lg"
      >
        {detailLoading ? (
          <AdminLoadingState label="Đang tải hội thoại..." />
        ) : (
          selectedTicket && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                <AdminFormField label="Trạng thái">
                  <select
                    className="admin-select"
                    value={selectedTicket.status}
                    disabled={saving}
                    onChange={(e) => handleUpdateField({ status: e.target.value as SupportTicketStatus })}
                  >
                    <option value="OPEN">Mới tạo</option>
                    <option value="IN_PROGRESS">Đang xử lý</option>
                    <option value="WAITING_FOR_USER">Chờ phản hồi</option>
                    <option value="RESOLVED">Đã giải quyết</option>
                    <option value="CLOSED">Đã đóng</option>
                  </select>
                </AdminFormField>
                <AdminFormField label="Mức ưu tiên">
                  <select
                    className="admin-select"
                    value={selectedTicket.priority}
                    disabled={saving}
                    onChange={(e) => handleUpdateField({ priority: e.target.value as SupportTicketPriority })}
                  >
                    <option value="LOW">Thấp</option>
                    <option value="MEDIUM">Trung bình</option>
                    <option value="HIGH">Cao</option>
                    <option value="URGENT">Khẩn cấp</option>
                  </select>
                </AdminFormField>
                <AdminFormField label="Nhóm vấn đề">
                  <select
                    className="admin-select"
                    value={selectedTicket.category}
                    disabled={saving}
                    onChange={(e) => handleUpdateField({ category: e.target.value as SupportTicketCategory })}
                  >
                    {Object.entries(SUPPORT_CATEGORY_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </AdminFormField>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '340px', overflowY: 'auto', padding: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
                {selectedTicket.messages.map((m) => {
                  const isStaff = m.senderRole === 'admin' || m.senderRole === 'support'
                  return (
                    <div
                      key={m.id}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #E2E8F0',
                        background: isStaff ? '#EFF6FF' : '#FFFFFF',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px', color: '#475569' }}>
                        <strong>
                          {m.senderName} ({isStaff ? 'Quản trị/Hỗ trợ' : 'Người dùng'})
                        </strong>
                        <span>{new Date(m.createdAt).toLocaleString('vi-VN')}</span>
                      </div>
                      <div style={{ fontSize: '13px', color: '#0F172A', whiteSpace: 'pre-wrap' }}>{m.body}</div>
                    </div>
                  )
                })}
              </div>

              <form onSubmit={handleSendReply} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <AdminFormField label="Phản hồi người dùng">
                  <textarea
                    className="admin-input"
                    rows={3}
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    placeholder="Nhập nội dung phản hồi..."
                    required
                  />
                </AdminFormField>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                  <select
                    className="admin-select"
                    value={replyNextStatus}
                    onChange={(e) => setReplyNextStatus(e.target.value as SupportTicketStatus | '')}
                    aria-label="Trạng thái sau phản hồi"
                  >
                    <option value="">Tự động chuyển trạng thái</option>
                    <option value="IN_PROGRESS">Đang xử lý</option>
                    <option value="WAITING_FOR_USER">Chờ người dùng phản hồi</option>
                    <option value="RESOLVED">Đánh dấu đã giải quyết</option>
                    <option value="CLOSED">Đóng ticket</option>
                  </select>
                  <AdminButton
                    type="submit"
                    variant="primary"
                    icon={<Send size={14} />}
                    isLoading={saving}
                    disabled={!replyBody.trim()}
                  >
                    Gửi phản hồi
                  </AdminButton>
                </div>
              </form>
            </div>
          )
        )}
      </AdminDetailDrawer>
    </div>
  )
}
