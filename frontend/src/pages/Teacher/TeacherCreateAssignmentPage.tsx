import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react'
import { classroomService } from '@/services/classroom.service'
import './TeacherPages.css'
import '../Admin/AdminPages.css'
import '@/components/admin/AdminComponents.css'

export function TeacherCreateAssignmentPage() {
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [classId, setClassId] = useState('cls-12a1')
  const [subject, setSubject] = useState('Toán học 12')
  const [lessonTitle, setLessonTitle] = useState('Bài 08: Khảo sát và vẽ đồ thị hàm số phân thức')
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date(Date.now() + 7 * 86400000)
    return d.toISOString().slice(0, 10)
  })
  const [maxScore, setMaxScore] = useState<number>(10)
  const [instructions, setInstructions] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState('')

  const classMap: Record<string, { name: string; count: number }> = {
    'cls-12a1': { name: 'Lớp 12A1', count: 38 },
    'cls-12a2': { name: 'Lớp 12A2', count: 35 },
    'cls-11b1': { name: 'Lớp 11B1', count: 40 },
    'cls-10c1': { name: 'Lớp 10C1', count: 35 },
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Vui lòng nhập tiêu đề bài tập.')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const cls = classMap[classId] || { name: 'Lớp 12A1', count: 35 }
      await classroomService.saveAssignment({
        title: title.trim(),
        classId,
        className: cls.name,
        subjectName: subject,
        lessonTitle,
        instructions: instructions.trim() || undefined,
        dueDate: new Date(dueDate).toISOString(),
        totalStudents: cls.count,
        maxScore,
        status: 'active',
      })
      setSuccessMessage('Đã tạo và giao bài tập thành công cho học sinh!')
      setTimeout(() => {
        navigate('/teacher/assignments')
      }, 700)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tạo bài tập.')
      setSubmitting(false)
    }
  }

  return (
    <div className="admin-page-container">
      {/* Toast Feedback */}
      {successMessage && (
        <div className="admin-toast-notification">
          <CheckCircle2 size={18} color="#047857" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="staff-page-header">
        <div style={{ marginBottom: 12 }}>
          <Link
            to="/teacher/assignments"
            className="flex items-center gap-1.5 text-sm font-medium text-navy-primary hover:underline"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#102a43', fontSize: '0.88rem' }}
          >
            <ArrowLeft size={16} />
            <span>Quay lại Quản lý bài tập</span>
          </Link>
        </div>

        <div className="admin-header-row">
          <div>
            <h1 className="staff-page-title">Giao bài tập mới</h1>
            <p className="staff-page-desc">
              Chỉ định bài học trọng tâm, hướng dẫn làm bài và thời hạn hoàn thành cho lớp học.
            </p>
          </div>
        </div>
      </div>

      {/* Form Card (Quiet flat container, Section 31-33 compliant) */}
      <div className="admin-card teacher-form-card" style={{ maxWidth: 760, padding: 24 }}>
        {error && (
          <div className="form-error-banner" style={{ marginBottom: 20 }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 18 }}>
            <label className="form-label" htmlFor="asg-title">
              Tiêu đề bài tập <span className="text-danger">*</span>
            </label>
            <input
              id="asg-title"
              type="text"
              required
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Khảo sát và vẽ đồ thị hàm phân thức bậc nhất trên bậc nhất"
            />
          </div>

          <div className="teacher-form-grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="asg-class">
                Lớp học áp dụng <span className="text-danger">*</span>
              </label>
              <select
                id="asg-class"
                className="form-input"
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
              >
                <option value="cls-12a1">Lớp 12A1 (38 học sinh)</option>
                <option value="cls-12a2">Lớp 12A2 (35 học sinh)</option>
                <option value="cls-11b1">Lớp 11B1 (40 học sinh)</option>
                <option value="cls-10c1">Lớp 10C1 (35 học sinh)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="asg-subject">
                Môn học <span className="text-danger">*</span>
              </label>
              <select
                id="asg-subject"
                className="form-input"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              >
                <option value="Toán học 12">Toán học 12</option>
                <option value="Toán học 11">Toán học 11</option>
                <option value="Toán học 10">Toán học 10</option>
                <option value="Vật lý 12">Vật lý 12</option>
                <option value="Hóa học 12">Hóa học 12</option>
              </select>
            </div>
          </div>

          <div className="teacher-form-grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="asg-lesson">
                Bài học trọng tâm
              </label>
              <select
                id="asg-lesson"
                className="form-input"
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
              >
                <option value="Bài 08: Khảo sát và vẽ đồ thị hàm số phân thức">
                  Bài 08: Khảo sát và vẽ đồ thị hàm số phân thức
                </option>
                <option value="Bài 01: Sự đồng biến, nghịch biến của hàm số">
                  Bài 01: Sự đồng biến, nghịch biến của hàm số
                </option>
                <option value="Bài 02: Cực trị của hàm số">Bài 02: Cực trị của hàm số</option>
                <option value="Bài 03: Giá trị lớn nhất và nhỏ nhất của hàm số">
                  Bài 03: Giá trị lớn nhất và nhỏ nhất
                </option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="asg-max-score">
                Thang điểm tối đa
              </label>
              <input
                id="asg-max-score"
                type="number"
                min={1}
                max={100}
                className="form-input"
                value={maxScore}
                onChange={(e) => setMaxScore(Number(e.target.value) || 10)}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 18 }}>
            <label className="form-label" htmlFor="asg-due">
              Hạn nộp bài <span className="text-danger">*</span>
            </label>
            <input
              id="asg-due"
              type="date"
              required
              className="form-input"
              style={{ maxWidth: 280 }}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 24 }}>
            <label className="form-label" htmlFor="asg-instructions">
              Hướng dẫn / Ghi chú cho học sinh
            </label>
            <textarea
              id="asg-instructions"
              rows={4}
              className="form-input"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="VD: Các em đọc kỹ phần tìm tiệm cận đứng và tiệm cận xiên trước khi làm bài tự luận..."
            />
          </div>

          {/* Form Actions (Section 33: Only one primary, no unnecessary icons) */}
          <div className="teacher-form-actions">
            <Link to="/teacher/assignments" className="btn btn-secondary">
              Hủy
            </Link>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Đang tạo bài tập...' : 'Giao bài tập'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
