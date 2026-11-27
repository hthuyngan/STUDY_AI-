import React, { useCallback, useEffect, useState } from 'react'
import { ClipboardCheck, Plus } from 'lucide-react'
import { classroomService } from '@/services/classroom.service'
import { teacherWorkspaceService, type TeacherExamItem } from '@/services/teacherWorkspace.service'
import type { AdminClassItem } from '@/types/classroom'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageErrorState } from '@/components/ui/PageErrorState'
import { Skeleton } from '@/components/ui/Skeleton'
import { StatusBadge } from '@/components/ui/StatusBadge'
import './TeacherPages.css'

export const TeacherExamsPage: React.FC = () => {
  const [exams, setExams] = useState<TeacherExamItem[]>([])
  const [classes, setClasses] = useState<AdminClassItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [classroomId, setClassroomId] = useState('')
  const [title, setTitle] = useState('')
  const [durationMinutes, setDurationMinutes] = useState(45)
  const [shuffleQuestions, setShuffleQuestions] = useState(true)
  const [feedback, setFeedback] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [examList, classList] = await Promise.all([
        teacherWorkspaceService.getExams(),
        classroomService.getClasses(),
      ])
      setExams(examList)
      setClasses(classList)
      if (!classroomId && classList.length > 0) setClassroomId(classList[0].id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách đề kiểm tra.')
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
    setFeedback(null)
    try {
      await teacherWorkspaceService.createExam({
        classroomId,
        title,
        durationMinutes,
        shuffleQuestions,
      })
      setTitle('')
      setShowForm(false)
      setFeedback('Đã tạo đề kiểm tra Toán 12 cho lớp học.')
      await load()
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Không thể tạo đề kiểm tra.')
    }
  }

  return (
    <div className="staff-page">
      <div className="staff-page-header">
        <div className="staff-page-title-row">
          <div>
            <h1>Kiểm tra & Đề thi Toán 12</h1>
            <p className="staff-page-desc">
              Tạo đề riêng hoặc sao chép đề mẫu Content, cấu hình thời gian, đảo câu hỏi và công bố kết quả theo lớp.
            </p>
          </div>
          <div className="staff-page-actions">
            <button type="button" className="staff-btn staff-btn-primary" onClick={() => setShowForm((v) => !v)}>
              <Plus size={16} />
              <span>Tạo đề kiểm tra</span>
            </button>
          </div>
        </div>
      </div>

      {feedback && <div className="staff-card" style={{ marginBottom: 14, padding: '10px 14px' }}>{feedback}</div>}

      {showForm && (
        <form className="staff-card" style={{ marginBottom: 16 }} onSubmit={handleCreate}>
          <h2 className="staff-card-title">Thiết lập đề kiểm tra mới</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
              <span>Lớp học</span>
              <select className="staff-select" value={classroomId} onChange={(e) => setClassroomId(e.target.value)}>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
              <span>Tên đề kiểm tra</span>
              <input className="staff-input" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Kiểm tra 45 phút Chương 1" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
              <span>Thời lượng (phút)</span>
              <input className="staff-input" type="number" min={5} max={240} value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))} />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginTop: 18 }}>
              <input type="checkbox" checked={shuffleQuestions} onChange={(e) => setShuffleQuestions(e.target.checked)} />
              <span>Đảo thứ tự câu hỏi</span>
            </label>
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
            <button type="submit" className="staff-btn staff-btn-primary">Lưu đề kiểm tra</button>
            <button type="button" className="staff-btn staff-btn-secondary" onClick={() => setShowForm(false)}>Hủy</button>
          </div>
        </form>
      )}

      {loading ? (
        <Skeleton height={120} />
      ) : error ? (
        <PageErrorState title="Không thể tải đề kiểm tra" message={error} onRetry={load} />
      ) : exams.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="Chưa có đề kiểm tra" description="Tạo đề kiểm tra cho lớp Toán 12 của bạn để giao cho học sinh." />
      ) : (
        <div className="staff-card">
          <div className="staff-table-wrapper">
            <table className="staff-table">
              <thead>
                <tr>
                  <th>Tiêu đề</th>
                  <th>Thời lượng</th>
                  <th>Đảo đề</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {exams.map((ex) => (
                  <tr key={ex.id}>
                    <td><strong>{ex.title}</strong></td>
                    <td>{ex.durationMinutes} phút</td>
                    <td>{ex.shuffleQuestions ? 'Có' : 'Không'}</td>
                    <td><StatusBadge status={ex.status === 'published' ? 'published' : 'draft'} label={ex.status} /></td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      {ex.status !== 'published' && (
                        <button type="button" className="staff-btn staff-btn-primary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => teacherWorkspaceService.updateExamStatus(ex.id, 'published').then(load)}>
                          Mở đề
                        </button>
                      )}
                      {ex.status === 'published' && (
                        <button type="button" className="staff-btn staff-btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => teacherWorkspaceService.updateExamStatus(ex.id, 'closed', true).then(load)}>
                          Đóng & Công bố điểm
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
