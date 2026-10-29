import React, { useEffect, useState, useCallback } from 'react'
import {
  CheckSquare,
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  FileQuestion,
  HelpCircle,
  Globe,
  Send,
  MoreHorizontal,
} from 'lucide-react'
import { educationService } from '@/services/education.service'
import type {
  CurriculumAssessmentItem,
  CurriculumSubjectItem,
  CurriculumLessonItem,
  ContentStatus,
  AssessmentQuestionItem,
} from '@/types/education'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import './ContentPages.css'
import '../Admin/AdminPages.css'
import '@/components/admin/AdminComponents.css'

export const ContentAssessmentsPage: React.FC = () => {
  const [assessments, setAssessments] = useState<CurriculumAssessmentItem[]>([])
  const [subjects, setSubjects] = useState<CurriculumSubjectItem[]>([])
  const [lessons, setLessons] = useState<CurriculumLessonItem[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | ContentStatus>('all')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Preview Modal State
  const [previewItem, setPreviewItem] = useState<CurriculumAssessmentItem | null>(null)

  // Add Question Dialog State
  const [questionTargetId, setQuestionTargetId] = useState<string | null>(null)
  const [qPrompt, setQPrompt] = useState('')
  const [qTopic, setQTopic] = useState('')
  const [optA, setOptA] = useState('')
  const [optB, setOptB] = useState('')
  const [optC, setOptC] = useState('')
  const [optD, setOptD] = useState('')
  const [correctOpt, setCorrectOpt] = useState('opt-a')
  const [qExplanation, setQExplanation] = useState('')
  const [qError, setQError] = useState<string | null>(null)

  // Create / Edit Assessment Dialog State
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingAssessment, setEditingAssessment] = useState<CurriculumAssessmentItem | null>(null)
  const [formLessonId, setFormLessonId] = useState('')
  const [formDuration, setFormDuration] = useState(15)
  const [formPassingScore, setFormPassingScore] = useState(60)
  const [formStatus, setFormStatus] = useState<ContentStatus>('published')
  const [formError, setFormError] = useState<string | null>(null)

  // Action Menu Dropdown State
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  // Listen for Escape key and outside clicks to dismiss modals and dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.action-dropdown-wrap')) {
        setOpenMenuId(null)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenMenuId(null)
        if (previewItem) setPreviewItem(null)
        if (questionTargetId) setQuestionTargetId(null)
        if (isFormOpen) setIsFormOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('click', handleClickOutside)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [previewItem, questionTargetId, isFormOpen])

  // Lock body scroll when any modal is open
  useEffect(() => {
    const isAnyModalOpen = Boolean(previewItem || questionTargetId || isFormOpen)
    if (isAnyModalOpen) {
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [previewItem, questionTargetId, isFormOpen])

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  const loadData = useCallback(() => {
    setLoading(true)
    Promise.all([
      educationService.getSubjects(),
      educationService.getLessons(),
      educationService.getAssessments({
        subjectId: subjectFilter,
        status: statusFilter,
        search,
      }),
    ]).then(([subjList, lList, asmList]) => {
      setSubjects(subjList)
      setLessons(lList)
      setAssessments(asmList)
      setLoading(false)
    })
  }, [subjectFilter, statusFilter, search])

  useEffect(() => {
    let active = true
    Promise.all([
      educationService.getSubjects(),
      educationService.getLessons(),
      educationService.getAssessments({
        subjectId: subjectFilter,
        status: statusFilter,
        search,
      }),
    ]).then(([subjList, lList, asmList]) => {
      if (active) {
        setSubjects(subjList)
        setLessons(lList)
        setAssessments(asmList)
        setLoading(false)
      }
    })
    return () => {
      active = false
    }
  }, [subjectFilter, statusFilter, search])

  const openCreateDialog = () => {
    setEditingAssessment(null)
    setFormLessonId(lessons[0]?.id || '')
    setFormDuration(15)
    setFormPassingScore(60)
    setFormStatus('published')
    setFormError(null)
    setIsFormOpen(true)
  }

  const openEditDialog = (asm: CurriculumAssessmentItem) => {
    setEditingAssessment(asm)
    setFormLessonId(asm.lessonId)
    setFormDuration(asm.durationMinutes || 15)
    setFormPassingScore(asm.passingScore || 60)
    setFormStatus(asm.status)
    setFormError(null)
    setIsFormOpen(true)
  }

  const handleSaveAssessment = async (e: React.FormEvent) => {
    e.preventDefault()
    const selectedLesson = lessons.find((l) => l.id === formLessonId)
    if (!selectedLesson) {
      setFormError('Vui lòng chọn bài học liên kết.')
      return
    }

    if (editingAssessment) {
      await educationService.updateAssessment(editingAssessment.id, {
        lessonId: formLessonId,
        lessonTitle: selectedLesson.title,
        subjectId: selectedLesson.subjectId,
        subjectName: selectedLesson.subjectName,
        chapterId: selectedLesson.chapterId,
        chapterName: selectedLesson.chapterName,
        durationMinutes: Number(formDuration),
        passingScore: Number(formPassingScore),
        status: formStatus,
      })
      showToast('Đã cập nhật bài thu hoạch thành công!')
    } else {
      await educationService.createAssessment({
        lessonId: formLessonId,
        lessonTitle: selectedLesson.title,
        subjectId: selectedLesson.subjectId,
        subjectName: selectedLesson.subjectName,
        chapterId: selectedLesson.chapterId,
        chapterName: selectedLesson.chapterName,
        questionCount: 0,
        passingScore: Number(formPassingScore),
        durationMinutes: Number(formDuration),
        status: formStatus,
        questions: [],
      })
      showToast(`Đã tạo bài thu hoạch cho bài: ${selectedLesson.title}`)
    }

    setIsFormOpen(false)
    loadData()
  }

  const handleStatusToggle = async (id: string, newStatus: ContentStatus, title: string) => {
    await educationService.changeAssessmentStatus(id, newStatus)
    showToast(`Đã cập nhật trạng thái bài thu hoạch: ${title}`)
    loadData()
  }

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`Bạn có chắc muốn xóa bài thu hoạch "${title}" (Dữ liệu demo)?`)) {
      await educationService.deleteAssessment(id)
      showToast(`Đã xóa bài thu hoạch: ${title}`)
      loadData()
    }
  }

  // Handle Add Question
  const openAddQuestion = (asmId: string) => {
    setQuestionTargetId(asmId)
    setQPrompt('')
    setQTopic('')
    setOptA('')
    setOptB('')
    setOptC('')
    setOptD('')
    setCorrectOpt('opt-a')
    setQExplanation('')
    setQError(null)
  }

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!qPrompt.trim() || !optA.trim() || !optB.trim()) {
      setQError('Vui lòng nhập nội dung câu hỏi và ít nhất 2 đáp án lựa chọn A, B.')
      return
    }

    if (!questionTargetId) return

    const newQuestion: Omit<AssessmentQuestionItem, 'id'> = {
      prompt: qPrompt.trim(),
      topic: qTopic.trim() || 'Kiến thức cốt lõi',
      options: [
        { id: 'opt-a', label: 'A', text: optA.trim() },
        { id: 'opt-b', label: 'B', text: optB.trim() },
        ...(optC.trim() ? [{ id: 'opt-c', label: 'C', text: optC.trim() }] : []),
        ...(optD.trim() ? [{ id: 'opt-d', label: 'D', text: optD.trim() }] : []),
      ],
      correctOptionId: correctOpt,
      explanation: qExplanation.trim() || 'Đáp án theo định nghĩa và công thức chuẩn SGK.',
    }

    await educationService.addQuestionToAssessment(questionTargetId, newQuestion)
    showToast('Đã bổ sung câu hỏi trắc nghiệm vào bài thu hoạch!')
    setQuestionTargetId(null)
    loadData()
  }

  return (
    <div className="admin-page-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="admin-toast">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="staff-page-header">
        <div className="admin-header-row">
          <div>
            <h1 className="staff-page-title">Quản lý bài thu hoạch</h1>
            <p className="staff-page-desc">
              Quản lý ngân hàng câu hỏi kiểm tra, bài thu hoạch cuối bài và thiết lập tiêu chí đạt chuẩn của từng bài học.
            </p>
          </div>
          <div className="admin-header-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={openCreateDialog}
              aria-label="Tạo bài thu hoạch"
            >
              <Plus size={16} />
              <span>Tạo bài thu hoạch</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="admin-toolbar" style={{ marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <div className="admin-search-wrap">
          <Search size={16} className="admin-search-icon" />
          <input
            type="search"
            placeholder="Tìm theo tiêu đề bài học..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-search-input"
            aria-label="Tìm kiếm bài thu hoạch"
          />
        </div>

        <div className="admin-filter-group" style={{ gap: '8px' }}>
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="admin-select"
            aria-label="Lọc theo môn học"
          >
            <option value="all">Tất cả môn học</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | ContentStatus)}
            className="admin-select"
            aria-label="Lọc theo trạng thái"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="published">Đã xuất bản</option>
            <option value="in-review">Đang kiểm duyệt</option>
            <option value="draft">Bản nháp</option>
          </select>
        </div>
      </div>

      {/* Assessments Table */}
      {loading ? (
        <div className="staff-table-wrapper">
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ padding: '16px' }}>
              <Skeleton width="100%" height="40px" />
            </div>
          ))}
        </div>
      ) : assessments.length === 0 ? (
        <EmptyState
          title="Không tìm thấy bài thu hoạch nào"
          description="Hãy tạo bài thu hoạch mới gắn liền với các bài học trong chương trình."
          icon={CheckSquare}
          actionLabel="Tạo bài thu hoạch"
          onAction={openCreateDialog}
        />
      ) : (
        <div className="staff-table-wrapper">
          <table className="staff-table" aria-label="Bảng danh sách bài thu hoạch">
            <thead>
              <tr>
                <th>Bài thu hoạch & Bài học</th>
                <th>Môn & Chương</th>
                <th style={{ textAlign: 'center' }}>Số câu hỏi</th>
                <th style={{ textAlign: 'center' }}>Thời lượng</th>
                <th style={{ textAlign: 'center' }}>Điểm đạt</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {assessments.map((asm) => (
                <tr key={asm.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-main, #102a43)' }}>
                      {asm.lessonTitle}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #627d98)', marginTop: '2px' }}>
                      Mã: {asm.id} · Cập nhật: {new Date(asm.updatedAt).toLocaleDateString('vi-VN')}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>{asm.subjectName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #627d98)' }}>
                      {asm.chapterName || 'Chương 1'}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 600 }}>
                    {asm.questions?.length || asm.questionCount || 0} câu
                  </td>
                  <td style={{ textAlign: 'center' }}>{asm.durationMinutes || 15} phút</td>
                  <td style={{ textAlign: 'center' }}>{asm.passingScore || 60}%</td>
                  <td>
                    <StatusBadge status={asm.status} />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="table-action-group">
                      {/* Primary Action: Preview */}
                      <button
                        type="button"
                        className="admin-btn-outline"
                        onClick={() => setPreviewItem(asm)}
                        title="Xem trước bài thu hoạch"
                        aria-label={`Xem trước ${asm.lessonTitle}`}
                      >
                        <Eye size={13} aria-hidden />
                        <span>Xem trước</span>
                      </button>

                      {/* Secondary Actions Dropdown */}
                      <div className="action-dropdown-wrap">
                        <button
                          type="button"
                          className="action-dropdown-trigger"
                          onClick={(e) => {
                            e.stopPropagation()
                            setOpenMenuId(openMenuId === asm.id ? null : asm.id)
                          }}
                          title="Thao tác khác"
                          aria-label={`Thao tác khác ${asm.lessonTitle}`}
                          aria-haspopup="true"
                          aria-expanded={openMenuId === asm.id}
                        >
                          <MoreHorizontal size={15} aria-hidden />
                        </button>

                        {openMenuId === asm.id && (
                          <div className="action-dropdown-menu" role="menu">
                            <button
                              type="button"
                              className="action-dropdown-item"
                              role="menuitem"
                              onClick={() => {
                                setOpenMenuId(null)
                                openAddQuestion(asm.id)
                              }}
                              aria-label={`Thêm câu hỏi ${asm.lessonTitle}`}
                            >
                              <Plus size={14} style={{ color: '#0369a1' }} aria-hidden />
                              <span>Thêm câu hỏi</span>
                            </button>

                            <button
                              type="button"
                              className="action-dropdown-item"
                              role="menuitem"
                              onClick={() => {
                                setOpenMenuId(null)
                                openEditDialog(asm)
                              }}
                              aria-label={`Sửa ${asm.lessonTitle}`}
                            >
                              <Edit2 size={14} style={{ color: '#475569' }} aria-hidden />
                              <span>Sửa thông tin</span>
                            </button>

                            {asm.status !== 'published' ? (
                              <button
                                type="button"
                                className="action-dropdown-item"
                                role="menuitem"
                                onClick={() => {
                                setOpenMenuId(null)
                                handleStatusToggle(asm.id, 'published', asm.lessonTitle)
                              }}
                              aria-label={`Xuất bản ${asm.lessonTitle}`}
                            >
                              <Globe size={14} style={{ color: '#047857' }} aria-hidden />
                              <span>Xuất bản ngay</span>
                            </button>
                            ) : (
                              <button
                                type="button"
                                className="action-dropdown-item"
                                role="menuitem"
                                onClick={() => {
                                  setOpenMenuId(null)
                                  handleStatusToggle(asm.id, 'draft', asm.lessonTitle)
                                }}
                                aria-label={`Chuyển nháp ${asm.lessonTitle}`}
                              >
                                <Send size={14} style={{ color: '#b45309' }} aria-hidden />
                                <span>Chuyển về nháp</span>
                              </button>
                            )}

                            <div className="action-dropdown-divider" />

                            <button
                              type="button"
                              className="action-dropdown-item danger"
                              role="menuitem"
                              onClick={() => {
                                setOpenMenuId(null)
                                handleDelete(asm.id, asm.lessonTitle)
                              }}
                              aria-label={`Xóa ${asm.lessonTitle}`}
                            >
                              <Trash2 size={14} aria-hidden />
                              <span>Xóa bài thu hoạch</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* PREVIEW MODAL */}
      {previewItem && (
        <div
          className="admin-dialog-backdrop"
          onClick={() => setPreviewItem(null)}
          role="presentation"
        >
          <div
            className="admin-dialog-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="preview-title"
          >
            <div className="admin-dialog-header">
              <div>
                <h2 id="preview-title" className="admin-dialog-title">
                  Xem trước: {previewItem.lessonTitle}
                </h2>
                <div style={{ fontSize: '0.78rem', color: 'var(--staff-text-muted, #627d98)', marginTop: '2px' }}>
                  {previewItem.subjectName} · Thời lượng: {previewItem.durationMinutes} phút · Điểm đạt: {previewItem.passingScore}%
                </div>
              </div>
              <button
                type="button"
                className="admin-dialog-close"
                onClick={() => setPreviewItem(null)}
                aria-label="Đóng"
                title="Đóng cửa sổ"
              >
                <X size={16} aria-hidden />
              </button>
            </div>

            <div className="admin-dialog-body">
              {(!previewItem.questions || previewItem.questions.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--staff-text-muted, #627d98)' }}>
                  <HelpCircle size={40} style={{ margin: '0 auto 12px', opacity: 0.5 }} aria-hidden />
                  <p style={{ margin: '0 0 14px' }}>Bài thu hoạch này hiện chưa có câu hỏi nào.</p>
                  <button
                    type="button"
                    className="staff-btn staff-btn-primary"
                    onClick={() => {
                      const id = previewItem.id
                      setPreviewItem(null)
                      openAddQuestion(id)
                    }}
                  >
                    <Plus size={14} aria-hidden />
                    Thêm câu hỏi đầu tiên
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {previewItem.questions.map((q, idx) => (
                    <div key={q.id} className="admin-question-preview-box">
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--staff-navy-primary, #102a43)' }}>
                          Câu {idx + 1}
                        </span>
                        {q.topic && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--staff-text-muted, #627d98)' }}>
                            Chủ đề: {q.topic}
                          </span>
                        )}
                      </div>
                      <div className="admin-question-prompt">{q.prompt}</div>
                      <div className="admin-question-options-list">
                        {q.options.map((opt) => (
                          <div
                            key={opt.id}
                            className={`admin-question-option-item ${
                              opt.id === q.correctOptionId ? 'correct' : ''
                            }`}
                          >
                            <span style={{ fontWeight: 700 }}>{opt.label}.</span>
                            <span>{opt.text}</span>
                            {opt.id === q.correctOptionId && (
                              <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#065f46', fontWeight: 600 }}>
                                ✓ Đáp án đúng
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                      {q.explanation && (
                        <div className="admin-question-explanation">
                          <strong>Giải thích:</strong> {q.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="admin-dialog-footer">
              <button
                type="button"
                className="admin-btn-secondary"
                onClick={() => setPreviewItem(null)}
              >
                Đóng
              </button>
              <button
                type="button"
                className="staff-btn staff-btn-primary"
                onClick={() => {
                  const id = previewItem.id
                  setPreviewItem(null)
                  openAddQuestion(id)
                }}
              >
                <Plus size={14} aria-hidden />
                Thêm câu hỏi mới
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD QUESTION MODAL */}
      {questionTargetId && (
        <div className="admin-dialog-backdrop" onClick={() => setQuestionTargetId(null)}>
          <div
            className="admin-dialog-card admin-form-dialog"
            style={{ maxWidth: '580px' }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-q-title"
          >
            <div className="admin-dialog-header">
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className="admin-form-icon-wrap">
                  <FileQuestion size={16} />
                </span>
                <h2 id="add-q-title" className="admin-dialog-title">
                  Thêm câu hỏi trắc nghiệm
                </h2>
              </div>
              <button
                type="button"
                className="admin-dialog-close"
                onClick={() => setQuestionTargetId(null)}
                aria-label="Đóng"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion}>
              <div className="admin-dialog-body admin-form-body">
                {qError && (
                  <div
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: 'rgba(220, 38, 38, 0.1)',
                      color: '#dc2626',
                      fontSize: '0.82rem',
                    }}
                  >
                    {qError}
                  </div>
                )}

                <div className="admin-form-group">
                  <label htmlFor="q-prompt" className="admin-form-label">
                    Nội dung câu hỏi *
                  </label>
                  <textarea
                    id="q-prompt"
                    rows={2}
                    required
                    value={qPrompt}
                    onChange={(e) => setQPrompt(e.target.value)}
                    placeholder="Nhập đề bài câu hỏi trắc nghiệm..."
                    className="admin-textarea"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-subtle, #e2e8f0)',
                      fontSize: '0.85rem',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>

                <div className="admin-form-group">
                  <label htmlFor="q-topic" className="admin-form-label">
                    Chủ đề kiến thức
                  </label>
                  <input
                    id="q-topic"
                    type="text"
                    value={qTopic}
                    onChange={(e) => setQTopic(e.target.value)}
                    placeholder="Ví dụ: Đạo hàm, Cực trị, Tiệm cận..."
                    className="admin-input"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="admin-form-group">
                    <label htmlFor="opt-a" className="admin-form-label">
                      Đáp án A *
                    </label>
                    <input
                      id="opt-a"
                      type="text"
                      required
                      value={optA}
                      onChange={(e) => setOptA(e.target.value)}
                      className="admin-input"
                    />
                  </div>
                  <div className="admin-form-group">
                    <label htmlFor="opt-b" className="admin-form-label">
                      Đáp án B *
                    </label>
                    <input
                      id="opt-b"
                      type="text"
                      required
                      value={optB}
                      onChange={(e) => setOptB(e.target.value)}
                      className="admin-input"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="admin-form-group">
                    <label htmlFor="opt-c" className="admin-form-label">
                      Đáp án C
                    </label>
                    <input
                      id="opt-c"
                      type="text"
                      value={optC}
                      onChange={(e) => setOptC(e.target.value)}
                      className="admin-input"
                    />
                  </div>
                  <div className="admin-form-group">
                    <label htmlFor="opt-d" className="admin-form-label">
                      Đáp án D
                    </label>
                    <input
                      id="opt-d"
                      type="text"
                      value={optD}
                      onChange={(e) => setOptD(e.target.value)}
                      className="admin-input"
                    />
                  </div>
                </div>

                <div className="admin-form-group">
                  <label htmlFor="correct-opt" className="admin-form-label">
                    Đáp án chính xác *
                  </label>
                  <select
                    id="correct-opt"
                    value={correctOpt}
                    onChange={(e) => setCorrectOpt(e.target.value)}
                    className="admin-select"
                    style={{ width: '100%' }}
                  >
                    <option value="opt-a">Đáp án A</option>
                    <option value="opt-b">Đáp án B</option>
                    <option value="opt-c">Đáp án C</option>
                    <option value="opt-d">Đáp án D</option>
                  </select>
                </div>

                <div className="admin-form-group">
                  <label htmlFor="q-exp" className="admin-form-label">
                    Giải thích đáp án
                  </label>
                  <textarea
                    id="q-exp"
                    rows={2}
                    value={qExplanation}
                    onChange={(e) => setQExplanation(e.target.value)}
                    placeholder="Giải thích các bước chứng minh hoặc suy luận..."
                    className="admin-textarea"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-subtle, #e2e8f0)',
                      fontSize: '0.85rem',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>
              </div>

              <div className="admin-dialog-footer">
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={() => setQuestionTargetId(null)}
                >
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  Lưu câu hỏi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE / EDIT ASSESSMENT MODAL */}
      {isFormOpen && (
        <div className="admin-dialog-backdrop" onClick={() => setIsFormOpen(false)}>
          <div
            className="admin-dialog-card admin-form-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="asm-form-title"
          >
            <div className="admin-dialog-header">
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className="admin-form-icon-wrap">
                  <CheckSquare size={16} />
                </span>
                <h2 id="asm-form-title" className="admin-dialog-title">
                  {editingAssessment ? 'Chỉnh sửa bài thu hoạch' : 'Tạo bài thu hoạch mới'}
                </h2>
              </div>
              <button
                type="button"
                className="admin-dialog-close"
                onClick={() => setIsFormOpen(false)}
                aria-label="Đóng"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveAssessment}>
              <div className="admin-dialog-body admin-form-body">
                {formError && (
                  <div
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: 'rgba(220, 38, 38, 0.1)',
                      color: '#dc2626',
                      fontSize: '0.82rem',
                    }}
                  >
                    {formError}
                  </div>
                )}

                <div className="admin-form-group">
                  <label htmlFor="form-asm-lesson" className="admin-form-label">
                    Bài học liên kết *
                  </label>
                  <select
                    id="form-asm-lesson"
                    value={formLessonId}
                    onChange={(e) => setFormLessonId(e.target.value)}
                    className="admin-select"
                    style={{ width: '100%' }}
                  >
                    {lessons.map((l) => (
                      <option key={l.id} value={l.id}>
                        [{l.subjectName}] {l.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="admin-form-group">
                    <label htmlFor="form-asm-dur" className="admin-form-label">
                      Thời lượng (Phút)
                    </label>
                    <input
                      id="form-asm-dur"
                      type="number"
                      min={5}
                      max={180}
                      value={formDuration}
                      onChange={(e) => setFormDuration(Number(e.target.value))}
                      className="admin-input"
                    />
                  </div>

                  <div className="admin-form-group">
                    <label htmlFor="form-asm-score" className="admin-form-label">
                      Điểm đạt chuẩn (%)
                    </label>
                    <input
                      id="form-asm-score"
                      type="number"
                      min={10}
                      max={100}
                      value={formPassingScore}
                      onChange={(e) => setFormPassingScore(Number(e.target.value))}
                      className="admin-input"
                    />
                  </div>
                </div>

                <div className="admin-form-group">
                  <label htmlFor="form-asm-status" className="admin-form-label">
                    Trạng thái xuất bản
                  </label>
                  <select
                    id="form-asm-status"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as ContentStatus)}
                    className="admin-select"
                    style={{ width: '100%' }}
                  >
                    <option value="published">Đã xuất bản (Published)</option>
                    <option value="in-review">Đang kiểm duyệt (In-review)</option>
                    <option value="draft">Bản nháp (Draft)</option>
                  </select>
                </div>
              </div>

              <div className="admin-dialog-footer">
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={() => setIsFormOpen(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingAssessment ? 'Lưu thay đổi' : 'Tạo bài thu hoạch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
