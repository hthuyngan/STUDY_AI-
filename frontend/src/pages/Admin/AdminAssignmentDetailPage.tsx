import React, { useEffect, useState } from 'react'
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Download,
  Edit2,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { classroomService } from '@/services/classroom.service'
import type {
  AdminAssignmentItem,
  AdminSubmissionItem,
} from '@/types/classroom'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import './AdminPages.css'
import '@/components/admin/AdminComponents.css'

export const AdminAssignmentDetailPage: React.FC = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>()
  const [assignment, setAssignment] = useState<AdminAssignmentItem | null>(null)
  const [submissions, setSubmissions] = useState<AdminSubmissionItem[]>([])
  const [loading, setLoading] = useState(true)

  // Grading Modal
  const [isGradingOpen, setIsGradingOpen] = useState(false)
  const [selectedSub, setSelectedSub] = useState<AdminSubmissionItem | null>(null)
  const [gradeScore, setGradeScore] = useState<number>(10)
  const [gradeFeedback, setGradeFeedback] = useState<string>('')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const loadData = () => {
    if (!assignmentId) return
    setLoading(true)
    Promise.all([
      classroomService.getAssignmentById(assignmentId),
      classroomService.getSubmissions(assignmentId),
    ])
      .then(([asg, subs]) => {
        setAssignment(asg)
        setSubmissions(subs)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
      })
  }

  useEffect(() => {
    if (!assignmentId) return
    let active = true
    Promise.all([
      classroomService.getAssignmentById(assignmentId),
      classroomService.getSubmissions(assignmentId),
    ])
      .then(([asg, subs]) => {
        if (active) {
          setAssignment(asg)
          setSubmissions(subs)
          setLoading(false)
        }
      })
      .catch((err) => {
        console.error(err)
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [assignmentId])

  const handleOpenGradeModal = (sub: AdminSubmissionItem) => {
    setSelectedSub(sub)
    setGradeScore(sub.score !== undefined ? sub.score : 8)
    setGradeFeedback(sub.feedback || '')
    setIsGradingOpen(true)
  }

  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSub) return

    try {
      await classroomService.gradeSubmission(
        selectedSub.id,
        gradeScore,
        gradeFeedback,
        'Quản trị viên'
      )
      showToast(`Đã lưu điểm cho học viên ${selectedSub.studentName}: ${gradeScore} điểm`)
      setIsGradingOpen(false)
      loadData()
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message)
    }
  }

  const handleExportCSV = () => {
    if (!assignment) return
    const headers = ['Mã bài tập', 'Tên bài tập', 'Học viên', 'Email', 'Thời gian nộp', 'Điểm số', 'Thang điểm', 'Trạng thái', 'Nhận xét']
    const rows = submissions.map((s) => [
      assignment.id,
      assignment.title,
      s.studentName,
      s.studentEmail,
      s.submittedAt ? new Date(s.submittedAt).toLocaleString('vi-VN') : 'Chưa nộp',
      s.score !== undefined ? s.score : '',
      s.maxScore,
      s.status === 'graded' ? 'Đã chấm' : s.status === 'pending' ? 'Chờ chấm' : 'Chưa nộp',
      s.feedback || '',
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
    link.download = `Ket_qua_${assignment.title.slice(0, 20)}_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showToast('Đã xuất file bảng điểm bài tập thành công')
  }

  if (loading) {
    return (
      <div className="admin-page-container" style={{ padding: '32px' }}>
        <Skeleton height={40} width={250} />
        <div style={{ marginTop: 24 }}>
          <Skeleton height={200} />
        </div>
      </div>
    )
  }

  if (!assignment) {
    return (
      <div className="admin-page-container">
        <EmptyState
          title="Không tìm thấy bài tập"
          description="Bài tập bạn tìm kiếm không tồn tại hoặc đã bị xóa."
          actionLabel="Quay lại danh sách bài tập"
          onAction={() => window.history.back()}
        />
      </div>
    )
  }

  const submissionRate = Math.min(
    100,
    Math.round((assignment.submissionsCount / assignment.totalStudents) * 100)
  )

  return (
    <div className="admin-page-container">
      {/* Toast */}
      {toastMessage && (
        <div className="admin-toast-notification">
          <CheckCircle2 size={18} color="#047857" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="staff-page-header">
        <div style={{ marginBottom: 12 }}>
          <Link
            to="/admin/assignments"
            className="flex items-center gap-1.5 text-sm font-medium text-navy-primary hover:underline"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#102a43', fontSize: '0.88rem' }}
          >
            <ArrowLeft size={16} />
            <span>Quay lại Quản lý bài tập</span>
          </Link>
        </div>

        <div className="admin-header-row">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 className="staff-page-title" style={{ margin: 0 }}>
                {assignment.title}
              </h1>
              <span className={`status-badge ${assignment.status === 'active' ? 'status-success' : 'status-default'}`}>
                {assignment.status === 'active' ? 'Đang mở nộp' : 'Đã kết thúc'}
              </span>
            </div>
            <p className="staff-page-desc" style={{ marginTop: 6 }}>
              Lớp: <strong>{assignment.className}</strong> • Môn: <strong>{assignment.subjectName}</strong> • Hạn nộp: {new Date(assignment.dueDate).toLocaleDateString('vi-VN')}
            </p>
          </div>

          <div className="admin-header-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleExportCSV}
            >
              <Download size={16} />
              <span>Xuất kết quả bài nộp (CSV)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Overview Card */}
      <div
        className="admin-card"
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          padding: 20,
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#102a43', margin: '0 0 8px 0' }}>
              Hướng dẫn & Yêu cầu làm bài
            </h3>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#334e68', lineHeight: 1.5 }}>
              {assignment.instructions || assignment.description || 'Chưa có hướng dẫn đặc biệt cho bài tập này.'}
            </p>
          </div>

          <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ color: '#627d98' }}>Thang điểm:</span>
              <strong>{assignment.maxScore} điểm</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ color: '#627d98' }}>Tỷ lệ nộp bài:</span>
              <strong>{assignment.submissionsCount} / {assignment.totalStudents} ({submissionRate}%)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ color: '#627d98' }}>Điểm trung bình:</span>
              <strong style={{ color: '#047857' }}>{assignment.averageScore || '—'}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="staff-table-wrapper">
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#102a43', padding: '16px 20px', margin: 0, borderBottom: '1px solid #e2e8f0' }}>
          Danh sách bài nộp của học viên ({submissions.length})
        </h3>
        {submissions.length === 0 ? (
          <EmptyState
            title="Chưa có học viên nào nộp bài"
            description="Các bài nộp của học viên trong lớp sẽ xuất hiện tại đây khi được gửi lên."
          />
        ) : (
          <table className="staff-table">
            <thead>
              <tr>
                <th>Học viên</th>
                <th>Thời gian nộp</th>
                <th>Trạng thái</th>
                <th>Điểm số</th>
                <th>Nhận xét của giáo viên</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((sub) => (
                <tr key={sub.id}>
                  <td>
                    <div>
                      <strong style={{ color: '#102a43' }}>{sub.studentName}</strong>
                      <div style={{ fontSize: '0.78rem', color: '#627d98' }}>
                        {sub.studentEmail} • {sub.className}
                      </div>
                    </div>
                  </td>
                  <td>
                    {sub.submittedAt ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                        <Clock size={14} color="#627d98" />
                        <span>{new Date(sub.submittedAt).toLocaleString('vi-VN')}</span>
                      </div>
                    ) : (
                      <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.85rem' }}>Chưa nộp</span>
                    )}
                  </td>
                  <td>
                    <span
                      className={`status-badge ${
                        sub.status === 'graded'
                          ? 'status-success'
                          : sub.status === 'pending'
                          ? 'status-warning'
                          : 'status-danger'
                      }`}
                    >
                      {sub.status === 'graded' ? 'Đã chấm' : sub.status === 'pending' ? 'Chờ chấm' : 'Chưa nộp'}
                    </span>
                  </td>
                  <td>
                    <strong
                      style={{
                        fontSize: '0.95rem',
                        color: sub.score !== undefined && sub.score >= 8 ? '#047857' : sub.score !== undefined ? '#0284c7' : '#94a3b8',
                      }}
                    >
                      {sub.score !== undefined ? `${sub.score} / ${sub.maxScore}` : '—'}
                    </strong>
                  </td>
                  <td style={{ maxWidth: 260 }}>
                    <span style={{ fontSize: '0.85rem', color: '#334e68' }}>
                      {sub.feedback || '—'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                      onClick={() => handleOpenGradeModal(sub)}
                    >
                      <Edit2 size={14} style={{ marginRight: 4 }} />
                      <span>{sub.status === 'graded' ? 'Sửa điểm' : 'Chấm bài'}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Chấm Điểm */}
      {isGradingOpen && selectedSub && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true">
          <div className="admin-modal-card" style={{ maxWidth: 460 }}>
            <div className="admin-modal-header">
              <h3 className="modal-title">Chấm điểm bài nộp</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsGradingOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveGrade}>
              <div className="admin-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 6 }}>
                  <div style={{ fontWeight: 600, color: '#102a43' }}>{selectedSub.studentName}</div>
                  <div style={{ fontSize: '0.8rem', color: '#627d98' }}>{selectedSub.studentEmail} • {assignment.title}</div>
                </div>

                <div>
                  <label className="form-label" htmlFor="grade-score-input">
                    Điểm số (Thang điểm {selectedSub.maxScore}) <span className="text-danger">*</span>
                  </label>
                  <input
                    id="grade-score-input"
                    type="number"
                    step="0.1"
                    min="0"
                    max={selectedSub.maxScore}
                    className="form-input"
                    value={gradeScore}
                    onChange={(e) => setGradeScore(Number(e.target.value))}
                    required
                  />
                </div>

                <div>
                  <label className="form-label" htmlFor="grade-feedback-input">Nhận xét & Lời khuyên</label>
                  <textarea
                    id="grade-feedback-input"
                    className="form-input"
                    rows={3}
                    placeholder="Ghi nhận xét về bài làm của học viên..."
                    value={gradeFeedback}
                    onChange={(e) => setGradeFeedback(e.target.value)}
                  />
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsGradingOpen(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Lưu điểm số
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
