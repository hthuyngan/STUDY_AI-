import React, { useEffect, useState, useMemo } from 'react'
import {
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Globe,
  RefreshCw,
  RotateCcw,
  Send,
  AlertCircle,
} from 'lucide-react'
import {
  contentQuestionBankService,
  type ContentQuestionItem,
  type QuestionStatsResponse,
  type CreateQuestionPayload,
} from '@/services/contentQuestionBank.service'
import { educationService } from '@/services/education.service'
import type { CurriculumSubjectItem } from '@/types/education'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { SummaryStrip } from '@/components/ui/SummaryStrip'
import { MathView } from '@/components/common/MathView'
import './ContentPages.css'
import '../Admin/AdminPages.css'

export const ContentQuestionBankPage: React.FC = () => {
  const [questions, setQuestions] = useState<ContentQuestionItem[]>([])
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 15
  const [stats, setStats] = useState<QuestionStatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [subjects, setSubjects] = useState<CurriculumSubjectItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [gradeFilter, setGradeFilter] = useState('all')
  const [difficultyFilter, setDifficultyFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [showDeleted, setShowDeleted] = useState(false)

  // Modals & Dialogs
  const [previewItem, setPreviewItem] = useState<ContentQuestionItem | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ContentQuestionItem | null>(null)
  const [rejectItem, setRejectItem] = useState<ContentQuestionItem | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  // Form State
  const [formCode, setFormCode] = useState('')
  const [formPrompt, setFormPrompt] = useState('')
  const [formType, setFormType] = useState('multiple-choice')
  const [formDifficulty, setFormDifficulty] = useState('medium')
  const [formGrade, setFormGrade] = useState('12')
  const [formSubjectId, setFormSubjectId] = useState('')
  const [formLessonId, setFormLessonId] = useState('')
  const [formTopic, setFormTopic] = useState('')
  const [formOptions, setFormOptions] = useState<string[]>(['', '', '', ''])
  const [formCorrectAnswer, setFormCorrectAnswer] = useState('')
  const [formExplanation, setFormExplanation] = useState('')
  const [formImageUrl, setFormImageUrl] = useState('')
  const [formSourceType, setFormSourceType] = useState('manual')
  const [formStatus, setFormStatus] = useState('published')
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const [refreshToken, setRefreshToken] = useState(0)

  const refreshData = () => {
    setLoading(true)
    setRefreshToken((prev) => prev + 1)
  }

  // Keyboard Escape handler to close dialogs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFormOpen(false)
        setPreviewItem(null)
        setRejectItem(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Fetch Stats & Subjects
  useEffect(() => {
    let active = true
    Promise.all([
      educationService.getSubjects(),
      contentQuestionBankService.getStatistics(),
    ])
      .then(([subs, st]) => {
        if (active) {
          setSubjects(subs)
          setStats(st)
        }
      })
      .catch((err: any) => {
        console.error('Failed to load metadata:', err)
      })

    return () => {
      active = false
    }
  }, [refreshToken])

  // Fetch Questions
  useEffect(() => {
    let active = true
    contentQuestionBankService
      .getQuestions({
        subjectId: subjectFilter,
        grade: gradeFilter,
        difficulty: difficultyFilter,
        type: typeFilter,
        status: statusFilter,
        sourceType: sourceFilter,
        search,
        includeDeleted: showDeleted,
        page,
        pageSize,
      })
      .then((res) => {
        if (active) {
          setQuestions(res.items)
          setTotalQuestions(res.total)
          setLoading(false)
        }
      })
      .catch((err: any) => {
        if (active) {
          setError(err?.message || 'Không thể tải danh sách câu hỏi.')
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [
    subjectFilter,
    gradeFilter,
    difficultyFilter,
    typeFilter,
    statusFilter,
    sourceFilter,
    search,
    showDeleted,
    page,
    pageSize,
    refreshToken,
  ])

  // Open Create Dialog
  const handleOpenCreate = () => {
    setEditingItem(null)
    setFormCode('')
    setFormPrompt('')
    setFormType('multiple-choice')
    setFormDifficulty('medium')
    setFormGrade('12')
    setFormSubjectId(subjects.length > 0 ? subjects[0].id : '')
    setFormLessonId('')
    setFormTopic('')
    setFormOptions(['Phương án A', 'Phương án B', 'Phương án C', 'Phương án D'])
    setFormCorrectAnswer('Phương án A')
    setFormExplanation('')
    setFormImageUrl('')
    setFormSourceType('manual')
    setFormStatus('published')
    setFormError(null)
    setFormOpen(true)
  }

  // Open Edit Dialog
  const handleOpenEdit = (q: ContentQuestionItem) => {
    setEditingItem(q)
    setFormCode(q.code || '')
    setFormPrompt(q.prompt)
    setFormType(q.type)
    setFormDifficulty(q.difficulty)
    setFormGrade(q.grade || '12')
    setFormSubjectId(q.subjectId || '')
    setFormLessonId(q.lessonId || '')
    setFormTopic(q.topic || '')
    setFormOptions(q.options && q.options.length > 0 ? [...q.options] : ['', ''])
    setFormCorrectAnswer(q.correctAnswer)
    setFormExplanation(q.explanation || '')
    setFormImageUrl(q.imageUrl || '')
    setFormSourceType(q.sourceType || 'manual')
    setFormStatus(q.status)
    setFormError(null)
    setFormOpen(true)
  }

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!formPrompt.trim()) {
      setFormError('Vui lòng nhập nội dung câu hỏi.')
      return
    }

    if (formType === 'multiple-choice' || formType === 'single-choice') {
      const validOpts = formOptions.filter((o) => o.trim())
      if (validOpts.length < 2) {
        setFormError('Câu hỏi trắc nghiệm một đáp án yêu cầu ít nhất 2 phương án.')
        return
      }
      if (!validOpts.includes(formCorrectAnswer.trim())) {
        setFormError('Đáp án đúng phải trùng khớp với một trong các phương án.')
        return
      }
    } else if (formType === 'multiple-select') {
      const validOpts = formOptions.filter((o) => o.trim())
      if (validOpts.length < 2) {
        setFormError('Câu hỏi trắc nghiệm nhiều đáp án yêu cầu ít nhất 2 phương án.')
        return
      }
      if (!formCorrectAnswer.trim()) {
        setFormError('Vui lòng nhập các đáp án đúng (ngăn cách bởi dấu phẩy).')
        return
      }
    } else if (formType === 'true-false' || formType === 'short-answer') {
      if (!formCorrectAnswer.trim()) {
        setFormError('Vui lòng nhập đáp án chuẩn.')
        return
      }
    }

    setSubmitting(true)
    try {
      const payload: CreateQuestionPayload = {
        code: formCode.trim() || undefined,
        prompt: formPrompt.trim(),
        type: formType,
        difficulty: formDifficulty,
        grade: formGrade,
        subjectId: formSubjectId || undefined,
        lessonId: formLessonId || undefined,
        topic: formTopic.trim() || undefined,
        options: formType === 'short-answer' || formType === 'essay' ? [] : formOptions.filter((o) => o.trim()),
        correctAnswer: formCorrectAnswer.trim(),
        explanation: formExplanation.trim() || undefined,
        imageUrl: formImageUrl.trim() || undefined,
        sourceType: formSourceType,
        status: formStatus,
      }

      if (editingItem) {
        // Exclude status from direct update payload so moderation workflow endpoints (/approve, /publish) are respected
        const { status: _status, ...updatePayload } = payload
        await contentQuestionBankService.updateQuestion(editingItem.id, updatePayload)
        showToast('Đã cập nhật câu hỏi thành công!')
      } else {
        await contentQuestionBankService.createQuestion(payload)
        showToast('Đã tạo câu hỏi mới thành công!')
      }

      setFormOpen(false)
      refreshData()
    } catch (err: any) {
      setFormError(err?.message || 'Có lỗi xảy ra khi lưu câu hỏi.')
    } finally {
      setSubmitting(false)
    }
  }

  // Actions
  const handleSoftDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa mềm câu hỏi này vào thùng rác?')) return
    try {
      await contentQuestionBankService.deleteQuestion(id)
      showToast('Đã chuyển câu hỏi vào thùng rác.')
      refreshData()
    } catch (err: any) {
      alert(err?.message || 'Không thể xóa câu hỏi.')
    }
  }

  const handleRestore = async (id: string) => {
    try {
      await contentQuestionBankService.restoreQuestion(id)
      showToast('Đã khôi phục câu hỏi thành công!')
      refreshData()
    } catch (err: any) {
      alert(err?.message || 'Không thể khôi phục câu hỏi.')
    }
  }

  const handleSubmitReview = async (id: string) => {
    try {
      await contentQuestionBankService.submitReview(id)
      showToast('Đã gửi câu hỏi vào hàng đợi kiểm duyệt.')
      refreshData()
    } catch (err: any) {
      alert(err?.message || 'Lỗi khi gửi kiểm duyệt.')
    }
  }

  const handleApprove = async (id: string) => {
    try {
      await contentQuestionBankService.approveQuestion(id)
      showToast('Đã phê duyệt câu hỏi thành công!')
      refreshData()
    } catch (err: any) {
      alert(err?.message || 'Lỗi khi phê duyệt.')
    }
  }

  const handlePublish = async (id: string) => {
    try {
      await contentQuestionBankService.publishQuestion(id)
      showToast('Đã xuất bản câu hỏi thành công!')
      refreshData()
    } catch (err: any) {
      alert(err?.message || 'Lỗi khi xuất bản.')
    }
  }

  const handleUnpublish = async (id: string) => {
    try {
      await contentQuestionBankService.unpublishQuestion(id)
      showToast('Đã gỡ xuất bản câu hỏi.')
      refreshData()
    } catch (err: any) {
      alert(err?.message || 'Lỗi khi gỡ xuất bản.')
    }
  }

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rejectItem) return
    if (!rejectReason.trim()) {
      alert('Vui lòng nhập lý do từ chối.')
      return
    }
    try {
      await contentQuestionBankService.rejectQuestion(rejectItem.id, rejectReason.trim())
      showToast('Đã từ chối câu hỏi kèm lý do.')
      setRejectItem(null)
      setRejectReason('')
      refreshData()
    } catch (err: any) {
      alert(err?.message || 'Lỗi khi từ chối.')
    }
  }

  const totalPages = Math.max(1, Math.ceil(totalQuestions / pageSize))

  // Summary Strip KPIs
  const kpiItems = useMemo(() => {
    if (!stats) return []
    return [
      { id: 'total', label: 'Tổng số câu hỏi', value: stats.totalQuestions, color: '#102a43' },
      { id: 'published', label: 'Đã xuất bản', value: stats.publishedCount, color: '#16a34a' },
      { id: 'approved', label: 'Đã phê duyệt', value: stats.approvedCount, color: '#0284c7' },
      { id: 'inReview', label: 'Chờ duyệt', value: stats.inReviewCount, color: '#d97706' },
      { id: 'draft', label: 'Bản nháp', value: stats.draftCount, color: '#64748b' },
      { id: 'deleted', label: 'Thùng rác', value: stats.deletedCount, color: '#dc2626' },
    ]
  }, [stats])

  return (
    <div className="staff-page">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            backgroundColor: '#102a43',
            color: '#ffffff',
            padding: '10px 18px',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="staff-page-header">
        <div className="staff-page-title-row">
          <div>
            <h1>Ngân hàng câu hỏi giáo dục</h1>
            <p className="staff-page-desc">
              Quản lý kho câu hỏi chuẩn GDPT 2018, hỗ trợ 5 định dạng toán học LaTeX, quy trình kiểm duyệt và xuất bản dành cho Content Specialist.
            </p>
          </div>
          <div className="staff-page-actions">
            <button
              type="button"
              className={`staff-btn ${showDeleted ? 'staff-btn-primary' : 'staff-btn-secondary'}`}
              onClick={() => setShowDeleted(!showDeleted)}
            >
              <Trash2 size={15} />
              {showDeleted ? 'Đang xem thùng rác' : 'Thùng rác'}
            </button>
            <button type="button" className="staff-btn staff-btn-primary" onClick={handleOpenCreate}>
              <Plus size={16} />
              Soạn câu hỏi mới
            </button>
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      {stats && <SummaryStrip items={kpiItems} ariaLabel="Thống kê ngân hàng câu hỏi" />}

      {/* Filter Toolbar */}
      <div
        className="staff-card"
        style={{ marginTop: '14px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}
      >
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ flex: '1 1 240px', position: 'relative' }}>
            <Search
              size={15}
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
            />
            <input
              type="text"
              placeholder="Tìm theo nội dung, mã câu hỏi, chủ đề..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              style={{
                width: '100%',
                height: '34px',
                paddingLeft: '32px',
                paddingRight: '12px',
                fontSize: '13px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                outline: 'none',
              }}
            />
          </div>

          {/* Subject Filter */}
          <select
            value={subjectFilter}
            onChange={(e) => {
              setSubjectFilter(e.target.value)
              setPage(1)
            }}
            style={{ height: '34px', padding: '0 10px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
          >
            <option value="all">Tất cả môn học</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Grade Filter */}
          <select
            value={gradeFilter}
            onChange={(e) => {
              setGradeFilter(e.target.value)
              setPage(1)
            }}
            style={{ height: '34px', padding: '0 10px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
          >
            <option value="all">Tất cả khối lớp</option>
            <option value="12">Lớp 12</option>
            <option value="11">Lớp 11</option>
            <option value="10">Lớp 10</option>
          </select>

          {/* Difficulty Filter */}
          <select
            value={difficultyFilter}
            onChange={(e) => {
              setDifficultyFilter(e.target.value)
              setPage(1)
            }}
            style={{ height: '34px', padding: '0 10px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
          >
            <option value="all">Tất cả độ khó</option>
            <option value="nhan_biet">Nhận biết</option>
            <option value="thong_hieu">Thông hiểu</option>
            <option value="van_dung">Vận dụng</option>
            <option value="van_dung_cao">Vận dụng cao</option>
            <option value="easy">Dễ (Easy)</option>
            <option value="medium">Trung bình (Medium)</option>
            <option value="hard">Khó (Hard)</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value)
              setPage(1)
            }}
            style={{ height: '34px', padding: '0 10px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
          >
            <option value="all">Tất cả dạng câu hỏi</option>
            <option value="multiple-choice">Trắc nghiệm đơn (1 đáp án)</option>
            <option value="multiple-select">Trắc nghiệm nhiều đáp án</option>
            <option value="true-false">Đúng / Sai</option>
            <option value="short-answer">Trả lời ngắn</option>
            <option value="essay">Tự luận</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(1)
            }}
            style={{ height: '34px', padding: '0 10px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="draft">Bản nháp</option>
            <option value="in-review">Chờ kiểm duyệt</option>
            <option value="approved">Đã phê duyệt</option>
            <option value="published">Đã xuất bản</option>
            <option value="rejected">Bị từ chối</option>
          </select>

          {/* Source Filter */}
          <select
            value={sourceFilter}
            onChange={(e) => {
              setSourceFilter(e.target.value)
              setPage(1)
            }}
            style={{ height: '34px', padding: '0 10px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
          >
            <option value="all">Mọi nguồn</option>
            <option value="manual">Biên soạn thủ công</option>
            <option value="ai-generated">AI sinh tự động</option>
            <option value="csv">Nhập từ CSV</option>
            <option value="json">Nhập từ JSON</option>
            <option value="vnhsge">VNHSGE (Bộ đề chuẩn)</option>
          </select>

          <button
            type="button"
            className="staff-btn staff-btn-secondary"
            onClick={() => {
              setSearch('')
              setSubjectFilter('all')
              setGradeFilter('all')
              setDifficultyFilter('all')
              setTypeFilter('all')
              setStatusFilter('all')
              setSourceFilter('all')
              setShowDeleted(false)
              setPage(1)
            }}
          >
            <RotateCcw size={14} />
            Đặt lại
          </button>
        </div>
      </div>

      {/* Main Content Table */}
      <div className="staff-card" style={{ marginTop: '14px', padding: '0' }}>
        {loading ? (
          <div style={{ padding: '24px' }}>
            <Skeleton height={40} />
            <div style={{ marginTop: '12px' }}>
              <Skeleton height={200} />
            </div>
          </div>
        ) : error ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#dc2626' }}>
            <AlertCircle size={32} style={{ margin: '0 auto 8px' }} />
            <p>{error}</p>
            <button type="button" className="staff-btn staff-btn-secondary" onClick={refreshData}>
              Thử lại
            </button>
          </div>
        ) : questions.length === 0 ? (
          <EmptyState
            title={showDeleted ? 'Thùng rác trống' : 'Không tìm thấy câu hỏi phù hợp'}
            description="Hãy thử thay đổi điều kiện tìm kiếm hoặc nhấn nút Soạn câu hỏi mới."
          />
        ) : (
          <div className="staff-table-wrapper">
            <table className="staff-table">
              <thead>
                <tr>
                  <th style={{ width: '130px' }}>Mã / Khối</th>
                  <th>Nội dung câu hỏi & Công thức</th>
                  <th style={{ width: '150px' }}>Định dạng / Độ khó</th>
                  <th style={{ width: '130px' }}>Môn học</th>
                  <th style={{ width: '120px' }}>Trạng thái</th>
                  <th style={{ width: '130px' }}>Nguồn gốc</th>
                  <th style={{ width: '130px', textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {questions.map((q) => (
                  <tr key={q.id}>
                    <td>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          fontFamily: 'monospace',
                          color: 'var(--color-navy-dark, #102a43)',
                          display: 'block',
                        }}
                      >
                        {q.code || q.id.slice(0, 10)}
                      </span>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        Lớp {q.grade || '12'} • v{q.version}
                      </span>
                    </td>
                    <td>
                      <div style={{ maxHeight: '72px', overflow: 'hidden', textOverflow: 'ellipsis', overflowWrap: 'break-word' }}>
                        <div style={{ fontSize: '13.5px', color: '#0f172a', fontWeight: 500, lineHeight: 1.4 }}>
                          <MathView math={q.prompt.length > 150 ? `${q.prompt.slice(0, 150)}...` : q.prompt} />
                        </div>
                      </div>
                      {q.explanation && (
                        <div style={{ marginTop: '4px', fontSize: '12px', color: '#64748b', fontStyle: 'italic', overflowWrap: 'break-word' }}>
                          Lời giải: <MathView math={q.explanation.length > 70 ? `${q.explanation.slice(0, 70)}...` : q.explanation} />
                        </div>
                      )}
                    </td>
                    <td>
                      <span
                        style={{
                          display: 'inline-block',
                          fontSize: '11.5px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: '#f1f5f9',
                          fontWeight: 600,
                          color: '#334155',
                          marginBottom: '3px',
                        }}
                      >
                        {q.type === 'multiple-choice'
                          ? 'Trắc nghiệm đơn'
                          : q.type === 'multiple-select'
                          ? 'Nhiều đáp án'
                          : q.type === 'true-false'
                          ? 'Đúng / Sai'
                          : q.type === 'short-answer'
                          ? 'Trả lời ngắn'
                          : 'Tự luận'}
                      </span>
                      <br />
                      <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                        {q.difficulty === 'nhan_biet' || q.difficulty === 'easy'
                          ? 'Nhận biết'
                          : q.difficulty === 'thong_hieu' || q.difficulty === 'medium'
                          ? 'Thông hiểu'
                          : q.difficulty === 'van_dung' || q.difficulty === 'hard'
                          ? 'Vận dụng'
                          : 'Vận dụng cao'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                        {q.subjectName || q.subjectId || 'Toán học'}
                      </span>
                      {q.lessonTitle && (
                        <span style={{ display: 'block', fontSize: '11px', color: '#64748b' }}>
                          {q.lessonTitle}
                        </span>
                      )}
                    </td>
                    <td>
                      <StatusBadge
                        status={q.isDeleted ? 'archived' : (q.status as any)}
                        label={
                          q.isDeleted
                            ? 'Đã xóa'
                            : q.status === 'published'
                            ? 'Đã xuất bản'
                            : q.status === 'approved'
                            ? 'Đã duyệt'
                            : q.status === 'in-review'
                            ? 'Chờ duyệt'
                            : q.status === 'rejected'
                            ? 'Từ chối'
                            : 'Bản nháp'
                        }
                      />
                      {q.rejectionReason && (
                        <span style={{ display: 'block', fontSize: '10.5px', color: '#dc2626', marginTop: '2px' }}>
                          Lý do: {q.rejectionReason}
                        </span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: '12px', fontWeight: 500, color: '#475569' }}>
                        {q.sourceType === 'manual'
                          ? 'Thủ công'
                          : q.sourceType === 'ai-generated'
                          ? 'AI sinh'
                          : q.sourceType === 'vnhsge'
                          ? 'VNHSGE'
                          : q.sourceType}
                      </span>
                      <span
                        style={{
                          display: 'block',
                          fontSize: '10px',
                          color: q.copyrightStatus === 'verified' ? '#16a34a' : '#d97706',
                        }}
                      >
                        {q.copyrightStatus === 'verified'
                          ? 'Bản quyền: Hợp lệ'
                          : q.copyrightStatus === 'proprietary'
                          ? 'Bản quyền: Nội bộ'
                          : 'Bản quyền: Chờ xác minh'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="staff-btn staff-btn-secondary"
                          style={{ padding: '0 8px', height: '28px' }}
                          title="Xem trước"
                          aria-label="Xem trước câu hỏi"
                          onClick={() => setPreviewItem(q)}
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          type="button"
                          className="staff-btn staff-btn-secondary"
                          style={{ padding: '0 8px', height: '28px' }}
                          title="Chỉnh sửa"
                          aria-label="Chỉnh sửa câu hỏi"
                          onClick={() => handleOpenEdit(q)}
                        >
                          <Edit2 size={13} />
                        </button>

                        {/* Workflow quick actions */}
                        {!q.isDeleted && q.status === 'draft' && (
                          <button
                            type="button"
                            className="staff-btn staff-btn-secondary"
                            style={{ padding: '0 8px', height: '28px', color: '#0284c7' }}
                            title="Gửi kiểm duyệt"
                            aria-label="Gửi kiểm duyệt"
                            onClick={() => handleSubmitReview(q.id)}
                          >
                            <Send size={13} />
                          </button>
                        )}

                        {!q.isDeleted && q.status === 'in-review' && (
                          <>
                            <button
                              type="button"
                              className="staff-btn staff-btn-secondary"
                              style={{ padding: '0 8px', height: '28px', color: '#16a34a' }}
                              title="Phê duyệt (Content Primacy)"
                              aria-label="Phê duyệt câu hỏi"
                              onClick={() => handleApprove(q.id)}
                            >
                              <CheckCircle2 size={13} />
                            </button>
                            <button
                              type="button"
                              className="staff-btn staff-btn-secondary"
                              style={{ padding: '0 8px', height: '28px', color: '#dc2626' }}
                              title="Từ chối"
                              aria-label="Từ chối câu hỏi"
                              onClick={() => setRejectItem(q)}
                            >
                              <XCircle size={13} />
                            </button>
                          </>
                        )}

                        {!q.isDeleted && q.status === 'approved' && (
                          <button
                            type="button"
                            className="staff-btn staff-btn-primary"
                            style={{ padding: '0 8px', height: '28px' }}
                            title="Xuất bản"
                            aria-label="Xuất bản câu hỏi"
                            onClick={() => handlePublish(q.id)}
                          >
                            <Globe size={13} />
                          </button>
                        )}

                        {!q.isDeleted && q.status === 'published' && (
                          <button
                            type="button"
                            className="staff-btn staff-btn-secondary"
                            style={{ padding: '0 8px', height: '28px' }}
                            title="Gỡ xuất bản"
                            aria-label="Gỡ xuất bản câu hỏi"
                            onClick={() => handleUnpublish(q.id)}
                          >
                            <RotateCcw size={13} />
                          </button>
                        )}

                        {q.isDeleted ? (
                          <button
                            type="button"
                            className="staff-btn staff-btn-secondary"
                            style={{ padding: '0 8px', height: '28px', color: '#16a34a' }}
                            title="Khôi phục"
                            aria-label="Khôi phục câu hỏi"
                            onClick={() => handleRestore(q.id)}
                          >
                            <RefreshCw size={13} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="staff-btn staff-btn-secondary"
                            style={{ padding: '0 8px', height: '28px', color: '#dc2626' }}
                            title="Xóa mềm"
                            aria-label="Xóa mềm câu hỏi"
                            onClick={() => handleSoftDelete(q.id)}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 18px',
            borderTop: '1px solid #e2e8f0',
            fontSize: '13px',
            color: '#64748b',
          }}
        >
          <div>
            Hiển thị <strong>{questions.length}</strong> / <strong>{totalQuestions}</strong> câu hỏi (Trang {page} / {totalPages})
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button
              type="button"
              className="staff-btn staff-btn-secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{ height: '30px', padding: '0 10px' }}
            >
              Trước
            </button>
            <button
              type="button"
              className="staff-btn staff-btn-secondary"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              style={{ height: '30px', padding: '0 10px' }}
            >
              Sau
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: CREATE / EDIT QUESTION */}
      {formOpen && (
        <div className="staff-modal-overlay">
          <div className="staff-modal" style={{ maxWidth: '820px', width: '90%' }}>
            <div className="staff-modal-header">
              <h2>{editingItem ? `Chỉnh sửa câu hỏi (${formCode || editingItem.id.slice(0, 8)})` : 'Soạn câu hỏi mới'}</h2>
              <button type="button" className="staff-modal-close" onClick={() => setFormOpen(false)}>
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveQuestion}>
              <div className="staff-modal-body" style={{ maxHeight: '72vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {formError && (
                  <div style={{ padding: '10px 14px', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '6px', fontSize: '13px' }}>
                    {formError}
                  </div>
                )}

                {/* Row 1: Code, Subject, Grade, Type */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
                  <div>
                    <label className="staff-form-label">Mã câu hỏi</label>
                    <input
                      type="text"
                      className="staff-input"
                      placeholder="VD: Q-TOAN12-001"
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="staff-form-label">Môn học</label>
                    <select className="staff-input" value={formSubjectId} onChange={(e) => setFormSubjectId(e.target.value)}>
                      <option value="">Chọn môn học</option>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="staff-form-label">Khối lớp</label>
                    <select className="staff-input" value={formGrade} onChange={(e) => setFormGrade(e.target.value)}>
                      <option value="12">Lớp 12</option>
                      <option value="11">Lớp 11</option>
                      <option value="10">Lớp 10</option>
                    </select>
                  </div>

                  <div>
                    <label className="staff-form-label">Định dạng câu hỏi</label>
                    <select className="staff-input" value={formType} onChange={(e) => setFormType(e.target.value)}>
                      <option value="multiple-choice">Trắc nghiệm đơn (1 đáp án)</option>
                      <option value="multiple-select">Trắc nghiệm nhiều đáp án</option>
                      <option value="true-false">Đúng / Sai</option>
                      <option value="short-answer">Trả lời ngắn</option>
                      <option value="essay">Tự luận</option>
                    </select>
                  </div>
                </div>

                {/* Row 2: Difficulty, Topic, Source, Status */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
                  <div>
                    <label className="staff-form-label">Mức độ nhận thức</label>
                    <select className="staff-input" value={formDifficulty} onChange={(e) => setFormDifficulty(e.target.value)}>
                      <option value="nhan_biet">Nhận biết (Easy)</option>
                      <option value="thong_hieu">Thông hiểu (Medium)</option>
                      <option value="van_dung">Vận dụng (Hard)</option>
                      <option value="van_dung_cao">Vận dụng cao (Advanced)</option>
                    </select>
                  </div>

                  <div>
                    <label className="staff-form-label">Chủ đề kiến thức</label>
                    <input
                      type="text"
                      className="staff-input"
                      placeholder="VD: Cực trị hàm số"
                      value={formTopic}
                      onChange={(e) => setFormTopic(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="staff-form-label">Nguồn dữ liệu</label>
                    <select className="staff-input" value={formSourceType} onChange={(e) => setFormSourceType(e.target.value)}>
                      <option value="manual">Biên soạn thủ công</option>
                      <option value="ai-generated">AI sinh tự động</option>
                      <option value="vnhsge">Bộ đề VNHSGE</option>
                    </select>
                  </div>

                  <div>
                    <label className="staff-form-label">Trạng thái khởi tạo</label>
                    <select className="staff-input" value={formStatus} onChange={(e) => setFormStatus(e.target.value)}>
                      <option value="draft">Bản nháp</option>
                      <option value="in-review">Chờ duyệt</option>
                      <option value="approved">Đã phê duyệt</option>
                      <option value="published">Xuất bản ngay</option>
                    </select>
                  </div>
                </div>

                {/* Prompt (Question Stem) */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label className="staff-form-label" style={{ margin: 0 }}>
                      Nội dung câu hỏi (Hỗ trợ KaTeX công thức toán: $...$) *
                    </label>
                  </div>
                  <textarea
                    rows={4}
                    className="staff-input"
                    placeholder="VD: Cho hàm số $y = f(x)$ có bảng biến thiên như sau. Tìm số điểm cực trị của hàm số?"
                    value={formPrompt}
                    onChange={(e) => setFormPrompt(e.target.value)}
                    style={{ fontFamily: 'inherit', resize: 'vertical' }}
                  />
                  {formPrompt && (
                    <div style={{ marginTop: '6px', padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px dashed #cbd5e1' }}>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '2px' }}>
                        Xem trước công thức (KaTeX):
                      </span>
                      <MathView math={formPrompt} />
                    </div>
                  )}
                </div>

                {/* Options (For Multiple Choice / Multiple Select / True False) */}
                {(formType === 'multiple-choice' || formType === 'multiple-select' || formType === 'true-false') && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label className="staff-form-label" style={{ margin: 0 }}>
                        Các phương án lựa chọn ({formOptions.length} phương án)
                      </label>
                      {formType !== 'true-false' && (
                        <button
                          type="button"
                          className="staff-btn staff-btn-secondary"
                          style={{ height: '26px', fontSize: '11.5px', padding: '0 8px' }}
                          onClick={() => setFormOptions([...formOptions, ''])}
                        >
                          + Thêm phương án
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {formOptions.map((opt, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ width: '24px', fontWeight: 700, fontSize: '13px', color: '#102a43' }}>
                            {String.fromCharCode(65 + idx)}.
                          </span>
                          <input
                            type="text"
                            className="staff-input"
                            placeholder={`Nội dung phương án ${String.fromCharCode(65 + idx)}`}
                            value={opt}
                            onChange={(e) => {
                              const next = [...formOptions]
                              next[idx] = e.target.value
                              setFormOptions(next)
                            }}
                          />
                          {formOptions.length > 2 && formType !== 'true-false' && (
                            <button
                              type="button"
                              className="staff-btn staff-btn-secondary"
                              style={{ height: '34px', color: '#dc2626', padding: '0 10px' }}
                              onClick={() => setFormOptions(formOptions.filter((_, i) => i !== idx))}
                            >
                              &times;
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Correct Answer */}
                <div>
                  <label className="staff-form-label">
                    Đáp án đúng *{' '}
                    {formType === 'multiple-choice' && '(Chọn đúng phương án bên trên)'}
                    {formType === 'multiple-select' && '(Nhập các đáp án đúng, ngăn cách bởi dấu phẩy)'}
                    {formType === 'short-answer' && '(Nhập số hoặc giá trị biểu thức)'}
                  </label>
                  {formType === 'multiple-choice' ? (
                    <select
                      className="staff-input"
                      value={formCorrectAnswer}
                      onChange={(e) => setFormCorrectAnswer(e.target.value)}
                    >
                      <option value="">-- Chọn đáp án đúng --</option>
                      {formOptions
                        .filter((o) => o.trim())
                        .map((opt, idx) => (
                          <option key={idx} value={opt}>
                            {String.fromCharCode(65 + idx)}: {opt}
                          </option>
                        ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      className="staff-input"
                      placeholder="VD: 3 hoặc A, C hoặc 1/2"
                      value={formCorrectAnswer}
                      onChange={(e) => setFormCorrectAnswer(e.target.value)}
                    />
                  )}
                </div>

                {/* Explanation */}
                <div>
                  <label className="staff-form-label">Lời giải và giải thích chi tiết (Hỗ trợ KaTeX)</label>
                  <textarea
                    rows={3}
                    className="staff-input"
                    placeholder="VD: Áp dụng công thức đạo hàm hàm hợp..."
                    value={formExplanation}
                    onChange={(e) => setFormExplanation(e.target.value)}
                    style={{ fontFamily: 'inherit', resize: 'vertical' }}
                  />
                  {formExplanation && (
                    <div style={{ marginTop: '6px', padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px dashed #cbd5e1' }}>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '2px' }}>
                        Xem trước lời giải:
                      </span>
                      <MathView math={formExplanation} />
                    </div>
                  )}
                </div>

                {/* Image URL */}
                <div>
                  <label className="staff-form-label">Hình ảnh đính kèm (URL nếu có)</label>
                  <input
                    type="text"
                    className="staff-input"
                    placeholder="https://.../do_thi.png"
                    value={formImageUrl}
                    onChange={(e) => setFormImageUrl(e.target.value)}
                  />
                  {formImageUrl && (
                    <div style={{ marginTop: '6px' }}>
                      <img
                        src={formImageUrl}
                        alt="Preview"
                        style={{ maxHeight: '120px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="staff-modal-footer">
                <button type="button" className="staff-btn staff-btn-secondary" onClick={() => setFormOpen(false)}>
                  Hủy bỏ
                </button>
                <button type="submit" className="staff-btn staff-btn-primary" disabled={submitting}>
                  {submitting ? 'Đang lưu...' : editingItem ? 'Lưu cập nhật' : 'Tạo câu hỏi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PREVIEW QUESTION */}
      {previewItem && (
        <div className="staff-modal-overlay">
          <div className="staff-modal" style={{ maxWidth: '700px', width: '90%' }}>
            <div className="staff-modal-header">
              <h2>Xem trước câu hỏi [{previewItem.code || previewItem.id}]</h2>
              <button type="button" className="staff-modal-close" onClick={() => setPreviewItem(null)}>
                &times;
              </button>
            </div>
            <div className="staff-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                <StatusBadge status={previewItem.status as any} label={previewItem.status} />
                <span style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '4px', backgroundColor: '#f1f5f9', fontWeight: 600 }}>
                  Lớp {previewItem.grade || '12'}
                </span>
                <span style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '4px', backgroundColor: '#f1f5f9', fontWeight: 600 }}>
                  Dạng: {previewItem.type}
                </span>
                <span style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '4px', backgroundColor: '#f1f5f9', fontWeight: 600 }}>
                  Độ khó: {previewItem.difficulty}
                </span>
              </div>

              <div style={{ fontSize: '15px', color: '#102a43', fontWeight: 600, marginBottom: '16px', lineHeight: 1.5 }}>
                <MathView math={previewItem.prompt} />
              </div>

              {previewItem.imageUrl && (
                <div style={{ marginBottom: '16px' }}>
                  <img src={previewItem.imageUrl} alt="Đính kèm" style={{ maxWidth: '100%', maxHeight: '240px', borderRadius: '6px' }} />
                </div>
              )}

              {previewItem.options && previewItem.options.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                  {previewItem.options.map((opt, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '6px',
                        border: opt === previewItem.correctAnswer ? '2px solid #16a34a' : '1px solid #e2e8f0',
                        backgroundColor: opt === previewItem.correctAnswer ? '#f0fdf4' : '#ffffff',
                        fontSize: '13.5px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <strong style={{ color: opt === previewItem.correctAnswer ? '#16a34a' : '#102a43' }}>
                        {String.fromCharCode(65 + idx)}.
                      </strong>
                      <MathView math={opt} />
                    </div>
                  ))}
                </div>
              )}

              <div style={{ padding: '12px 14px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#16a34a', marginBottom: '4px' }}>
                  Đáp án chuẩn: {previewItem.correctAnswer}
                </div>
                {previewItem.explanation && (
                  <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
                    <strong>Lời giải:</strong> <MathView math={previewItem.explanation} />
                  </div>
                )}
              </div>
            </div>
            <div className="staff-modal-footer">
              <button type="button" className="staff-btn staff-btn-secondary" onClick={() => setPreviewItem(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REJECT REASON */}
      {rejectItem && (
        <div className="staff-modal-overlay">
          <div className="staff-modal" style={{ maxWidth: '500px', width: '90%' }}>
            <div className="staff-modal-header">
              <h2>Từ chối câu hỏi [{rejectItem.code || rejectItem.id}]</h2>
              <button type="button" className="staff-modal-close" onClick={() => setRejectItem(null)}>
                &times;
              </button>
            </div>
            <form onSubmit={handleRejectSubmit}>
              <div className="staff-modal-body">
                <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 10px' }}>
                  Vui lòng cung cấp lý do từ chối để tác giả có thể điều chỉnh và gửi lại kiểm duyệt:
                </p>
                <textarea
                  rows={3}
                  className="staff-input"
                  placeholder="VD: Công thức toán bị lỗi cú pháp KaTeX, thiếu đáp án chuẩn..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  required
                />
              </div>
              <div className="staff-modal-footer">
                <button type="button" className="staff-btn staff-btn-secondary" onClick={() => setRejectItem(null)}>
                  Hủy
                </button>
                <button type="submit" className="staff-btn staff-btn-primary" style={{ backgroundColor: '#dc2626' }}>
                  Xác nhận từ chối
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
