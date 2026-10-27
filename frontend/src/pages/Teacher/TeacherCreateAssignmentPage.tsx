import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTeacherAssignments } from '@/hooks/useTeacher'

export function TeacherCreateAssignmentPage() {
  const navigate = useNavigate()
  const { createAssignment } = useTeacherAssignments()

  const [title, setTitle] = useState('')
  const [classId, setClassId] = useState('cls-12a1')
  const [subject, setSubject] = useState('Toán học 12')
  const [lessonId, setLessonId] = useState('lesson-math-08')
  const [assessmentId, setAssessmentId] = useState('asm-math-08')
  const [dueDate, setDueDate] = useState('2026-11-05T23:59')
  const [instructions, setInstructions] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const classMap: Record<string, { name: string; count: number }> = {
    'cls-12a1': { name: 'Lớp 12A1', count: 38 },
    'cls-12a2': { name: 'Lớp 12A2', count: 35 },
    'cls-11b1': { name: 'Lớp 11B1', count: 40 },
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setSubmitting(true)
    try {
      const cls = classMap[classId] || { name: 'Lớp 12A1', count: 35 }
      await createAssignment({
        title: title.trim(),
        classId,
        className: cls.name,
        subject,
        lessonIds: [lessonId],
        assessmentId: assessmentId || undefined,
        instructions: instructions.trim() || undefined,
        dueDate: new Date(dueDate).toISOString(),
        totalStudents: cls.count,
      })
      setSuccessMessage('Giao bài tập thành công!')
      setTimeout(() => {
        navigate('/teacher/assignments')
      }, 700)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="staff-page">
      <div className="staff-page-header">
        <div className="staff-page-title-row">
          <div>
            <nav className="staff-breadcrumbs" aria-label="Breadcrumb">
              <Link to="/teacher">Giáo viên</Link>
              <span>/</span>
              <Link to="/teacher/assignments">Bài tập</Link>
              <span>/</span>
              <span aria-current="page">Giao bài tập mới</span>
            </nav>
            <h1>Giao bài tập cho học sinh</h1>
            <p className="staff-page-desc">Chỉ định bài học, bài thu hoạch và thời hạn hoàn thành cho lớp.</p>
          </div>
        </div>
      </div>

      {successMessage && (
        <div
          style={{
            padding: '12px 16px',
            marginBottom: '16px',
            borderRadius: '6px',
            background: 'var(--color-success-bg, #ebfbee)',
            color: 'var(--color-success, #2b8a3e)',
            border: '1px solid var(--color-success-border, #d3f9d8)',
            fontSize: '14px',
          }}
        >
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ maxWidth: '720px' }}>
        <div className="staff-card" style={{ display: 'grid', gap: '20px' }}>
          <div>
            <label
              htmlFor="asg-title"
              style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}
            >
              Tiêu đề bài tập <span style={{ color: 'var(--color-danger, #e03131)' }}>*</span>
            </label>
            <input
              id="asg-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Khảo sát và vẽ đồ thị hàm phân thức"
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '14px',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label
                htmlFor="asg-class"
                style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}
              >
                Lớp học áp dụng
              </label>
              <select
                id="asg-class"
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '14px',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                }}
              >
                <option value="cls-12a1">Lớp 12A1 (38 học sinh)</option>
                <option value="cls-12a2">Lớp 12A2 (35 học sinh)</option>
                <option value="cls-11b1">Lớp 11B1 (40 học sinh)</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="asg-subject"
                style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}
              >
                Môn học
              </label>
              <select
                id="asg-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '14px',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                }}
              >
                <option value="Toán học 12">Toán học 12</option>
                <option value="Toán học 11">Toán học 11</option>
                <option value="Vật lý 12">Vật lý 12</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label
                htmlFor="asg-lesson"
                style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}
              >
                Chọn bài học trọng tâm
              </label>
              <select
                id="asg-lesson"
                value={lessonId}
                onChange={(e) => setLessonId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '14px',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                }}
              >
                <option value="lesson-math-08">Bài 08: Khảo sát và vẽ đồ thị hàm số phân thức</option>
                <option value="lesson-math-01">Bài 01: Sự đồng biến, nghịch biến của hàm số</option>
                <option value="lesson-math-02">Bài 02: Cực trị của hàm số</option>
                <option value="lesson-math-03">Bài 03: Giá trị lớn nhất và nhỏ nhất</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="asg-assessment"
                style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}
              >
                Bài thu hoạch đi kèm (tùy chọn)
              </label>
              <select
                id="asg-assessment"
                value={assessmentId}
                onChange={(e) => setAssessmentId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '14px',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                }}
              >
                <option value="asm-math-08">Thu hoạch: Khảo sát hàm số (Trắc nghiệm 10 câu)</option>
                <option value="asm-math-01">Thu hoạch: Tính đơn điệu hàm số</option>
                <option value="">Không yêu cầu bài thu hoạch</option>
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="asg-due"
              style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}
            >
              Hạn nộp bài
            </label>
            <input
              id="asg-due"
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={{
                width: '100%',
                maxWidth: '320px',
                padding: '8px 12px',
                fontSize: '14px',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
              }}
            />
          </div>

          <div>
            <label
              htmlFor="asg-instructions"
              style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}
            >
              Hướng dẫn / Ghi chú cho học sinh
            </label>
            <textarea
              id="asg-instructions"
              rows={4}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="VD: Các em đọc kỹ phần tìm tiệm cận đứng và tiệm cận xiên trước khi làm bài thu hoạch."
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '14px',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                resize: 'vertical',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <Link to="/teacher/assignments" className="staff-btn staff-btn-secondary">
              Hủy
            </Link>
            <button type="submit" className="staff-btn staff-btn-primary" disabled={submitting}>
              {submitting ? 'Đang tạo...' : 'Giao bài tập'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
