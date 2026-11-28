import React, { useCallback, useEffect, useState } from 'react'
import { BookOpen, Plus, Trash2 } from 'lucide-react'
import { classroomService } from '@/services/classroom.service'
import { teacherWorkspaceService, type ClassroomMaterialItem } from '@/services/teacherWorkspace.service'
import type { AdminClassItem } from '@/types/classroom'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageErrorState } from '@/components/ui/PageErrorState'
import { Skeleton } from '@/components/ui/Skeleton'
import { StatusBadge } from '@/components/ui/StatusBadge'
import './TeacherPages.css'

export const TeacherMaterialsPage: React.FC = () => {
  const [materials, setMaterials] = useState<ClassroomMaterialItem[]>([])
  const [classes, setClasses] = useState<AdminClassItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [classroomId, setClassroomId] = useState('')
  const [title, setTitle] = useState('')
  const [fileName, setFileName] = useState('')
  const [storagePathOrUrl, setStoragePathOrUrl] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [mats, cls] = await Promise.all([
        teacherWorkspaceService.getMaterials(),
        classroomService.getClasses(),
      ])
      setMaterials(mats)
      setClasses(cls)
      if (!classroomId && cls.length > 0) setClassroomId(cls[0].id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải tài liệu giảng dạy.')
    } finally {
      setLoading(false)
    }
  }, [classroomId])

  useEffect(() => {
    void load()
  }, [load])

  const [submitting, setSubmitting] = useState(false)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!classroomId || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await teacherWorkspaceService.createMaterial({
        classroomId,
        title,
        category: 'lecture_note',
        fileName,
        mimeType: 'application/pdf',
        fileSizeBytes: 102400,
        storagePathOrUrl,
      })
      setTitle('')
      setFileName('')
      setStoragePathOrUrl('')
      setShowForm(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải lên tài liệu lớp học.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="staff-page">
      <div className="staff-page-header">
        <div className="staff-page-title-row">
          <div>
            <h1>Tài liệu giảng dạy</h1>
            <p className="staff-page-desc">
              Chia sẻ tài liệu riêng cho từng lớp học Toán 12 và thu hồi quyền truy cập khi cần.
            </p>
          </div>
          <div className="staff-page-actions">
            <button type="button" className="staff-btn staff-btn-primary" onClick={() => setShowForm((v) => !v)}>
              <Plus size={16} />
              <span>Thêm tài liệu lớp</span>
            </button>
          </div>
        </div>
      </div>

      {showForm && (
        <form className="staff-card" style={{ marginBottom: 16 }} onSubmit={handleCreate}>
          <h2 className="staff-card-title">Chia sẻ tài liệu riêng cho lớp</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <select className="staff-select" value={classroomId} onChange={(e) => setClassroomId(e.target.value)}>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input className="staff-input" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tiêu đề tài liệu" />
            <input className="staff-input" required value={fileName} onChange={(e) => setFileName(e.target.value)} placeholder="ten-tai-lieu.pdf" />
            <input className="staff-input" required value={storagePathOrUrl} onChange={(e) => setStoragePathOrUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button type="submit" className="staff-btn staff-btn-primary">Chia sẻ</button>
            <button type="button" className="staff-btn staff-btn-secondary" onClick={() => setShowForm(false)}>Hủy</button>
          </div>
        </form>
      )}

      {loading ? (
        <Skeleton height={120} />
      ) : error ? (
        <PageErrorState title="Không thể tải tài liệu" message={error} onRetry={load} />
      ) : materials.length === 0 ? (
        <EmptyState icon={BookOpen} title="Chưa có tài liệu giảng dạy" description="Tải lên tài liệu riêng hoặc sử dụng tài liệu Toán 12 đã xuất bản." />
      ) : (
        <div className="staff-card">
          <div className="staff-table-wrapper">
            <table className="staff-table">
              <thead>
                <tr>
                  <th>Tiêu đề</th>
                  <th>Tệp</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((m) => (
                  <tr key={m.id}>
                    <td><strong>{m.title}</strong></td>
                    <td>{m.fileName}</td>
                    <td><StatusBadge status={m.isRevoked ? 'archived' : 'published'} label={m.isRevoked ? 'Đã thu hồi' : 'Đang chia sẻ'} /></td>
                    <td>
                      {!m.isRevoked && (
                        <button type="button" className="staff-btn staff-btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => teacherWorkspaceService.revokeMaterial(m.id).then(load)}>
                          <Trash2 size={13} /> Thu hồi
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
