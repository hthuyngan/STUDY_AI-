import React, { useEffect, useState, useMemo } from 'react'
import {
  Search,
  CheckCircle2,
  Calendar,
  RotateCcw,
} from 'lucide-react'
import { operationsService } from '@/services/operations.service'
import type {
  ApprovalContentType,
  PublicationRecord,
} from '@/types/operations'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import '../Admin/AdminPages.css'
import '@/components/admin/AdminComponents.css'

export const ContentPublicationsPage: React.FC = () => {
  const [publications, setPublications] = useState<PublicationRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | ApprovalContentType>('all')

  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const loadData = () => {
    setLoading(true)
    operationsService
      .getPublications()
      .then((data) => {
        setPublications(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
      })
  }

  useEffect(() => {
    let active = true
    operationsService
      .getPublications()
      .then((data) => {
        if (active) {
          setPublications(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        console.error(err)
        if (active) setLoading(false)
      })

    const handleOperationsChange = () => {
      operationsService.getPublications().then((data) => {
        if (active) setPublications(data)
      })
    }
    window.addEventListener('study_ai_operations_change', handleOperationsChange)

    return () => {
      active = false
      window.removeEventListener('study_ai_operations_change', handleOperationsChange)
    }
  }, [])

  // Filtered List
  const filteredPublications = useMemo(() => {
    return publications.filter((p) => {
      const matchSearch =
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.subjectName.toLowerCase().includes(search.toLowerCase()) ||
        p.publishedBy.toLowerCase().includes(search.toLowerCase())
      const matchType = typeFilter === 'all' || p.contentType === typeFilter
      return matchSearch && matchType
    })
  }, [publications, search, typeFilter])

  const handleRollback = async (pub: PublicationRecord) => {
    const targetVersion = prompt(`Nhập phiên bản muốn khôi phục cho "${pub.title}":`, 'v1.0')
    if (!targetVersion || targetVersion === pub.version) return

    if (window.confirm(`Xác nhận khôi phục bài học "${pub.title}" từ ${pub.version} về ${targetVersion}? Hành động này sẽ được ghi vào nhật ký kiểm toán.`)) {
      try {
        await operationsService.rollbackPublication(pub.id, targetVersion, 'Demo Admin')
        showToast(`Đã khôi phục "${pub.title}" về phiên bản ${targetVersion}`)
        loadData()
      } catch (err: unknown) {
        if (err instanceof Error) alert(err.message)
      }
    }
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
        <div className="admin-header-row">
          <div>
            <h1 className="staff-page-title">Lịch sử xuất bản</h1>
            <p className="staff-page-desc">
              Theo dõi và quản lý lịch sử các phiên bản nội dung giáo dục đã phát hành chính thức trên hệ sinh thái STUDY_AI.
            </p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="admin-filter-bar">
        <div className="admin-search-input-wrap">
          <Search size={16} className="admin-search-icon" />
          <input
            type="text"
            className="admin-search-input"
            placeholder="Tìm theo tiêu đề, môn học hoặc người xuất bản..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="admin-filter-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as 'all' | ApprovalContentType)}
          aria-label="Lọc theo loại nội dung"
        >
          <option value="all">Tất cả loại nội dung</option>
          <option value="lesson">Bài học</option>
          <option value="assessment">Bài thu hoạch</option>
        </select>

        {(search || typeFilter !== 'all') && (
          <button
            type="button"
            className="admin-filter-btn-clear"
            onClick={() => {
              setSearch('')
              setTypeFilter('all')
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
        ) : filteredPublications.length === 0 ? (
          <EmptyState
            title="Chưa có bản ghi xuất bản nào"
            description="Các nội dung sau khi được phê duyệt và xuất bản sẽ được lưu vết tại đây."
          />
        ) : (
          <table className="staff-table">
            <thead>
              <tr>
                <th>Tiêu đề nội dung</th>
                <th>Loại</th>
                <th>Môn học</th>
                <th>Phiên bản</th>
                <th>Người xuất bản</th>
                <th>Ngày xuất bản</th>
                <th>Ghi chú phiên bản (Changelog)</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredPublications.map((pub) => (
                <tr key={pub.id}>
                  <td>
                    <strong style={{ color: '#102a43' }}>{pub.title}</strong>
                  </td>
                  <td>
                    <span className="status-badge status-default">
                      {pub.contentType === 'lesson' ? 'Bài học' : 'Bài thu hoạch'}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 500, color: '#334e68' }}>{pub.subjectName}</span>
                  </td>
                  <td>
                    <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                      {pub.version}
                    </code>
                  </td>
                  <td>
                    <span>{pub.publishedBy}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', color: '#627d98' }}>
                      <Calendar size={13} />
                      <span>{new Date(pub.publishedAt).toLocaleDateString('vi-VN')}</span>
                    </div>
                  </td>
                  <td style={{ maxWidth: 260 }}>
                    <span style={{ fontSize: '0.85rem', color: '#334e68' }}>
                      {pub.changelog || 'Phát hành chính thức'}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${pub.status === 'active' ? 'status-success' : 'status-default'}`}>
                      {pub.status === 'active' ? 'Đang kích hoạt' : 'Lưu trữ'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className="table-action-btn"
                      onClick={() => handleRollback(pub)}
                      title="Khôi phục phiên bản trước"
                    >
                      <RotateCcw size={16} />
                    </button>
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
