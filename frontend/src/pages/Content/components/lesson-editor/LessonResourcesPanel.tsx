import { useCallback, useEffect, useState } from 'react'
import { contentService } from '@/services/content.service'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { LessonResourceItem, LessonResourceType } from '@/types/content'

interface LessonResourcesPanelProps {
  lessonId: string
  isReviewer: boolean
}

const RESOURCE_TYPE_LABELS: Record<LessonResourceType, string> = {
  video: 'Video bài giảng',
  image: 'Hình ảnh minh họa',
  document: 'Tài liệu / PDF',
  link: 'Liên kết tham khảo',
  attachment: 'Tệp đính kèm',
}

function getSafeErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object') {
    const anyErr = err as { status?: number; message?: string; detail?: string }
    if (anyErr.status === 409) {
      return anyErr.detail || anyErr.message || 'Dữ liệu tài nguyên đã bị thay đổi bởi phiên khác (409). Vui lòng tải lại trước khi lưu.'
    }
    if (anyErr.status === 403) {
      return anyErr.detail || anyErr.message || 'Bạn không có quyền thực hiện thao tác kiểm duyệt/xuất bản này (403).'
    }
    if (anyErr.detail) return anyErr.detail
    if (anyErr.message) return anyErr.message
  }
  return fallback
}

export function LessonResourcesPanel({ lessonId, isReviewer }: LessonResourcesPanelProps) {
  const [resources, setResources] = useState<LessonResourceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isConflict, setIsConflict] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingRowVersion, setEditingRowVersion] = useState<string>('')
  const [resourceType, setResourceType] = useState<LessonResourceType>('video')
  const [title, setTitle] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [sourceName, setSourceName] = useState('')
  const [sourceLicense, setSourceLicense] = useState('')
  const [mimeType, setMimeType] = useState('')
  const [description, setDescription] = useState('')
  const [archiveConfirmId, setArchiveConfirmId] = useState<string | null>(null)

  const loadResources = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await contentService.listLessonResources(lessonId)
      setResources(res.items || [])
    } catch (err) {
      setError(getSafeErrorMessage(err, 'Không thể tải danh sách tài nguyên bài học.'))
    } finally {
      setLoading(false)
    }
  }, [lessonId])

  useEffect(() => {
    void loadResources()
  }, [loadResources])

  const resetForm = () => {
    setEditingId(null)
    setEditingRowVersion('')
    setResourceType('video')
    setTitle('')
    setSourceUrl('')
    setSourceName('')
    setSourceLicense('')
    setMimeType('')
    setDescription('')
    setIsConflict(false)
  }

  const startEdit = (item: LessonResourceItem) => {
    setEditingId(item.id)
    setEditingRowVersion(item.rowVersion)
    setResourceType(item.resourceType)
    setTitle(item.title)
    setSourceUrl(item.sourceUrl)
    setSourceName(item.sourceName || '')
    setSourceLicense(item.sourceLicense || '')
    setMimeType(item.mimeType || '')
    setDescription(item.description || '')
    setError(null)
    setIsConflict(false)
    setSuccessMsg(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsConflict(false)
    setSuccessMsg(null)

    if (!title.trim() || !sourceUrl.trim()) {
      setError('Vui lòng nhập đầy đủ tiêu đề và đường dẫn URL tài nguyên.')
      return
    }

    setSubmitting(true)
    try {
      if (editingId) {
        await contentService.updateLessonResource(editingId, {
          resourceType,
          title: title.trim(),
          sourceUrl: sourceUrl.trim(),
          sourceName: sourceName.trim() || undefined,
          sourceLicense: sourceLicense.trim() || undefined,
          mimeType: mimeType.trim() || undefined,
          description: description.trim() || undefined,
          rowVersion: editingRowVersion,
        })
        setSuccessMsg('Đã cập nhật tài nguyên bài học.')
      } else {
        await contentService.createLessonResource(lessonId, {
          resourceType,
          title: title.trim(),
          sourceUrl: sourceUrl.trim(),
          sourceName: sourceName.trim() || undefined,
          sourceLicense: sourceLicense.trim() || undefined,
          mimeType: mimeType.trim() || undefined,
          description: description.trim() || undefined,
        })
        setSuccessMsg('Đã thêm tài nguyên bài học mới.')
      }
      resetForm()
      await loadResources()
    } catch (err) {
      const status = (err as { status?: number })?.status
      if (status === 409) {
        setIsConflict(true)
      }
      setError(getSafeErrorMessage(err, 'Không thể lưu tài nguyên bài học.'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleMove = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= resources.length) return
    const next = [...resources]
    const [moved] = next.splice(index, 1)
    next.splice(targetIndex, 0, moved)

    setSubmitting(true)
    setError(null)
    setIsConflict(false)
    setSuccessMsg(null)
    try {
      const res = await contentService.reorderLessonResources(
        lessonId,
        next.map((item) => ({ resourceId: item.id, rowVersion: item.rowVersion }))
      )
      setResources(res.items || next)
      setSuccessMsg('Đã cập nhật thứ tự tài nguyên.')
    } catch (err) {
      const status = (err as { status?: number })?.status
      if (status === 409) setIsConflict(true)
      setError(getSafeErrorMessage(err, 'Không thể sắp xếp lại tài nguyên.'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleWorkflowAction = async (
    item: LessonResourceItem,
    action: 'verify' | 'reject' | 'publish' | 'unpublish' | 'archive'
  ) => {
    setSubmitting(true)
    setError(null)
    setIsConflict(false)
    setSuccessMsg(null)
    try {
      if (action === 'verify') {
        await contentService.verifyLessonResource(item.id, item.rowVersion)
        setSuccessMsg(`Đã xác minh tài nguyên "${item.title}".`)
      } else if (action === 'reject') {
        await contentService.rejectLessonResource(item.id, item.rowVersion, 'Không đạt yêu cầu kiểm duyệt')
        setSuccessMsg(`Đã từ chối tài nguyên "${item.title}".`)
      } else if (action === 'publish') {
        await contentService.publishLessonResource(item.id, item.rowVersion)
        setSuccessMsg(`Đã xuất bản tài nguyên "${item.title}".`)
      } else if (action === 'unpublish') {
        await contentService.unpublishLessonResource(item.id, item.rowVersion)
        setSuccessMsg(`Đã gỡ xuất bản tài nguyên "${item.title}".`)
      } else if (action === 'archive') {
        await contentService.archiveLessonResource(item.id, item.rowVersion)
        setArchiveConfirmId(null)
        setSuccessMsg(`Đã lưu trữ tài nguyên "${item.title}".`)
      }
      await loadResources()
    } catch (err) {
      const status = (err as { status?: number })?.status
      if (status === 409) setIsConflict(true)
      setError(getSafeErrorMessage(err, 'Thao tác trên tài nguyên thất bại.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="staff-card" aria-label="Tài nguyên & Video bài học" style={{ marginTop: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '16px' }}>Tài nguyên & Video bài học (Tùy chọn)</h3>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-ink-muted)' }}>
            Hỗ trợ video, hình ảnh, tài liệu, liên kết và tệp đính kèm. Bài học vẫn hợp lệ khi không có video/tài nguyên.
          </p>
        </div>
        <button type="button" className="staff-btn staff-btn-secondary" onClick={() => void loadResources()} disabled={loading || submitting}>
          Tải lại
        </button>
      </div>

      {error && (
        <div role="alert" style={{ padding: '10px 12px', marginBottom: '12px', borderRadius: '8px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: '13px' }}>
          <div>{error}</div>
          {isConflict && (
            <button
              type="button"
              className="staff-btn staff-btn-secondary"
              style={{ marginTop: '8px', fontSize: '12px', padding: '4px 10px' }}
              onClick={() => void loadResources()}
            >
              Tải lại dữ liệu mới nhất
            </button>
          )}
        </div>
      )}

      {successMsg && (
        <div role="status" style={{ padding: '10px 12px', marginBottom: '12px', borderRadius: '8px', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', fontSize: '13px' }}>
          {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '10px', marginBottom: '16px', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle, #e2e8f0)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
          <label style={{ display: 'grid', gap: '4px', fontSize: '13px' }}>
            <span>Loại tài nguyên</span>
            <select
              aria-label="Loại tài nguyên"
              className="staff-input"
              value={resourceType}
              onChange={(e) => setResourceType(e.target.value as LessonResourceType)}
              disabled={submitting}
            >
              {Object.entries(RESOURCE_TYPE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'grid', gap: '4px', fontSize: '13px' }}>
            <span>Tiêu đề tài nguyên</span>
            <input
              aria-label="Tiêu đề tài nguyên"
              className="staff-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Video bài giảng Hàm số"
              disabled={submitting}
            />
          </label>
        </div>

        <label style={{ display: 'grid', gap: '4px', fontSize: '13px' }}>
          <span>Đường dẫn URL (https://)</span>
          <input
            aria-label="Đường dẫn URL tài nguyên"
            className="staff-input"
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            disabled={submitting}
          />
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
          <label style={{ display: 'grid', gap: '4px', fontSize: '13px' }}>
            <span>Nguồn (tùy chọn)</span>
            <input
              aria-label="Nguồn tài nguyên"
              className="staff-input"
              type="text"
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              placeholder="VD: Khan Academy / YouTube"
              disabled={submitting}
            />
          </label>
          <label style={{ display: 'grid', gap: '4px', fontSize: '13px' }}>
            <span>Giấy phép (tùy chọn)</span>
            <input
              aria-label="Giấy phép tài nguyên"
              className="staff-input"
              type="text"
              value={sourceLicense}
              onChange={(e) => setSourceLicense(e.target.value)}
              placeholder="VD: CC BY-NC-SA 4.0"
              disabled={submitting}
            />
          </label>
          <label style={{ display: 'grid', gap: '4px', fontSize: '13px' }}>
            <span>MIME Type (tùy chọn)</span>
            <input
              aria-label="MIME Type"
              className="staff-input"
              type="text"
              value={mimeType}
              onChange={(e) => setMimeType(e.target.value)}
              placeholder="VD: application/pdf"
              disabled={submitting}
            />
          </label>
        </div>

        <label style={{ display: 'grid', gap: '4px', fontSize: '13px' }}>
          <span>Mô tả (tùy chọn)</span>
          <input
            aria-label="Mô tả tài nguyên"
            className="staff-input"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ghi chú ngắn cho tài nguyên"
            disabled={submitting}
          />
        </label>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button type="submit" className="staff-btn staff-btn-primary" disabled={submitting}>
            {editingId ? 'Lưu cập nhật tài nguyên' : 'Thêm tài nguyên'}
          </button>
          {editingId && (
            <button type="button" className="staff-btn staff-btn-secondary" onClick={resetForm} disabled={submitting}>
              Hủy sửa
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <div role="status" style={{ fontSize: '13px', color: 'var(--color-ink-muted)' }}>
          Đang tải danh sách tài nguyên...
        </div>
      ) : resources.length === 0 ? (
        <div style={{ padding: '12px', borderRadius: '8px', background: 'var(--bg-subtle, #f8fafc)', fontSize: '13px', color: 'var(--color-ink-muted)' }}>
          Bài học này chưa có tài nguyên đính kèm. Bạn có thể thêm video, hình ảnh, tài liệu hoặc giữ trống.
        </div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '10px' }}>
          {resources.map((item, idx) => (
            <li
              key={item.id}
              data-testid={`lesson-resource-item-${item.id}`}
              style={{
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle, #e2e8f0)',
                display: 'grid',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0, flex: '1 1 220px' }}>
                  <div style={{ fontWeight: 600, fontSize: '14px', wordBreak: 'break-word' }}>
                    #{idx + 1} · [{RESOURCE_TYPE_LABELS[item.resourceType] || item.resourceType}] {item.title}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-ink-muted)', wordBreak: 'break-all', marginTop: '2px' }}>
                    {item.sourceUrl}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <StatusBadge status={item.status} />
                  <span style={{ fontSize: '12px', color: 'var(--color-ink-muted)' }}>
                    Xác minh: {item.verificationStatus}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="staff-btn staff-btn-secondary"
                  style={{ fontSize: '12px', padding: '4px 8px' }}
                  onClick={() => void handleMove(idx, -1)}
                  disabled={submitting || idx === 0}
                >
                  Lên
                </button>
                <button
                  type="button"
                  className="staff-btn staff-btn-secondary"
                  style={{ fontSize: '12px', padding: '4px 8px' }}
                  onClick={() => void handleMove(idx, 1)}
                  disabled={submitting || idx === resources.length - 1}
                >
                  Xuống
                </button>
                {!item.isPublished && (
                  <button
                    type="button"
                    className="staff-btn staff-btn-secondary"
                    style={{ fontSize: '12px', padding: '4px 8px' }}
                    onClick={() => startEdit(item)}
                    disabled={submitting}
                  >
                    Sửa
                  </button>
                )}
                {isReviewer && item.verificationStatus !== 'verified' && (
                  <button
                    type="button"
                    className="staff-btn staff-btn-secondary"
                    style={{ fontSize: '12px', padding: '4px 8px' }}
                    onClick={() => void handleWorkflowAction(item, 'verify')}
                    disabled={submitting}
                  >
                    Xác minh
                  </button>
                )}
                {isReviewer && item.verificationStatus !== 'rejected' && (
                  <button
                    type="button"
                    className="staff-btn staff-btn-secondary"
                    style={{ fontSize: '12px', padding: '4px 8px' }}
                    onClick={() => void handleWorkflowAction(item, 'reject')}
                    disabled={submitting}
                  >
                    Từ chối
                  </button>
                )}
                {isReviewer && item.verificationStatus === 'verified' && !item.isPublished && (
                  <button
                    type="button"
                    className="staff-btn staff-btn-primary"
                    style={{ fontSize: '12px', padding: '4px 8px' }}
                    onClick={() => void handleWorkflowAction(item, 'publish')}
                    disabled={submitting}
                  >
                    Xuất bản
                  </button>
                )}
                {isReviewer && item.isPublished && (
                  <button
                    type="button"
                    className="staff-btn staff-btn-secondary"
                    style={{ fontSize: '12px', padding: '4px 8px' }}
                    onClick={() => void handleWorkflowAction(item, 'unpublish')}
                    disabled={submitting}
                  >
                    Gỡ xuất bản
                  </button>
                )}
                {!item.isPublished && (
                  archiveConfirmId === item.id ? (
                    <>
                      <button
                        type="button"
                        className="staff-btn staff-btn-primary"
                        style={{ fontSize: '12px', padding: '4px 8px' }}
                        onClick={() => void handleWorkflowAction(item, 'archive')}
                        disabled={submitting}
                      >
                        Xác nhận lưu trữ
                      </button>
                      <button
                        type="button"
                        className="staff-btn staff-btn-secondary"
                        style={{ fontSize: '12px', padding: '4px 8px' }}
                        onClick={() => setArchiveConfirmId(null)}
                        disabled={submitting}
                      >
                        Hủy
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="staff-btn staff-btn-secondary"
                      style={{ fontSize: '12px', padding: '4px 8px' }}
                      onClick={() => setArchiveConfirmId(item.id)}
                      disabled={submitting}
                    >
                      Lưu trữ
                    </button>
                  )
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
