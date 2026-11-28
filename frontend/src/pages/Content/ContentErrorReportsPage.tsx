import React, { useCallback, useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { contentWorkspaceService, type ContentErrorReportItem } from '@/services/contentWorkspace.service'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageErrorState } from '@/components/ui/PageErrorState'
import { Skeleton } from '@/components/ui/Skeleton'
import { StatusBadge } from '@/components/ui/StatusBadge'
import './ContentPages.css'

export const ContentErrorReportsPage: React.FC = () => {
  const [reports, setReports] = useState<ContentErrorReportItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [classFilter, setClassFilter] = useState('all')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setReports(await contentWorkspaceService.getErrorReports({ status: statusFilter, classification: classFilter }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải báo cáo sai sót.')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, classFilter])

  useEffect(() => {
    void load()
  }, [load])

  const handleUpdate = async (id: string, nextStatus: string, classification?: string) => {
    setUpdatingId(id)
    setError(null)
    try {
      await contentWorkspaceService.updateErrorReport(id, {
        status: nextStatus,
        classification,
        resolutionNote: nextStatus === 'escalated' ? 'Chuyển Admin xử lý kỹ thuật' : 'Đã kiểm tra và cập nhật nội dung',
      })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể cập nhật báo cáo sai sót.')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="staff-page">
      <div className="staff-page-header">
        <div className="staff-page-title-row">
          <div>
            <h1>Báo cáo sai sót nội dung</h1>
            <p className="staff-page-desc">
              Tiếp nhận và xử lý báo cáo sai câu hỏi, đáp án, công thức, lời giải, bài học hoặc phản hồi AI.
            </p>
          </div>
        </div>
      </div>

      <div className="staff-card" style={{ marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <select className="staff-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Lọc trạng thái báo cáo">
          <option value="all">Tất cả trạng thái</option>
          <option value="open">Mới tiếp nhận</option>
          <option value="in_progress">Đang xử lý</option>
          <option value="resolved">Đã khắc phục</option>
          <option value="escalated">Chuyển Admin</option>
          <option value="closed">Đã đóng</option>
        </select>
        <select className="staff-select" value={classFilter} onChange={(e) => setClassFilter(e.target.value)} aria-label="Lọc phân loại">
          <option value="all">Tất cả phân loại</option>
          <option value="content_error">Lỗi nội dung</option>
          <option value="technical_escalation">Lỗi kỹ thuật (Admin)</option>
        </select>
      </div>

      {loading ? (
        <Skeleton height={120} />
      ) : error ? (
        <PageErrorState title="Không thể tải danh sách báo cáo" message={error} onRetry={load} />
      ) : reports.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="Chưa có báo cáo sai sót" description="Hiện chưa có phản ánh lỗi câu hỏi, đáp án hoặc bài học nào." />
      ) : (
        <div className="staff-card">
          <div className="staff-table-wrapper">
            <table className="staff-table">
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Tiêu đề & Mô tả</th>
                  <th>Loại</th>
                  <th>Mức độ</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id}>
                    <td><code>{r.reportCode}</code></td>
                    <td>
                      <strong>{r.title}</strong>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{r.description}</div>
                    </td>
                    <td>{r.classification === 'technical_escalation' ? 'Kỹ thuật (Admin)' : 'Nội dung'}</td>
                    <td>{r.severity}</td>
                    <td><StatusBadge status={r.status === 'resolved' || r.status === 'closed' ? 'published' : 'draft'} label={r.status} /></td>
                    <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {r.status !== 'resolved' && (
                        <button type="button" className="staff-btn staff-btn-primary" style={{ padding: '4px 10px', fontSize: 12 }} disabled={updatingId === r.id} onClick={() => handleUpdate(r.id, 'resolved', r.classification)}>
                          Đã sửa
                        </button>
                      )}
                      {r.status !== 'escalated' && (
                        <button type="button" className="staff-btn staff-btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} disabled={updatingId === r.id} onClick={() => handleUpdate(r.id, 'escalated', 'technical_escalation')}>
                          Chuyển Admin
                        </button>
                      )}
                    </td>
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
