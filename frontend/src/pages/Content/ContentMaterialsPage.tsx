import React, { useCallback, useEffect, useState } from 'react'
import { FileText, Plus, Search, Upload } from 'lucide-react'
import { MATH12_CHAPTERS } from '@/config/math12Scope'
import { contentWorkspaceService, type ContentMaterialItem } from '@/services/contentWorkspace.service'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageErrorState } from '@/components/ui/PageErrorState'
import { Skeleton } from '@/components/ui/Skeleton'
import { StatusBadge } from '@/components/ui/StatusBadge'
import './ContentPages.css'

const CATEGORY_LABELS: Record<string, string> = {
  pdf: 'Tài liệu PDF',
  formula_sheet: 'Bảng công thức',
  chapter_doc: 'Tài liệu theo chương',
  topic_doc: 'Tài liệu chuyên đề',
  reference_exam: 'Đề tham khảo',
  diagram: 'Hình ảnh & Đồ thị',
}

export const ContentMaterialsPage: React.FC = () => {
  const [items, setItems] = useState<ContentMaterialItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)

  const [title, setTitle] = useState('')
  const [formCategory, setFormCategory] = useState('formula_sheet')
  const [chapterCode, setChapterCode] = useState('M12-C1')
  const [fileName, setFileName] = useState('')
  const [mimeType, setMimeType] = useState('application/pdf')
  const [fileSizeBytes, setFileSizeBytes] = useState(204800)
  const [storagePathOrUrl, setStoragePathOrUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await contentWorkspaceService.getMaterials({ category, status, search })
      setItems(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách tài liệu học tập.')
    } finally {
      setLoading(false)
    }
  }, [category, status, search])

  useEffect(() => {
    void load()
  }, [load])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setFeedback(null)
    try {
      const ch = MATH12_CHAPTERS.find((c) => c.code === chapterCode)
      await contentWorkspaceService.createMaterial({
        title,
        category: formCategory,
        chapterCode,
        chapterTitle: ch?.title,
        fileName,
        mimeType,
        fileSizeBytes,
        storagePathOrUrl,
      })
      setTitle('')
      setFileName('')
      setStoragePathOrUrl('')
      setShowForm(false)
      setFeedback('Đã thêm tài liệu học tập Toán 12 mới.')
      await load()
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Không thể tạo tài liệu.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatusChange = async (id: string, nextStatus: string) => {
    try {
      await contentWorkspaceService.updateMaterialStatus(id, nextStatus)
      await load()
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Không thể cập nhật trạng thái tài liệu.')
    }
  }

  return (
    <div className="staff-page">
      <div className="staff-page-header">
        <div className="staff-page-title-row">
          <div>
            <h1>Tài liệu học tập Toán 12</h1>
            <p className="staff-page-desc">
              Quản lý PDF, bảng công thức, tài liệu theo chương/chuyên đề, đề tham khảo và đồ thị Toán 12.
            </p>
          </div>
          <div className="staff-page-actions">
            <button type="button" className="staff-btn staff-btn-primary" onClick={() => setShowForm((v) => !v)}>
              <Plus size={16} />
              <span>Thêm tài liệu</span>
            </button>
          </div>
        </div>
      </div>

      {feedback && (
        <div className="staff-card" style={{ marginBottom: 14, padding: '10px 14px' }}>
          {feedback}
        </div>
      )}

      {showForm && (
        <form className="staff-card" style={{ marginBottom: 16 }} onSubmit={handleCreate}>
          <h2 className="staff-card-title">Đăng ký tài liệu học tập mới</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
              <span>Tiêu đề tài liệu</span>
              <input className="staff-input" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Bảng công thức đạo hàm lớp 12" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
              <span>Phân loại</span>
              <select className="staff-select" value={formCategory} onChange={(e) => setFormCategory(e.target.value)}>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
              <span>Chương Toán 12</span>
              <select className="staff-select" value={chapterCode} onChange={(e) => setChapterCode(e.target.value)}>
                {MATH12_CHAPTERS.map((c) => (
                  <option key={c.code} value={c.code}>{c.code}: {c.shortTitle}</option>
                ))}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
              <span>Tên tệp</span>
              <input className="staff-input" required value={fileName} onChange={(e) => setFileName(e.target.value)} placeholder="cong-thuc-dao-ham-12.pdf" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
              <span>Loại MIME</span>
              <select className="staff-select" value={mimeType} onChange={(e) => setMimeType(e.target.value)}>
                <option value="application/pdf">application/pdf</option>
                <option value="image/png">image/png</option>
                <option value="image/jpeg">image/jpeg</option>
                <option value="text/markdown">text/markdown</option>
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
              <span>Dung lượng (bytes, tối đa 15MB)</span>
              <input className="staff-input" type="number" min={1} max={15728640} required value={fileSizeBytes} onChange={(e) => setFileSizeBytes(Number(e.target.value))} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, gridColumn: '1 / -1' }}>
              <span>Đường dẫn / URL tài liệu</span>
              <input className="staff-input" required value={storagePathOrUrl} onChange={(e) => setStoragePathOrUrl(e.target.value)} placeholder="https://cdn.studyai.vn/math12/cong-thuc-dao-ham.pdf" />
            </label>
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
            <button type="submit" className="staff-btn staff-btn-primary" disabled={submitting}>
              <Upload size={15} />
              <span>{submitting ? 'Đang lưu...' : 'Lưu tài liệu'}</span>
            </button>
            <button type="button" className="staff-btn staff-btn-secondary" onClick={() => setShowForm(false)}>
              Hủy
            </button>
          </div>
        </form>
      )}

      <div className="staff-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 240px' }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: 10, color: '#64748b' }} />
            <input
              type="search"
              className="staff-input"
              style={{ paddingLeft: 32, width: '100%' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên tài liệu hoặc tên tệp..."
              aria-label="Tìm kiếm tài liệu"
            />
          </div>
          <select className="staff-select" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Lọc theo loại">
            <option value="all">Tất cả loại</option>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select className="staff-select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Lọc theo trạng thái">
            <option value="all">Tất cả trạng thái</option>
            <option value="draft">Bản nháp</option>
            <option value="published">Đã xuất bản</option>
            <option value="archived">Đã lưu trữ</option>
          </select>
        </div>
      </div>

      {loading ? (
        <Skeleton height={140} />
      ) : error ? (
        <PageErrorState title="Không thể tải tài liệu" message={error} onRetry={load} />
      ) : items.length === 0 ? (
        <EmptyState icon={FileText} title="Chưa có tài liệu học tập" description="Hãy thêm tài liệu PDF, bảng công thức hoặc đề tham khảo Toán 12." />
      ) : (
        <div className="staff-card">
          <div className="staff-table-wrapper">
            <table className="staff-table">
              <thead>
                <tr>
                  <th>Tiêu đề</th>
                  <th>Loại</th>
                  <th>Chương</th>
                  <th>Tệp & Kích thước</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.title}</strong></td>
                    <td>{CATEGORY_LABELS[item.category] || item.category}</td>
                    <td>{item.chapterCode || 'Toàn bộ Toán 12'}</td>
                    <td>
                      <div style={{ fontSize: 13 }}>{item.fileName}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{Math.round(item.fileSizeBytes / 1024)} KB · {item.mimeType}</div>
                    </td>
                    <td><StatusBadge status={item.status === 'published' ? 'published' : item.status === 'archived' ? 'archived' : 'draft'} label={item.status} /></td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      {item.status !== 'published' && (
                        <button type="button" className="staff-btn staff-btn-primary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => handleStatusChange(item.id, 'published')}>
                          Xuất bản
                        </button>
                      )}
                      {item.status !== 'archived' && (
                        <button type="button" className="staff-btn staff-btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => handleStatusChange(item.id, 'archived')}>
                          Lưu trữ
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
