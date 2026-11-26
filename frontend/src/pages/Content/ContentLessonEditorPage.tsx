import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { useLessonEditor } from '@/hooks/useContent'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Skeleton } from '@/components/ui/Skeleton'
import { PageErrorState } from '@/components/ui/PageErrorState'
import type {
  LessonEditorData,
  StructuredDefinitionItem,
  StructuredFormulaItem,
  StructuredExampleItem,
} from '@/types/content'
import { MathView } from '@/components/common/MathView'
import { LessonCompositionPanel } from './components/lesson-editor/LessonCompositionPanel'
import { LessonResourcesPanel } from './components/lesson-editor/LessonResourcesPanel'
import './ContentPages.css'

interface LessonEditorFormProps {
  lessonData: LessonEditorData
  isSaving: boolean
  isReviewer: boolean
  onSaveDraft: (updates: Partial<LessonEditorData>) => Promise<LessonEditorData | undefined>
  onSubmitReview: (rowVersion?: string) => Promise<unknown>
  onApprove: (rowVersion?: string) => Promise<unknown>
  onPublish: (rowVersion?: string) => Promise<unknown>
  onUnpublish: (rowVersion?: string) => Promise<unknown>
  onRequestChanges: (reason?: string, rowVersion?: string) => Promise<unknown>
  onArchive: (reason?: string, rowVersion?: string) => Promise<unknown>
  onReactivate: (rowVersion?: string) => Promise<unknown>
}

function LessonEditorForm({
  lessonData,
  isSaving,
  isReviewer,
  onSaveDraft,
  onSubmitReview,
  onApprove,
  onPublish,
  onUnpublish,
  onRequestChanges,
  onArchive,
  onReactivate,
}: LessonEditorFormProps) {
  const [title, setTitle] = useState(lessonData.title)
  const [introduction, setIntroduction] = useState(lessonData.introduction)
  const [definitions, setDefinitions] = useState<StructuredDefinitionItem[]>(lessonData.definitions || [])
  const [formulas, setFormulas] = useState<StructuredFormulaItem[]>(lessonData.formulas || [])
  const [examples, setExamples] = useState<StructuredExampleItem[]>(lessonData.examples || [])
  const [notes, setNotes] = useState<string[]>(lessonData.notes || [])
  const [summary, setSummary] = useState<string[]>(lessonData.summary || [])
  const [isDirty, setIsDirty] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string>('✓ Đã lưu thay đổi thành công!')

  // Warn before leaving editor if changes are unsaved
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [isDirty])

  // ================= DEFINITIONS HANDLERS =================
  const handleAddDefinition = () => {
    setDefinitions((prev) => [
      ...prev,
      { term: `Khái niệm ${prev.length + 1}`, content: '' },
    ])
    setIsDirty(true)
  }

  const handleUpdateDefinition = (index: number, field: 'term' | 'content', value: string) => {
    setDefinitions((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
    setIsDirty(true)
  }

  const handleRemoveDefinition = (index: number) => {
    setDefinitions((prev) => prev.filter((_, idx) => idx !== index))
    setIsDirty(true)
  }

  // ================= FORMULAS HANDLERS =================
  const handleAddFormula = () => {
    setFormulas((prev) => [
      ...prev,
      { label: `Công thức ${prev.length + 1}`, formula: '', note: '' },
    ])
    setIsDirty(true)
  }

  const handleUpdateFormula = (index: number, field: 'label' | 'formula' | 'note', value: string) => {
    setFormulas((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
    setIsDirty(true)
  }

  const handleRemoveFormula = (index: number) => {
    setFormulas((prev) => prev.filter((_, idx) => idx !== index))
    setIsDirty(true)
  }

  // ================= EXAMPLES HANDLERS =================
  const handleAddExample = () => {
    setExamples((prev) => [
      ...prev,
      { title: `Ví dụ ${prev.length + 1}`, problem: '', conclusion: '' },
    ])
    setIsDirty(true)
  }

  const handleUpdateExample = (index: number, field: 'title' | 'problem' | 'conclusion', value: string) => {
    setExamples((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
    setIsDirty(true)
  }

  const handleRemoveExample = (index: number) => {
    setExamples((prev) => prev.filter((_, idx) => idx !== index))
    setIsDirty(true)
  }

  // ================= NOTES HANDLERS =================
  const handleAddNote = () => {
    setNotes((prev) => [...prev, ''])
    setIsDirty(true)
  }

  const handleUpdateNote = (index: number, value: string) => {
    setNotes((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
    setIsDirty(true)
  }

  const handleRemoveNote = (index: number) => {
    setNotes((prev) => prev.filter((_, idx) => idx !== index))
    setIsDirty(true)
  }

  // ================= SUMMARY HANDLERS =================
  const handleAddSummary = () => {
    setSummary((prev) => [...prev, ''])
    setIsDirty(true)
  }

  const handleUpdateSummary = (index: number, value: string) => {
    setSummary((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
    setIsDirty(true)
  }

  const handleRemoveSummary = (index: number) => {
    setSummary((prev) => prev.filter((_, idx) => idx !== index))
    setIsDirty(true)
  }

  // ================= WORKFLOW ACTIONS (CURR-001) =================
  const handleSaveDraft = async () => {
    setSaveStatus('saving')
    setSaveError(null)
    try {
      await onSaveDraft({
        title,
        introduction,
        definitions,
        formulas,
        examples,
        notes: notes.filter((n) => n.trim().length > 0),
        summary: summary.filter((s) => s.trim().length > 0),
      })
      setSuccessMessage('✓ Đã lưu bản nháp thành công!')
      setSaveStatus('saved')
      setIsDirty(false)
      setTimeout(() => setSaveStatus('idle'), 2500)
    } catch (err: unknown) {
      setSaveStatus('error')
      setSaveError(err instanceof Error ? err.message : 'Lỗi khi lưu bản nháp')
    }
  }

  const handleSubmitReview = async () => {
    setSaveStatus('saving')
    setSaveError(null)
    try {
      const saved = await onSaveDraft({
        title,
        introduction,
        definitions,
        formulas,
        examples,
        notes: notes.filter((n) => n.trim().length > 0),
        summary: summary.filter((s) => s.trim().length > 0),
        rowVersion: lessonData.rowVersion,
      })
      await onSubmitReview(saved?.rowVersion ?? lessonData.rowVersion)
      setSuccessMessage('✓ Đã gửi bài học sang hàng đợi kiểm duyệt thành công!')
      setSaveStatus('saved')
      setIsDirty(false)
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (err: unknown) {
      setSaveStatus('error')
      setSaveError(err instanceof Error ? err.message : 'Lỗi khi gửi kiểm duyệt')
    }
  }

  const handleLifecycleAction = async (
    fn: () => Promise<unknown>,
    successMsg: string,
    fallbackErr: string
  ) => {
    setSaveStatus('saving')
    setSaveError(null)
    try {
      await fn()
      setSuccessMessage(successMsg)
      setSaveStatus('saved')
      setIsDirty(false)
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (err: unknown) {
      setSaveStatus('error')
      setSaveError(err instanceof Error ? err.message : fallbackErr)
    }
  }

  return (
    <div className="staff-page" style={{ paddingBottom: '80px' }}>
      <div className="staff-page-header">
        <div className="staff-page-title-row">
          <div>
            <h1>Biên soạn bài giảng</h1>
            <p className="staff-page-desc">
              Cấu trúc bài học theo chuẩn sư phạm: Khái niệm, công thức, ví dụ minh họa và bài tập thu hoạch.
            </p>
          </div>
          <div className="staff-page-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <StatusBadge
              status={lessonData.status}
              label={
                lessonData.status === 'published'
                  ? 'Đã xuất bản'
                  : lessonData.status === 'in-review'
                    ? 'Chờ duyệt'
                    : 'Bản nháp'
              }
            />
            <Link
              to={`/lesson/${lessonData.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="staff-btn staff-btn-secondary"
            >
              👁 Xem trước như học viên
            </Link>
          </div>
        </div>
      </div>

      {saveStatus === 'saving' && (
        <div
          role="status"
          style={{
            padding: '10px 16px',
            marginBottom: '16px',
            background: 'var(--surface-sunken)',
            color: 'var(--text-secondary)',
            borderRadius: '6px',
            fontSize: '14px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          ⏳ Đang lưu bài học...
        </div>
      )}
      {saveStatus === 'saved' && (
        <div
          role="status"
          style={{
            padding: '10px 16px',
            marginBottom: '16px',
            background: 'var(--color-success-bg, #ebfbee)',
            color: 'var(--color-success, #2b8a3e)',
            borderRadius: '6px',
            fontSize: '14px',
            border: '1px solid var(--color-success-border, #d3f9d8)',
          }}
        >
          {successMessage}
        </div>
      )}
      {saveStatus === 'error' && (
        <div
          role="alert"
          style={{
            padding: '10px 16px',
            marginBottom: '16px',
            background: 'var(--color-danger-bg, #fff5f5)',
            color: 'var(--color-danger, #e03131)',
            borderRadius: '6px',
            fontSize: '14px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          ✕ {saveError}
        </div>
      )}

      <div style={{ display: 'grid', gap: '24px' }}>
        {/* Section 1: Basic Information (CURR-009 Real Meta) */}
        <div className="staff-card">
          <h2 className="staff-card-title">Thông tin cơ bản</h2>
          <div className="editor-form-section">
            <label htmlFor="ed-title">Tiêu đề bài học</label>
            <input
              id="ed-title"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                setIsDirty(true)
              }}
              placeholder="VD: Khảo sát và vẽ đồ thị hàm phân thức..."
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <span className="hint">Môn học:</span>
              <div style={{ fontWeight: 600, marginTop: '2px' }} data-testid="lesson-subject-name">
                {lessonData.subjectName || lessonData.subjectId || 'Chưa gán môn học'}
              </div>
            </div>
            <div>
              <span className="hint">Chương:</span>
              <div style={{ fontWeight: 600, marginTop: '2px' }} data-testid="lesson-chapter-title">
                {lessonData.chapterTitle || lessonData.chapterId || 'Chưa gán chương'}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Introduction */}
        <div className="staff-card">
          <h2 className="staff-card-title">1. Đặt vấn đề & Mở đầu (Introduction)</h2>
          <div className="editor-form-section">
            <label htmlFor="ed-intro">Nội dung mở đầu</label>
            <textarea
              id="ed-intro"
              rows={4}
              value={introduction}
              onChange={(e) => {
                setIntroduction(e.target.value)
                setIsDirty(true)
              }}
              placeholder="Giới thiệu bối cảnh thực tế hoặc vấn đề dẫn nhập..."
            />
            <span className="hint">Giúp học sinh hiểu tại sao cần học nội dung này và ứng dụng thực tế.</span>
          </div>
        </div>

        {/* Section 3: Structured Definitions (CURR-002) */}
        <div className="staff-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="staff-card-title">2. Định nghĩa & Khái niệm cốt lõi (Definitions)</h2>
            <button
              type="button"
              className="staff-btn staff-btn-secondary"
              onClick={handleAddDefinition}
              style={{ fontSize: '13px' }}
            >
              + Thêm định nghĩa
            </button>
          </div>

          {definitions.length === 0 ? (
            <p className="hint" style={{ marginTop: '12px' }}>
              Chưa có định nghĩa nào. Nhấn "+ Thêm định nghĩa" để thêm khái niệm cốt lõi.
            </p>
          ) : (
            <div style={{ display: 'grid', gap: '16px', marginTop: '16px' }}>
              {definitions.map((def, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '12px',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    background: 'var(--surface-sunken)',
                  }}
                >
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Thuật ngữ / Khái niệm"
                      value={def.term}
                      onChange={(e) => handleUpdateDefinition(idx, 'term', e.target.value)}
                      style={{ flex: 1, fontWeight: 600 }}
                      aria-label={`Thuật ngữ ${idx + 1}`}
                    />
                    <button
                      type="button"
                      className="staff-btn staff-btn-secondary"
                      onClick={() => handleRemoveDefinition(idx)}
                      style={{ color: 'var(--color-danger)', padding: '4px 8px' }}
                      aria-label={`Xóa định nghĩa ${idx + 1}`}
                    >
                      ✕
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    placeholder="Nội dung định nghĩa, điều kiện hoặc phát biểu định lý..."
                    value={def.content}
                    onChange={(e) => handleUpdateDefinition(idx, 'content', e.target.value)}
                    aria-label={`Nội dung định nghĩa ${idx + 1}`}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 4: Structured Formulas (CURR-002) */}
        <div className="staff-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="staff-card-title">3. Công thức tính nhanh & Quy tắc (Formulas)</h2>
            <button
              type="button"
              className="staff-btn staff-btn-secondary"
              onClick={handleAddFormula}
              style={{ fontSize: '13px' }}
            >
              + Thêm công thức
            </button>
          </div>

          {formulas.length === 0 ? (
            <p className="hint" style={{ marginTop: '12px' }}>
              Chưa có công thức nào. Nhấn "+ Thêm công thức" để thêm công thức toán KaTeX.
            </p>
          ) : (
            <div style={{ display: 'grid', gap: '16px', marginTop: '16px' }}>
              {formulas.map((form, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '12px',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    background: 'var(--surface-sunken)',
                  }}
                >
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Tên công thức (VD: Đạo hàm hàm hợp)"
                      value={form.label}
                      onChange={(e) => handleUpdateFormula(idx, 'label', e.target.value)}
                      style={{ flex: 1, fontWeight: 600 }}
                      aria-label={`Tên công thức ${idx + 1}`}
                    />
                    <button
                      type="button"
                      className="staff-btn staff-btn-secondary"
                      onClick={() => handleRemoveFormula(idx)}
                      style={{ color: 'var(--color-danger)', padding: '4px 8px' }}
                      aria-label={`Xóa công thức ${idx + 1}`}
                    >
                      ✕
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Mã LaTeX (VD: (u^n)' = n u^{n-1} u')"
                    value={form.formula}
                    onChange={(e) => handleUpdateFormula(idx, 'formula', e.target.value)}
                    style={{ marginBottom: '8px', fontFamily: 'monospace' }}
                    aria-label={`Mã công thức ${idx + 1}`}
                  />
                  <input
                    type="text"
                    placeholder="Điều kiện áp dụng / Ghi chú (VD: n thuộc N*)"
                    value={form.note || ''}
                    onChange={(e) => handleUpdateFormula(idx, 'note', e.target.value)}
                    aria-label={`Ghi chú công thức ${idx + 1}`}
                  />

                  {form.formula && (
                    <div
                      className="katex-preview-card"
                      data-testid={`katex-preview-${idx}`}
                      style={{
                        marginTop: '10px',
                        padding: '10px 14px',
                        background: 'var(--color-bg-subtle, #f8fafc)',
                        borderRadius: '6px',
                        border: '1px solid var(--color-border, #cbd5e1)',
                      }}
                    >
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                        Xem trước KaTeX:
                      </span>
                      <MathView math={form.formula} displayMode />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 5: Structured Examples (CURR-002) */}
        <div className="staff-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="staff-card-title">4. Ví dụ minh họa có giải chi tiết (Examples)</h2>
            <button
              type="button"
              className="staff-btn staff-btn-secondary"
              onClick={handleAddExample}
              style={{ fontSize: '13px' }}
            >
              + Thêm ví dụ
            </button>
          </div>

          {examples.length === 0 ? (
            <p className="hint" style={{ marginTop: '12px' }}>
              Chưa có ví dụ minh họa. Nhấn "+ Thêm ví dụ" để thêm bài toán và lời giải mẫu.
            </p>
          ) : (
            <div style={{ display: 'grid', gap: '16px', marginTop: '16px' }}>
              {examples.map((ex, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '12px',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    background: 'var(--surface-sunken)',
                  }}
                >
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Tiêu đề ví dụ (VD: Ví dụ 1: Tìm tiệm cận đứng)"
                      value={ex.title}
                      onChange={(e) => handleUpdateExample(idx, 'title', e.target.value)}
                      style={{ flex: 1, fontWeight: 600 }}
                      aria-label={`Tiêu đề ví dụ ${idx + 1}`}
                    />
                    <button
                      type="button"
                      className="staff-btn staff-btn-secondary"
                      onClick={() => handleRemoveExample(idx)}
                      style={{ color: 'var(--color-danger)', padding: '4px 8px' }}
                      aria-label={`Xóa ví dụ ${idx + 1}`}
                    >
                      ✕
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    placeholder="Đề bài bài toán..."
                    value={ex.problem}
                    onChange={(e) => handleUpdateExample(idx, 'problem', e.target.value)}
                    style={{ marginBottom: '8px' }}
                    aria-label={`Đề bài ví dụ ${idx + 1}`}
                  />
                  <input
                    type="text"
                    placeholder="Kết luận / Đáp số (VD: Vậy tiệm cận đứng là x = 2)"
                    value={ex.conclusion || ''}
                    onChange={(e) => handleUpdateExample(idx, 'conclusion', e.target.value)}
                    aria-label={`Kết luận ví dụ ${idx + 1}`}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 6: Important Notes (CURR-002) */}
        <div className="staff-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="staff-card-title">5. Các lỗi sai thường gặp & Lưu ý (Important Notes)</h2>
            <button
              type="button"
              className="staff-btn staff-btn-secondary"
              onClick={handleAddNote}
              style={{ fontSize: '13px' }}
            >
              + Thêm lưu ý
            </button>
          </div>

          {notes.length === 0 ? (
            <p className="hint" style={{ marginTop: '12px' }}>
              Chưa có lưu ý nào. Nhấn "+ Thêm lưu ý" để chỉ ra các bẫy trắc nghiệm hay gặp.
            </p>
          ) : (
            <div style={{ display: 'grid', gap: '10px', marginTop: '16px' }}>
              {notes.map((note, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Lưu ý bẫy đề thi..."
                    value={note}
                    onChange={(e) => handleUpdateNote(idx, e.target.value)}
                    style={{ flex: 1 }}
                    aria-label={`Lưu ý ${idx + 1}`}
                  />
                  <button
                    type="button"
                    className="staff-btn staff-btn-secondary"
                    onClick={() => handleRemoveNote(idx)}
                    style={{ color: 'var(--color-danger)', padding: '4px 8px' }}
                    aria-label={`Xóa lưu ý ${idx + 1}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 7: Summary & Harvest Assessment */}
        <div className="staff-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="staff-card-title">6. Tóm tắt bài học (Summary)</h2>
            <button
              type="button"
              className="staff-btn staff-btn-secondary"
              onClick={handleAddSummary}
              style={{ fontSize: '13px' }}
            >
              + Thêm ý tóm tắt
            </button>
          </div>

          {summary.length === 0 ? (
            <p className="hint" style={{ marginTop: '12px' }}>
              Chưa có ý tóm tắt. Nhấn "+ Thêm ý tóm tắt" để bổ sung trọng tâm bài học.
            </p>
          ) : (
            <div style={{ display: 'grid', gap: '10px', marginTop: '16px' }}>
              {summary.map((sum, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Ý trọng tâm cần ghi nhớ..."
                    value={sum}
                    onChange={(e) => handleUpdateSummary(idx, e.target.value)}
                    style={{ flex: 1 }}
                    aria-label={`Ý tóm tắt ${idx + 1}`}
                  />
                  <button
                    type="button"
                    className="staff-btn staff-btn-secondary"
                    onClick={() => handleRemoveSummary(idx)}
                    style={{ color: 'var(--color-danger)', padding: '4px 8px' }}
                    aria-label={`Xóa ý tóm tắt ${idx + 1}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Harvest Assessment Section (CURR-009 No Fake ID) */}
          <div
            style={{
              marginTop: '20px',
              padding: '12px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-navy-dark)' }}>
              Liên kết bài thu hoạch (Harvest Assessment):
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
              {lessonData.assessmentId ? (
                <span style={{ fontSize: '14px' }}>
                  {lessonData.assessmentTitle || lessonData.assessmentId}
                </span>
              ) : (lessonData.questionsCount || 0) > 0 ? (
                <span style={{ fontSize: '14px' }}>
                  Đã có {lessonData.questionsCount} câu hỏi trắc nghiệm liên kết bài học
                </span>
              ) : (
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                  Chưa có bài thu hoạch liên kết
                </span>
              )}
              <Link
                to="/content/assessments"
                className="staff-btn staff-btn-secondary"
                style={{ fontSize: '12px', padding: '3px 8px' }}
              >
                Quản lý câu hỏi
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* P03 Validated Lesson Composition, Objectives, Graph & Revisions */}
      <LessonCompositionPanel lessonId={lessonData.id} />

      {/* P04 Generalized Lesson Resources & Video */}
      <LessonResourcesPanel lessonId={lessonData.id} isReviewer={isReviewer} />

      {/* Sticky Action Bar (CURR-001) */}
      <div className="editor-sticky-bar">
        <div style={{ fontSize: '13px', color: 'var(--color-ink-muted)' }}>
          {lessonData.lastSavedAt
            ? `Đã lưu lúc: ${new Date(lessonData.lastSavedAt).toLocaleTimeString('vi-VN')}`
            : 'Chưa lưu thay đổi'}
        </div>
        <div className="editor-sticky-bar-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(lessonData.status === 'draft' || lessonData.status === 'changes-requested') && (
            <>
              <button
                type="button"
                className="staff-btn staff-btn-secondary"
                onClick={handleSaveDraft}
                disabled={saveStatus === 'saving' || isSaving}
              >
                Lưu bản nháp
              </button>
              <button
                type="button"
                className="staff-btn staff-btn-primary"
                onClick={handleSubmitReview}
                disabled={saveStatus === 'saving' || isSaving}
              >
                Gửi kiểm duyệt
              </button>
            </>
          )}
          {isReviewer && lessonData.status === 'in-review' && (
            <>
              <button
                type="button"
                className="staff-btn staff-btn-secondary"
                onClick={() => handleLifecycleAction(() => onRequestChanges(undefined, lessonData.rowVersion), '✓ Đã yêu cầu chỉnh sửa bài học.', 'Lỗi khi yêu cầu chỉnh sửa')}
                disabled={saveStatus === 'saving' || isSaving}
              >
                Yêu cầu sửa
              </button>
              <button
                type="button"
                className="staff-btn staff-btn-primary"
                onClick={() => handleLifecycleAction(() => onApprove(lessonData.rowVersion), '✓ Đã phê duyệt bài học thành công!', 'Lỗi khi phê duyệt bài học')}
                disabled={saveStatus === 'saving' || isSaving}
              >
                Phê duyệt
              </button>
            </>
          )}
          {isReviewer && lessonData.status === 'approved' && (
            <>
              <button
                type="button"
                className="staff-btn staff-btn-secondary"
                onClick={() => handleLifecycleAction(() => onRequestChanges(undefined, lessonData.rowVersion), '✓ Đã yêu cầu chỉnh sửa bài học.', 'Lỗi khi yêu cầu chỉnh sửa')}
                disabled={saveStatus === 'saving' || isSaving}
              >
                Yêu cầu sửa
              </button>
              <button
                type="button"
                className="staff-btn staff-btn-primary"
                onClick={() => handleLifecycleAction(() => onPublish(lessonData.rowVersion), '✓ Đã xuất bản bài học thành công cho học sinh!', 'Lỗi khi xuất bản bài học')}
                disabled={saveStatus === 'saving' || isSaving}
              >
                {saveStatus === 'saving' ? 'Đang lưu...' : 'Xuất bản bài học'}
              </button>
            </>
          )}
          {isReviewer && lessonData.status === 'published' && (
            <button
              type="button"
              className="staff-btn staff-btn-secondary"
              onClick={() => handleLifecycleAction(() => onUnpublish(lessonData.rowVersion), '✓ Đã gỡ xuất bản bài học.', 'Lỗi khi gỡ xuất bản bài học')}
              disabled={saveStatus === 'saving' || isSaving}
            >
              Gỡ xuất bản
            </button>
          )}
          {isReviewer && lessonData.status !== 'archived' && (
            <button
              type="button"
              className="staff-btn staff-btn-secondary"
              onClick={() => handleLifecycleAction(() => onArchive(undefined, lessonData.rowVersion), '✓ Đã lưu trữ bài học.', 'Lỗi khi lưu trữ bài học')}
              disabled={saveStatus === 'saving' || isSaving}
            >
              Lưu trữ
            </button>
          )}
          {isReviewer && lessonData.status === 'archived' && (
            <button
              type="button"
              className="staff-btn staff-btn-primary"
              onClick={() => handleLifecycleAction(() => onReactivate(lessonData.rowVersion), '✓ Đã khôi phục bài học về bản nháp.', 'Lỗi khi khôi phục bài học')}
              disabled={saveStatus === 'saving' || isSaving}
            >
              Khôi phục bản nháp
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function ContentLessonEditorPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const isReviewer = ['admin', 'content_admin', 'content', 'reviewer'].includes((user?.role || '').toLowerCase())
  const { lessonData, loading, isSaving, error, saveDraft, submitReview, approve, publish, unpublish, requestChanges, archive, reactivate, refresh } =
    useLessonEditor(id || '')

  // CURR-009: Missing lesson ID must display error, never fallback to demo lesson
  if (!id) {
    return (
      <div className="staff-page">
        <PageErrorState
          title="Thiếu mã bài học"
          message="Đường dẫn không hợp lệ hoặc thiếu mã bài học."
        />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="staff-page">
        <Skeleton height={36} width={300} />
        <div style={{ marginTop: '20px', display: 'grid', gap: '16px' }}>
          <Skeleton height={48} />
          <Skeleton height={120} />
          <Skeleton height={120} />
        </div>
      </div>
    )
  }

  if (error || !lessonData) {
    return (
      <div className="staff-page">
        <PageErrorState
          title="Không thể tải bài học."
          message={error || 'Không tìm thấy bài học'}
          onRetry={refresh}
        />
      </div>
    )
  }

  return (
    <LessonEditorForm
      key={lessonData.id}
      lessonData={lessonData}
      isSaving={isSaving}
      isReviewer={isReviewer}
      onSaveDraft={saveDraft}
      onSubmitReview={submitReview}
      onApprove={approve}
      onPublish={publish}
      onUnpublish={unpublish}
      onRequestChanges={requestChanges}
      onArchive={archive}
      onReactivate={reactivate}
    />
  )
}
