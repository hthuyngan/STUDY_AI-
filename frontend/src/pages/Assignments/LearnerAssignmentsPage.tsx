import React, { useEffect, useState, useMemo } from 'react'
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
  BookOpen,
  Award,
  ChevronRight,
  RefreshCw,
} from 'lucide-react'
import { useAuth } from '@/auth/useAuth'
import { apiClient } from '@/lib/apiClient'
import { classroomService } from '@/services/classroom.service'
import type { AssignmentDto } from '@/types/classroom'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import './LearnerAssignmentsPage.css'

export const LearnerAssignmentsPage: React.FC = () => {
  const { state: authState } = useAuth()
  const [assignments, setAssignments] = useState<AssignmentDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'submitted' | 'graded'>('all')
  const [search, setSearch] = useState('')

  // Submit / Detail Dialog
  const [selectedAsg, setSelectedAsg] = useState<AssignmentDto | null>(null)
  const [submissionContent, setSubmissionContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const loadAssignments = async (showSpinner = false) => {
    if (showSpinner) setLoading(true)
    setError(null)
    try {
      const data = await apiClient.get<AssignmentDto[]>('/api/v1/assignments')
      setAssignments(Array.isArray(data) ? data : [])
    } catch (err) {
      if (authState === 'authenticated') {
        const msg = err instanceof Error ? err.message : 'Không thể kết nối máy chủ để tải bài tập.'
        setError(msg)
        setAssignments([])
      } else {
        try {
          const fallback = await classroomService.getAssignments()
          setAssignments(
            fallback.map((f) => ({
              id: f.id,
              classroomId: f.classId,
              classroomName: f.className,
              title: f.title,
              description: f.description,
              instructions: f.instructions,
              dueDate: f.dueDate,
              maxScore: f.maxScore,
              status: f.status,
              createdByTeacherId: 'tch-01',
              createdByTeacherName: 'Giáo viên',
              submissionsCount: f.submissionsCount,
              totalStudents: f.totalStudents,
              createdAt: f.createdAt,
              updatedAt: f.createdAt,
            }))
          )
        } catch {
          setAssignments([])
        }
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authState === 'initializing') return
    let active = true

    apiClient
      .get<AssignmentDto[]>('/api/v1/assignments')
      .then((data) => {
        if (active) {
          setAssignments(Array.isArray(data) ? data : [])
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!active) return
        if (authState === 'authenticated') {
          setError(err instanceof Error ? err.message : 'Không thể kết nối máy chủ.')
          setAssignments([])
          setLoading(false)
        } else {
          classroomService
            .getAssignments()
            .then((fallback) => {
              if (active) {
                setAssignments(
                  fallback.map((f) => ({
                    id: f.id,
                    classroomId: f.classId,
                    classroomName: f.className,
                    title: f.title,
                    description: f.description,
                    instructions: f.instructions,
                    dueDate: f.dueDate,
                    maxScore: f.maxScore,
                    status: f.status,
                    createdByTeacherId: 'tch-01',
                    createdByTeacherName: 'Giáo viên',
                    submissionsCount: f.submissionsCount,
                    totalStudents: f.totalStudents,
                    createdAt: f.createdAt,
                    updatedAt: f.createdAt,
                  }))
                )
                setLoading(false)
              }
            })
            .catch(() => {
              if (active) {
                setAssignments([])
                setLoading(false)
              }
            })
        }
      })

    return () => {
      active = false
    }
  }, [authState])

  const handleOpenDetail = (asg: AssignmentDto) => {
    setSelectedAsg(asg)
    setSubmissionContent(asg.mySubmission?.content || '')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAsg) return
    if (!submissionContent.trim()) {
      alert('Vui lòng nhập nội dung bài nộp!')
      return
    }

    setSubmitting(true)
    try {
      const res = await classroomService.submitAssignment(selectedAsg.id, submissionContent.trim())
      showToast('Nộp bài tập thành công!')
      setSelectedAsg({
        ...selectedAsg,
        mySubmission: res,
      })
      await loadAssignments()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi nộp bài tập'
      alert(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      const matchesSearch =
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        (a.classroomName && a.classroomName.toLowerCase().includes(search.toLowerCase()))

      const subStatus = a.mySubmission?.status || 'pending'
      let matchesStatus = true
      if (statusFilter === 'pending') {
        matchesStatus = !a.mySubmission || subStatus === 'missing'
      } else if (statusFilter === 'submitted') {
        matchesStatus = subStatus === 'submitted'
      } else if (statusFilter === 'graded') {
        matchesStatus = subStatus === 'graded'
      }

      return matchesSearch && matchesStatus
    })
  }, [assignments, search, statusFilter])

  return (
    <div className="learner-assignments-container">
      {/* Toast */}
      {toastMessage && (
        <div className="learner-assignments-toast">
          <CheckCircle2 size={18} color="#059669" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="learner-assignments-header">
        <div>
          <h1 className="learner-assignments-title">Bài tập của tôi</h1>
          <p className="learner-assignments-subtitle">
            Theo dõi, làm bài tập và xem nhận xét chấm điểm từ giáo viên các lớp bạn tham gia
          </p>
        </div>
        <button
          className="learner-assignments-refresh-btn"
          onClick={() => void loadAssignments(true)}
          disabled={loading}
          title="Tải lại danh sách"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="learner-assignments-error-banner" data-testid="assignments-error-banner" style={{
          backgroundColor: '#fee2e2',
          border: '1px solid #ef4444',
          color: '#b91c1c',
          padding: '12px 16px',
          borderRadius: 8,
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="learner-assignments-toolbar">
        <div className="learner-assignments-tabs">
          <button
            className={`learner-tab-btn ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            Tất cả ({assignments.length})
          </button>
          <button
            className={`learner-tab-btn ${statusFilter === 'pending' ? 'active' : ''}`}
            onClick={() => setStatusFilter('pending')}
          >
            Chưa nộp ({assignments.filter((a) => !a.mySubmission || a.mySubmission.status === 'missing').length})
          </button>
          <button
            className={`learner-tab-btn ${statusFilter === 'submitted' ? 'active' : ''}`}
            onClick={() => setStatusFilter('submitted')}
          >
            Chờ chấm ({assignments.filter((a) => a.mySubmission?.status === 'submitted').length})
          </button>
          <button
            className={`learner-tab-btn ${statusFilter === 'graded' ? 'active' : ''}`}
            onClick={() => setStatusFilter('graded')}
          >
            Đã có điểm ({assignments.filter((a) => a.mySubmission?.status === 'graded').length})
          </button>
        </div>

        <div className="learner-assignments-search">
          <input
            type="text"
            placeholder="Tìm theo tên bài tập, lớp học..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Assignment List */}
      {loading ? (
        <div className="learner-assignments-loading" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Skeleton height={80} />
          <Skeleton height={80} />
          <Skeleton height={80} />
        </div>
      ) : filteredAssignments.length === 0 ? (
        <EmptyState
          title="Không có bài tập nào"
          description={
            search || statusFilter !== 'all'
              ? 'Không tìm thấy bài tập phù hợp với bộ lọc hiện tại.'
              : 'Hiện tại bạn chưa có bài tập nào được giao từ các lớp học.'
          }
        />
      ) : (
        <div className="learner-assignments-grid">
          {filteredAssignments.map((asg) => {
            const isGraded = asg.mySubmission?.status === 'graded'
            const isSubmitted = asg.mySubmission?.status === 'submitted'

            return (
              <div
                key={asg.id}
                className={`learner-assignment-card ${isGraded ? 'card-graded' : isSubmitted ? 'card-submitted' : ''}`}
                onClick={() => handleOpenDetail(asg)}
              >
                <div className="learner-asg-top">
                  <div className="learner-asg-class-badge">
                    <BookOpen size={14} />
                    <span>{asg.classroomName || 'Lớp học'}</span>
                  </div>

                  {isGraded ? (
                    <span className="learner-badge badge-graded">
                      <Award size={14} />
                      Đã chấm: {asg.mySubmission?.score} / {asg.maxScore}
                    </span>
                  ) : isSubmitted ? (
                    <span className="learner-badge badge-submitted">
                      <Clock size={14} />
                      Đã nộp (Chờ chấm)
                    </span>
                  ) : (
                    <span className="learner-badge badge-pending">
                      <AlertCircle size={14} />
                      Chưa nộp
                    </span>
                  )}
                </div>

                <h3 className="learner-asg-title">{asg.title}</h3>
                {asg.description && <p className="learner-asg-desc">{asg.description}</p>}

                <div className="learner-asg-bottom">
                  <div className="learner-asg-due">
                    <Calendar size={14} />
                    <span>Hạn nộp: {new Date(asg.dueDate).toLocaleDateString('vi-VN')}</span>
                  </div>
                  <button className="learner-asg-action-btn">
                    <span>{isGraded ? 'Xem kết quả' : isSubmitted ? 'Xem bài làm' : 'Làm bài'}</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Submission & Feedback Modal */}
      {selectedAsg && (
        <div className="learner-modal-overlay" onClick={() => setSelectedAsg(null)}>
          <div className="learner-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="learner-modal-header">
              <div>
                <span className="learner-modal-class-tag">{selectedAsg.classroomName || 'Lớp học'}</span>
                <h2 className="learner-modal-title">{selectedAsg.title}</h2>
              </div>
              <button className="learner-modal-close-btn" onClick={() => setSelectedAsg(null)}>
                ×
              </button>
            </div>

            <div className="learner-modal-body">
              {/* Due Date & Max Score strip */}
              <div className="learner-modal-info-strip">
                <div className="info-item">
                  <Calendar size={16} color="#486581" />
                  <span>Hạn nộp: <strong>{new Date(selectedAsg.dueDate).toLocaleString('vi-VN')}</strong></span>
                </div>
                <div className="info-item">
                  <Award size={16} color="#486581" />
                  <span>Thang điểm: <strong>{selectedAsg.maxScore} điểm</strong></span>
                </div>
              </div>

              {/* Instructions */}
              {selectedAsg.instructions && (
                <div className="learner-modal-instructions">
                  <h4>Hướng dẫn làm bài:</h4>
                  <p>{selectedAsg.instructions}</p>
                </div>
              )}

              {/* Graded Feedback Card */}
              {selectedAsg.mySubmission?.status === 'graded' && (
                <div className="learner-feedback-box">
                  <div className="feedback-box-top">
                    <div className="feedback-score-badge">
                      <Award size={20} color="#059669" />
                      <span>Điểm số: <strong>{selectedAsg.mySubmission.score} / {selectedAsg.maxScore}</strong></span>
                    </div>
                    <span className="feedback-time">
                      {selectedAsg.mySubmission.gradedAt &&
                        `Chấm lúc: ${new Date(selectedAsg.mySubmission.gradedAt).toLocaleString('vi-VN')}`}
                    </span>
                  </div>
                  {selectedAsg.mySubmission.feedback && (
                    <div className="feedback-content">
                      <strong>Nhận xét của giáo viên:</strong>
                      <p>{selectedAsg.mySubmission.feedback}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Submission Form */}
              <form onSubmit={handleSubmit} className="learner-submit-form">
                <label className="learner-form-label">
                  <span>Bài làm của bạn:</span>
                  {selectedAsg.mySubmission?.status === 'graded' && (
                    <span className="text-muted">(Bài tập đã được chấm điểm - Không thể chỉnh sửa)</span>
                  )}
                </label>
                <textarea
                  className="learner-submit-textarea"
                  rows={8}
                  placeholder="Nhập nội dung bài giải, các bước giải toán, hoặc câu trả lời tự luận tại đây..."
                  value={submissionContent}
                  onChange={(e) => setSubmissionContent(e.target.value)}
                  disabled={selectedAsg.mySubmission?.status === 'graded' || submitting}
                  required
                />

                <div className="learner-modal-actions">
                  <button
                    type="button"
                    className="learner-modal-cancel-btn"
                    onClick={() => setSelectedAsg(null)}
                  >
                    Đóng
                  </button>

                  {selectedAsg.mySubmission?.status !== 'graded' && (
                    <button
                      type="submit"
                      className="learner-modal-submit-btn"
                      disabled={submitting || !submissionContent.trim()}
                    >
                      <Send size={16} />
                      <span>{selectedAsg.mySubmission ? 'Cập nhật bài nộp' : 'Nộp bài'}</span>
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LearnerAssignmentsPage
