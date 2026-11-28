import React, { useEffect, useState } from 'react'
import { Bot, Send } from 'lucide-react'
import { classroomService } from '@/services/classroom.service'
import { teacherWorkspaceService, type TeacherAiAssistantResponse } from '@/services/teacherWorkspace.service'
import type { AdminClassItem } from '@/types/classroom'
import './TeacherPages.css'

export const TeacherAiAssistantPage: React.FC = () => {
  const [classes, setClasses] = useState<AdminClassItem[]>([])
  const [classroomId, setClassroomId] = useState('')
  const [mode, setMode] = useState<'lesson_plan' | 'generate_exercises' | 'exam_matrix' | 'feedback_draft'>('lesson_plan')
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<TeacherAiAssistantResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    classroomService.getClasses().then((cls) => {
      setClasses(cls)
      if (cls.length > 0) setClassroomId(cls[0].id)
    }).catch(() => {
      // Handled when submitting
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!classroomId || !prompt.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await teacherWorkspaceService.runAiAssistant({ classroomId, mode, prompt })
      setResponse(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể kết nối AI Trợ giảng.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="staff-page">
      <div className="staff-page-header">
        <div className="staff-page-title-row">
          <div>
            <h1>AI Trợ giảng Toán 12</h1>
            <p className="staff-page-desc">
              Soạn giáo án, sinh bài tập, gợi ý ma trận đề và nhận xét học sinh dựa trên dữ liệu lớp được phép truy cập.
            </p>
          </div>
        </div>
      </div>

      <form className="staff-card" onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
            <span>Lớp học áp dụng</span>
            <select className="staff-select" value={classroomId} onChange={(e) => setClassroomId(e.target.value)}>
              {classes.length === 0 ? <option value="">Chưa có lớp học</option> : classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
            <span>Chế độ trợ giảng</span>
            <select className="staff-select" value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
              <option value="lesson_plan">Soạn giáo án Toán 12</option>
              <option value="generate_exercises">Sinh bài tập & câu hỏi</option>
              <option value="exam_matrix">Tạo ma trận đề kiểm tra</option>
              <option value="feedback_draft">Gợi ý nhận xét & ôn tập</option>
            </select>
          </label>
        </div>
        <textarea
          className="staff-input"
          rows={4}
          style={{ width: '100%' }}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Nhập yêu cầu cho AI Trợ giảng (VD: Tạo 5 câu hỏi vận dụng về cực trị hàm bậc 3)..."
          required
        />
        <div style={{ marginTop: 12 }}>
          <button type="submit" className="staff-btn staff-btn-primary" disabled={loading || !classroomId}>
            <Send size={15} />
            <span>{loading ? 'Đang xử lý...' : 'Gửi AI Trợ giảng'}</span>
          </button>
        </div>
      </form>

      {error && <div className="staff-card" style={{ marginTop: 14, color: '#dc2626' }}>{error}</div>}

      {response && (
        <div className="staff-card" style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Bot size={18} />
            <strong>Kết quả từ AI Trợ giảng ({response.classroomName} · {response.studentCount} HS)</strong>
          </div>
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0, lineHeight: 1.6 }}>{response.content}</pre>
        </div>
      )}
    </div>
  )
}
