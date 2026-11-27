import React, { useCallback, useEffect, useState } from 'react'
import { Bell, Pin, Plus } from 'lucide-react'
import { classroomService } from '@/services/classroom.service'
import { teacherWorkspaceService, type ClassroomAnnouncementItem } from '@/services/teacherWorkspace.service'
import type { AdminClassItem } from '@/types/classroom'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageErrorState } from '@/components/ui/PageErrorState'
import { Skeleton } from '@/components/ui/Skeleton'
import './TeacherPages.css'

export const TeacherAnnouncementsPage: React.FC = () => {
  const [announcements, setAnnouncements] = useState<ClassroomAnnouncementItem[]>([])
  const [classes, setClasses] = useState<AdminClassItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [classroomId, setClassroomId] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [isPinned, setIsPinned] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [anns, cls] = await Promise.all([
        teacherWorkspaceService.getAnnouncements(),
        classroomService.getClasses(),
      ])
      setAnnouncements(anns)
      setClasses(cls)
      if (!classroomId && cls.length > 0) setClassroomId(cls[0].id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải thông báo lớp học.')
    } finally {
      setLoading(false)
    }
  }, [classroomId])

  useEffect(() => {
    void load()
  }, [load])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!classroomId) return
    await teacherWorkspaceService.createAnnouncement({ classroomId, title, body, isPinned })
    setTitle('')
    setBody('')
    setIsPinned(false)
    setShowForm(false)
    await load()
  }

  return (
    <div className="staff-page">
      <div className="staff-page-header">
        <div className="staff-page-title-row">
          <div>
            <h1>Thông báo lớp học</h1>
            <p className="staff-page-desc">
              Gửi và ghim thông báo quan trọng tới học sinh trong các lớp Toán 12 phụ trách.
            </p>
          </div>
          <div className="staff-page-actions">
            <button type="button" className="staff-btn staff-btn-primary" onClick={() => setShowForm((v) => !v)}>
              <Plus size={16} />
              <span>Tạo thông báo</span>
            </button>
          </div>
        </div>
      </div>

      {showForm && (
        <form className="staff-card" style={{ marginBottom: 16 }} onSubmit={handleCreate}>
          <h2 className="staff-card-title">Soạn thông báo mới</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <select className="staff-select" value={classroomId} onChange={(e) => setClassroomId(e.target.value)}>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input className="staff-input" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tiêu đề thông báo" />
            <textarea className="staff-input" rows={3} required value={body} onChange={(e) => setBody(e.target.value)} placeholder="Nội dung thông báo..." />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <input type="checkbox" checked={isPinned} onChange={(e) => setIsPinned(e.target.checked)} />
              <span>Ghim thông báo lên đầu lớp</span>
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="staff-btn staff-btn-primary">Đăng thông báo</button>
              <button type="button" className="staff-btn staff-btn-secondary" onClick={() => setShowForm(false)}>Hủy</button>
            </div>
          </div>
        </form>
      )}

      {loading ? (
        <Skeleton height={120} />
      ) : error ? (
        <PageErrorState title="Không thể tải thông báo" message={error} onRetry={load} />
      ) : announcements.length === 0 ? (
        <EmptyState icon={Bell} title="Chưa có thông báo lớp học" description="Tạo thông báo để nhắc lịch kiểm tra hoặc dặn dò học sinh." />
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {announcements.map((a) => (
            <div key={a.id} className="staff-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>{a.title}</strong>
                {a.isPinned && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#0284c7' }}><Pin size={13} /> Đã ghim</span>}
              </div>
              <p style={{ margin: '8px 0 4px', fontSize: 14 }}>{a.body}</p>
              <div style={{ fontSize: 12, color: '#64748b' }}>{new Date(a.createdAt).toLocaleString('vi-VN')}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
