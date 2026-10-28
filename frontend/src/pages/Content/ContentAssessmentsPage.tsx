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
      setFormError('Vui lÃ²ng chá»n bÃ i há»c liÃªn káº¿t.')
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
      showToast('ÄÃ£ cáº­p nháº­t bÃ i thu hoáº¡ch thÃ nh cÃ´ng!')
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
      showToast(`ÄÃ£ táº¡o bÃ i thu hoáº¡ch cho bÃ i: ${selectedLesson.title}`)
    }

    setIsFormOpen(false)
    loadData()
  }

  const handleStatusToggle = async (id: string, newStatus: ContentStatus, title: string) => {
    await educationService.changeAssessmentStatus(id, newStatus)
    showToast(`ÄÃ£ cáº­p nháº­t tráº¡ng thÃ¡i bÃ i thu hoáº¡ch: ${title}`)
    loadData()
  }

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`Báº¡n cÃ³ cháº¯c muá»‘n xÃ³a bÃ i thu hoáº¡ch "${title}" (Dá»¯ liá»‡u demo)?`)) {
      await educationService.deleteAssessment(id)
      showToast(`ÄÃ£ xÃ³a bÃ i thu hoáº¡ch: ${title}`)
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
      setQError('Vui lÃ²ng nháº­p ná»™i dung cÃ¢u há»i vÃ  Ã­t nháº¥t 2 Ä‘Ã¡p Ã¡n lá»±a chá»n A, B.')
      return
    }

    if (!questionTargetId) return

    const newQuestion: Omit<AssessmentQuestionItem, 'id'> = {
      prompt: qPrompt.trim(),
      topic: qTopic.trim() || 'Kiáº¿n thá»©c cá»‘t lÃµi',
      options: [
        { id: 'opt-a', label: 'A', text: optA.trim() },
        { id: 'opt-b', label: 'B', text: optB.trim() },
        ...(optC.trim() ? [{ id: 'opt-c', label: 'C', text: optC.trim() }] : []),
        ...(optD.trim() ? [{ id: 'opt-d', label: 'D', text: optD.trim() }] : []),
      ],
      correctOptionId: correctOpt,
      explanation: qExplanation.trim() || 'ÄÃ¡p Ã¡n theo Ä‘á»‹nh nghÄ©a vÃ  cÃ´ng thá»©c chuáº©n SGK.',
    }

    await educationService.addQuestionToAssessment(questionTargetId, newQuestion)
    showToast('ÄÃ£ bá»• sung cÃ¢u há»i tráº¯c nghiá»‡m vÃ o bÃ i thu hoáº¡ch!')
    setQuestionTargetId(null)
    loadData()
  }

  return (
    <div className="staff-page">
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
            <div className="admin-prototype-badge">
              <span className="prototype-dot" />
              <span>Dá»¯ liá»‡u mÃ´ phá»ng Â· LÆ°u cá»¥c bá»™</span>
            </div>
            <h1 className="staff-page-title">Quáº£n lÃ½ bÃ i thu hoáº¡ch</h1>
            <p className="staff-page-desc">
              Quáº£n lÃ½ ngÃ¢n hÃ ng cÃ¢u há»i kiá»ƒm tra, bÃ i thu hoáº¡ch cuá»‘i bÃ i vÃ  thiáº¿t láº­p tiÃªu chÃ­ Ä‘áº¡t chuáº©n cá»§a tá»«ng bÃ i há»c.
            </p>
          </div>
          <div className="admin-header-actions">
            <button
              type="button"
              className="admin-btn-primary"
              onClick={openCreateDialog}
              aria-label="Táº¡o bÃ i thu hoáº¡ch"
            >
              <Plus size={16} />
              <span>Táº¡o bÃ i thu hoáº¡ch</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="admin-toolbar" style={{ marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div className="admin-search-wrap">
          <Search size={16} className="admin-search-icon" />
          <input
            type="search"
            placeholder="TÃ¬m theo tiÃªu Ä‘á» bÃ i há»c..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-search-input"
            aria-label="TÃ¬m kiáº¿m bÃ i thu hoáº¡ch"
          />
        </div>

        <div className="admin-filter-group" style={{ gap: '8px' }}>
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="admin-select"
            aria-label="Lá»c theo mÃ´n há»c"
          >
            <option value="all">Táº¥t cáº£ mÃ´n há»c</option>
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
            aria-label="Lá»c theo tráº¡ng thÃ¡i"
          >
            <option value="all">Táº¥t cáº£ tráº¡ng thÃ¡i</option>
            <option value="published">ÄÃ£ xuáº¥t báº£n</option>
            <option value="in-review">Äang kiá»ƒm duyá»‡t</option>
            <option value="draft">Báº£n nhÃ¡p</option>
          </select>
        </div>
      </div>

      {/* Assessments Table */}
      {loading ? (
        <div className="admin-table-container">
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ padding: '16px' }}>
              <Skeleton width="100%" height="40px" />
            </div>
          ))}
        </div>
      ) : assessments.length === 0 ? (
        <EmptyState
          title="KhÃ´ng tÃ¬m tháº¥y bÃ i thu hoáº¡ch nÃ o"
          description="HÃ£y táº¡o bÃ i thu hoáº¡ch má»›i gáº¯n liá»n vá»›i cÃ¡c bÃ i há»c trong chÆ°Æ¡ng trÃ¬nh."
          icon={CheckSquare}
          actionLabel="Táº¡o bÃ i thu hoáº¡ch"
          onAction={openCreateDialog}
        />
      ) : (
        <div className="admin-table-container">
          <table className="admin-table" aria-label="Báº£ng danh sÃ¡ch bÃ i thu hoáº¡ch">
            <thead>
              <tr>
                <th>BÃ i thu hoáº¡ch & BÃ i há»c</th>
                <th>MÃ´n & ChÆ°Æ¡ng</th>
                <th style={{ textAlign: 'center' }}>Sá»‘ cÃ¢u há»i</th>
                <th style={{ textAlign: 'center' }}>Thá»i lÆ°á»£ng</th>
                <th style={{ textAlign: 'center' }}>Äiá»ƒm Ä‘áº¡t</th>
                <th>Tráº¡ng thÃ¡i</th>
                <th style={{ textAlign: 'right' }}>Thao tÃ¡c</th>
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
                      MÃ£: {asm.id} Â· Cáº­p nháº­t: {new Date(asm.updatedAt).toLocaleDateString('vi-VN')}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>{asm.subjectName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #627d98)' }}>
                      {asm.chapterName || 'ChÆ°Æ¡ng 1'}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 600 }}>
                    {asm.questions?.length || asm.questionCount || 0} cÃ¢u
                  </td>
                  <td style={{ textAlign: 'center' }}>{asm.durationMinutes || 15} phÃºt</td>
                  <td style={{ textAlign: 'center' }}>{asm.passingScore || 60}%</td>
                  <td>
                    <StatusBadge status={asm.status} />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                      {/* Preview Button */}
                      <button
                        type="button"
                        className="admin-btn-outline"
                        style={{ padding: '4px 8px', fontSize: '0.75rem', gap: '4px' }}
                        onClick={() => setPreviewItem(asm)}
                        title="Xem trÆ°á»›c bÃ i thu hoáº¡ch"
                        aria-label={`Xem trÆ°á»›c ${asm.lessonTitle}`}
                      >
                        <Eye size={13} />
                        <span>Xem trÆ°á»›c</span>
                      </button>

                      {/* Add Question Button */}
                      <button
                        type="button"
                        className="admin-btn-outline"
                        style={{ padding: '4px 8px', fontSize: '0.75rem', gap: '4px', color: '#0369a1' }}
                        onClick={() => openAddQuestion(asm.id)}
                        title="ThÃªm cÃ¢u há»i vÃ o bÃ i nÃ y"
                        aria-label={`ThÃªm cÃ¢u há»i ${asm.lessonTitle}`}
                      >
                        <Plus size={13} />
                        <span>ThÃªm cÃ¢u</span>
                      </button>

                      {/* Status Fast Toggle */}
                      {asm.status !== 'published' ? (
                        <button
                          type="button"
                          className="admin-btn-outline"
                          style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#047857' }}
                          onClick={() => handleStatusToggle(asm.id, 'published', asm.lessonTitle)}
                          title="Xuáº¥t báº£n bÃ i thu hoáº¡ch"
                          aria-label={`Xuáº¥t báº£n ${asm.lessonTitle}`}
                        >
                          <Globe size={13} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="admin-btn-outline"
                          style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#b45309' }}
                          onClick={() => handleStatusToggle(asm.id, 'draft', asm.lessonTitle)}
                          title="Chuyá»ƒn vá» báº£n nhÃ¡p"
                          aria-label={`Chuyá»ƒn nhÃ¡p ${asm.lessonTitle}`}
                        >
                          <Send size={13} />
                        </button>
                      )}

                      {/* Edit */}
                      <button
                        type="button"
                        className="admin-btn-outline"
                        style={{ padding: '4px 8px' }}
                        onClick={() => openEditDialog(asm)}
                        title="Chá»‰nh sá»­a thÃ´ng tin"
                        aria-label={`Sá»­a ${asm.lessonTitle}`}
                      >
                        <Edit2 size={13} />
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        className="admin-btn-outline"
                        style={{ color: '#dc2626', padding: '4px 8px' }}
                        onClick={() => handleDelete(asm.id, asm.lessonTitle)}
                        title="XÃ³a bÃ i thu hoáº¡ch"
                        aria-label={`XÃ³a ${asm.lessonTitle}`}
                      >
                        <Trash2 size={13} />
                      </button>
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
        <div className="admin-dialog-backdrop" onClick={() => setPreviewItem(null)}>
          <div
            className="admin-dialog-card"
            style={{ maxWidth: '640px', width: '92%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="preview-title"
          >
            <div className="admin-dialog-header">
              <div>
                <h2 id="preview-title" className="admin-dialog-title">
                  Xem trÆ°á»›c: {previewItem.lessonTitle}
                </h2>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #627d98)', marginTop: '2px' }}>
                  {previewItem.subjectName} Â· Thá»i lÆ°á»£ng: {previewItem.durationMinutes} phÃºt Â· Äiá»ƒm Ä‘áº¡t: {previewItem.passingScore}%
                </div>
              </div>
              <button
                type="button"
                className="admin-dialog-close"
                onClick={() => setPreviewItem(null)}
                aria-label="ÄÃ³ng"
              >
                <X size={16} />
              </button>
            </div>

            <div className="admin-dialog-body" style={{ overflowY: 'auto', flex: 1, padding: '16px 20px' }}>
              {(!previewItem.questions || previewItem.questions.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted, #627d98)' }}>
                  <HelpCircle size={36} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                  <p>BÃ i thu hoáº¡ch nÃ y hiá»‡n chÆ°a cÃ³ cÃ¢u há»i nÃ o.</p>
                  <button
                    type="button"
                    className="admin-btn-primary"
                    style={{ marginTop: '10px' }}
                    onClick={() => {
                      const id = previewItem.id
                      setPreviewItem(null)
                      openAddQuestion(id)
                    }}
                  >
                    ThÃªm cÃ¢u há»i Ä‘áº§u tiÃªn
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {previewItem.questions.map((q, idx) => (
                    <div key={q.id} className="admin-question-preview-box">
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--navy-primary, #102a43)' }}>
                          CÃ¢u {idx + 1}
                        </span>
                        {q.topic && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted, #627d98)' }}>
                            Chá»§ Ä‘á»: {q.topic}
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
                              <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#065f46' }}>
                                âœ“ ÄÃ¡p Ã¡n Ä‘Ãºng
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                      {q.explanation && (
                        <div className="admin-question-explanation">
                          <strong>Giáº£i thÃ­ch:</strong> {q.explanation}
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
                ÄÃ³ng
              </button>
              <button
                type="button"
                className="admin-btn-primary"
                onClick={() => {
                  const id = previewItem.id
                  setPreviewItem(null)
                  openAddQuestion(id)
                }}
              >
                ThÃªm cÃ¢u há»i má»›i
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
                  ThÃªm cÃ¢u há»i tráº¯c nghiá»‡m
                </h2>
              </div>
              <button
                type="button"
                className="admin-dialog-close"
                onClick={() => setQuestionTargetId(null)}
                aria-label="ÄÃ³ng"
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
                    Ná»™i dung cÃ¢u há»i *
                  </label>
                  <textarea
                    id="q-prompt"
                    rows={2}
                    required
                    value={qPrompt}
                    onChange={(e) => setQPrompt(e.target.value)}
                    placeholder="Nháº­p Ä‘á» bÃ i cÃ¢u há»i tráº¯c nghiá»‡m..."
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
                    Chá»§ Ä‘á» kiáº¿n thá»©c
                  </label>
                  <input
                    id="q-topic"
                    type="text"
                    value={qTopic}
                    onChange={(e) => setQTopic(e.target.value)}
                    placeholder="VÃ­ dá»¥: Äáº¡o hÃ m, Cá»±c trá»‹, Tiá»‡m cáº­n..."
                    className="admin-input"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="admin-form-group">
                    <label htmlFor="opt-a" className="admin-form-label">
                      ÄÃ¡p Ã¡n A *
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
                      ÄÃ¡p Ã¡n B *
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
                      ÄÃ¡p Ã¡n C
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
                      ÄÃ¡p Ã¡n D
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
                    ÄÃ¡p Ã¡n chÃ­nh xÃ¡c *
                  </label>
                  <select
                    id="correct-opt"
                    value={correctOpt}
                    onChange={(e) => setCorrectOpt(e.target.value)}
                    className="admin-select"
                    style={{ width: '100%' }}
                  >
                    <option value="opt-a">ÄÃ¡p Ã¡n A</option>
                    <option value="opt-b">ÄÃ¡p Ã¡n B</option>
                    <option value="opt-c">ÄÃ¡p Ã¡n C</option>
                    <option value="opt-d">ÄÃ¡p Ã¡n D</option>
                  </select>
                </div>

                <div className="admin-form-group">
                  <label htmlFor="q-exp" className="admin-form-label">
                    Giáº£i thÃ­ch Ä‘Ã¡p Ã¡n
                  </label>
                  <textarea
                    id="q-exp"
                    rows={2}
                    value={qExplanation}
                    onChange={(e) => setQExplanation(e.target.value)}
                    placeholder="Giáº£i thÃ­ch cÃ¡c bÆ°á»›c chá»©ng minh hoáº·c suy luáº­n..."
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
                  Há»§y
                </button>
                <button type="submit" className="admin-btn-primary">
                  LÆ°u cÃ¢u há»i
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
                  {editingAssessment ? 'Chá»‰nh sá»­a bÃ i thu hoáº¡ch' : 'Táº¡o bÃ i thu hoáº¡ch má»›i'}
                </h2>
              </div>
              <button
                type="button"
                className="admin-dialog-close"
                onClick={() => setIsFormOpen(false)}
                aria-label="ÄÃ³ng"
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
                    BÃ i há»c liÃªn káº¿t *
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
                      Thá»i lÆ°á»£ng (PhÃºt)
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
                      Äiá»ƒm Ä‘áº¡t chuáº©n (%)
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
                    Tráº¡ng thÃ¡i xuáº¥t báº£n
                  </label>
                  <select
                    id="form-asm-status"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as ContentStatus)}
                    className="admin-select"
                    style={{ width: '100%' }}
                  >
                    <option value="published">ÄÃ£ xuáº¥t báº£n (Published)</option>
                    <option value="in-review">Äang kiá»ƒm duyá»‡t (In-review)</option>
                    <option value="draft">Báº£n nhÃ¡p (Draft)</option>
                  </select>
                </div>
              </div>

              <div className="admin-dialog-footer">
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={() => setIsFormOpen(false)}
                >
                  Há»§y
                </button>
                <button type="submit" className="admin-btn-primary">
                  {editingAssessment ? 'LÆ°u thay Ä‘á»•i' : 'Táº¡o bÃ i thu hoáº¡ch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
