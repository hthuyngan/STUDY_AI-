import React, { useEffect, useState, useMemo } from 'react'
import {
  Search,
  Download,
  CheckCircle2,
  Clock,
  Shield,
} from 'lucide-react'
import { operationsService } from '@/services/operations.service'
import type { AuditLogEntry } from '@/types/operations'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import './AdminPages.css'
import '@/components/admin/AdminComponents.css'

export const AdminAuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [workspaceFilter, setWorkspaceFilter] = useState('all')
  const [actionFilter, setActionFilter] = useState('all')

  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  useEffect(() => {
    let active = true
    operationsService
      .getAuditLogs()
      .then((data) => {
        if (active) {
          setLogs(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        console.error(err)
        if (active) setLoading(false)
      })

    const handleOperationsChange = () => {
      operationsService.getAuditLogs().then((data) => {
        if (active) setLogs(data)
      })
    }
    window.addEventListener('study_ai_operations_change', handleOperationsChange)

    return () => {
      active = false
      window.removeEventListener('study_ai_operations_change', handleOperationsChange)
    }
  }, [])

  // Filtered List
  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      const matchSearch =
        l.target.toLowerCase().includes(search.toLowerCase()) ||
        l.actor.toLowerCase().includes(search.toLowerCase()) ||
        l.action.toLowerCase().includes(search.toLowerCase()) ||
        (l.details && l.details.toLowerCase().includes(search.toLowerCase()))
      const matchWs = workspaceFilter === 'all' || l.workspace === workspaceFilter
      const matchAct = actionFilter === 'all' || l.action.toLowerCase().includes(actionFilter.toLowerCase())
      return matchSearch && matchWs && matchAct
    })
  }, [logs, search, workspaceFilter, actionFilter])

  const handleExportCSV = () => {
    const headers = ['Thời gian', 'Người thực hiện', 'Không gian (Workspace)', 'Hành động', 'Đối tượng', 'Mã đối tượng', 'Kết quả', 'Chi tiết']
    const rows = filteredLogs.map((l) => [
      new Date(l.timestamp).toLocaleString('vi-VN'),
      l.actor,
      l.workspace.toUpperCase(),
      l.action,
      l.target,
      l.targetId || '',
      l.result === 'success' ? 'Thành công' : l.result === 'warning' ? 'Cảnh báo' : 'Thất bại',
      l.details || '',
    ])

    const csvContent =
      '\uFEFF' +
      [
        headers.join(','),
        ...rows.map((row) =>
          row
            .map((val) => {
              const str = String(val ?? '')
              if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`
              }
              return str
            })
            .join(',')
        ),
      ].join('\r\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Nhat_ky_kiem_toan_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showToast('Đã xuất file CSV nhật ký kiểm toán thành công')
  }

  return (
    <div className="admin-page-container">
      {/* Toast */}
      {toastMessage && (
        <div className="admin-toast-notification">
          <CheckCircle2 size={18} color="#047857" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="staff-page-header">
        <div className="admin-prototype-badge">
          <span className="prototype-dot"></span>
          <span>ADMIN WORKSPACE • VẬN HÀNH & HỖ TRỢ</span>
        </div>
        <div className="admin-header-row">
          <div>
            <h1 className="staff-page-title">Nhật ký quản trị (Audit Logs)</h1>
            <p className="staff-page-desc">
              Theo dõi lịch sử toàn bộ các thao tác chỉnh sửa, phê duyệt, xuất bản và phân công trên hệ thống.
            </p>
          </div>
          <div className="admin-header-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleExportCSV}
            >
              <Download size={16} />
              <span>Xuất nhật ký (CSV)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Demo Sandbox Banner */}
      <div
        style={{
          padding: '12px 18px',
          background: 'rgba(2, 132, 199, 0.08)',
          border: '1px solid rgba(2, 132, 199, 0.2)',
          borderRadius: 8,
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Shield size={20} color="#0284c7" style={{ flexShrink: 0 }} />
        <div style={{ fontSize: '0.85rem', color: '#0369a1', lineHeight: 1.45 }}>
          <strong>Nhật ký demo:</strong> Toàn bộ thao tác mutation (phê duyệt, giao bài, phân công ticket, đổi cài đặt) được lưu vết trên trình duyệt để kiểm tra quy trình vận hành và kiểm soát chất lượng, không phải hệ thống audit bảo mật production.
        </div>
      </div>

      {/* Filter Bar */}
      <div className="admin-filter-bar">
        <div className="admin-search-input-wrap">
          <Search size={16} className="admin-search-icon" />
          <input
            type="text"
            className="admin-search-input"
            placeholder="Tìm theo đối tượng, người thực hiện hoặc hành động..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="admin-filter-select"
          value={workspaceFilter}
          onChange={(e) => setWorkspaceFilter(e.target.value)}
          aria-label="Lọc theo không gian"
        >
          <option value="all">Tất cả không gian (Workspaces)</option>
          <option value="admin">Quản trị (Admin)</option>
          <option value="content">Nội dung (Content)</option>
          <option value="teacher">Giáo viên (Teacher)</option>
          <option value="support">Hỗ trợ (Support)</option>
        </select>

        {(search || workspaceFilter !== 'all' || actionFilter !== 'all') && (
          <button
            type="button"
            className="admin-filter-btn-clear"
            onClick={() => {
              setSearch('')
              setWorkspaceFilter('all')
              setActionFilter('all')
            }}
          >
            Xóa bộ lọc
          </button>
        )}
      </div>

      {/* Table */}
      <div className="staff-table-wrapper">
        {loading ? (
          <div style={{ padding: '24px' }}>
            <Skeleton height={48} />
          </div>
        ) : filteredLogs.length === 0 ? (
          <EmptyState
            title="Chưa có bản ghi nhật ký nào"
            description="Các thao tác thêm, sửa, xóa, duyệt và cấu hình sẽ được tự động ghi lại tại đây."
          />
        ) : (
          <table className="staff-table">
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Người thực hiện</th>
                <th>Không gian</th>
                <th>Hành động</th>
                <th>Đối tượng thao tác</th>
                <th>Kết quả</th>
                <th>Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', color: '#627d98' }}>
                      <Clock size={13} />
                      <span>{new Date(log.timestamp).toLocaleString('vi-VN')}</span>
                    </div>
                  </td>
                  <td>
                    <strong style={{ fontSize: '0.88rem', color: '#102a43' }}>{log.actor}</strong>
                  </td>
                  <td>
                    <span className="status-badge status-default" style={{ textTransform: 'uppercase', fontSize: '0.75rem' }}>
                      {log.workspace}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: '#334e68' }}>{log.action}</span>
                  </td>
                  <td>
                    <div>
                      <span style={{ fontSize: '0.88rem', color: '#102a43' }}>{log.target}</span>
                      {log.targetId && (
                        <div style={{ fontSize: '0.75rem', color: '#627d98' }}>
                          ID: <code>{log.targetId}</code>
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <span
                      className={`status-badge ${
                        log.result === 'success'
                          ? 'status-success'
                          : log.result === 'warning'
                          ? 'status-warning'
                          : 'status-danger'
                      }`}
                    >
                      {log.result === 'success' ? 'Thành công' : log.result === 'warning' ? 'Cảnh báo' : 'Thất bại'}
                    </span>
                  </td>
                  <td style={{ maxWidth: 280 }}>
                    <span style={{ fontSize: '0.82rem', color: '#486581' }}>
                      {log.details || '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
