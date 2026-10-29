import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useLessonEditor } from '@/hooks/useContent'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Skeleton } from '@/components/ui/Skeleton'
import { PageErrorState } from '@/components/ui/PageErrorState'
import type { LessonEditorData } from '@/types/content'
import './ContentPages.css'

interface LessonEditorFormProps {
  lessonData: LessonEditorData
  isSaving: boolean
  onSave: (updates: Partial<LessonEditorData>) => Promise<void>
}

function LessonEditorForm({ lessonData, isSaving, onSave }: LessonEditorFormProps) {
  const [title, setTitle] = useState(lessonData.title)
  const [introduction, setIntroduction] = useState(lessonData.introduction)
  const [definitions, setDefinitions] = useState(lessonData.definitions)
  const [formulas, setFormulas] = useState(lessonData.formulas)
  const [examples, setExamples] = useState(lessonData.examples)
  const [notes, setNotes] = useState(lessonData.notes)
  const [summary, setSummary] = useState(lessonData.summary)
  const [isDirty, setIsDirty] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)

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

  const handleFieldChange = (setter: (val: string) => void) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setter(e.target.value)
    setIsDirty(true)
  }

  const handleSave = async (newStatus?: typeof lessonData.status) => {
    setSaveStatus('saving')
    setSaveError(null)
    try {
      await onSave({
        title,
        introduction,
        definitions,
        formulas,
        examples,
        notes,
        summary,
        ...(newStatus ? { status: newStatus } : {}),
      })
      setSaveStatus('saved')
      setIsDirty(false)
      setTimeout(() => setSaveStatus('idle'), 2500)
    } catch (err: unknown) {
      setSaveStatus('error')
      setSaveError(err instanceof Error ? err.message : 'Lỗi lưu bài học')
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
          ✓ Đã lưu thay đổi thành công!
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
          ✕ Lỗi lưu bài học: {saveError}
        </div>
      )}

      <div style={{ display: 'grid', gap: '24px' }}>
        {/* Section 1: Basic Information */}
        <div className="staff-card">
          <h2 className="staff-card-title">Thông tin cơ bản</h2>
          <div className="editor-form-section">
            <label htmlFor="ed-title">Tiêu đề bài học</label>
            <input
              id="ed-title"
              type="text"
              value={title}
              onChange={handleFieldChange(setTitle)}
              placeholder="VD: Khảo sát và vẽ đồ thị hàm phân thức..."
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <span className="hint">Môn học:</span>
              <div style={{ fontWeight: 600, marginTop: '2px' }}>Toán học 12</div>
            </div>
            <div>
              <span className="hint">Chương:</span>
              <div style={{ fontWeight: 600, marginTop: '2px' }}>Chương 1: Khảo sát hàm số</div>
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
              onChange={handleFieldChange(setIntroduction)}
              placeholder="Giới thiệu bối cảnh thực tế hoặc vấn đề dẫn nhập..."
            />
            <span className="hint">Giúp học sinh hiểu tại sao cần học nội dung này và ứng dụng thực tế.</span>
          </div>
        </div>

        {/* Section 3: Definitions */}
        <div className="staff-card">
          <h2 className="staff-card-title">2. Định nghĩa & Khái niệm cốt lõi (Definitions)</h2>
          <div className="editor-form-section">
            <label htmlFor="ed-def">Khái niệm & Định lý</label>
            <textarea
              id="ed-def"
              rows={5}
              value={definitions}
              onChange={handleFieldChange(setDefinitions)}
              placeholder="Định nghĩa tập xác định, điều kiện nghiệm, tính đơn điệu..."
            />
          </div>
        </div>

        {/* Section 4: Formulas */}
        <div className="staff-card">
          <h2 className="staff-card-title">3. Công thức tính nhanh & Quy tắc (Formulas)</h2>
          <div className="editor-form-section">
            <label htmlFor="ed-form">Công thức</label>
            <textarea
              id="ed-form"
              rows={4}
              value={formulas}
              onChange={handleFieldChange(setFormulas)}
              placeholder="Công thức đạo hàm, tiệm cận, tọa độ tâm đối xứng..."
            />
          </div>
        </div>

        {/* Section 5: Examples */}
        <div className="staff-card">
          <h2 className="staff-card-title">4. Ví dụ minh họa có giải chi tiết (Examples)</h2>
          <div className="editor-form-section">
            <label htmlFor="ed-ex">Ví dụ & Lời giải mẫu</label>
            <textarea
              id="ed-ex"
              rows={6}
              value={examples}
              onChange={handleFieldChange(setExamples)}
              placeholder="Đề bài ví dụ và các bước giải cụ thể..."
            />
          </div>
        </div>

        {/* Section 6: Notes & Traps */}
        <div className="staff-card">
          <h2 className="staff-card-title">5. Các lỗi sai thường gặp & Lưu ý (Important Notes)</h2>
          <div className="editor-form-section">
            <label htmlFor="ed-notes">Ghi chú bẫy đề thi</label>
            <textarea
              id="ed-notes"
              rows={3}
              value={notes}
              onChange={handleFieldChange(setNotes)}
              placeholder="Các bẫy trắc nghiệm học sinh hay mắc..."
            />
          </div>
        </div>

        {/* Section 7: Summary & Harvest Assessment */}
        <div className="staff-card">
          <h2 className="staff-card-title">6. Tổng kết & Bài kiểm tra thu hoạch</h2>
          <div className="editor-form-section">
            <label htmlFor="ed-sum">Tóm tắt bài học (Summary)</label>
            <textarea
              id="ed-sum"
              rows={3}
              value={summary}
              onChange={handleFieldChange(setSummary)}
              placeholder="Những ý trọng tâm cần ghi nhớ..."
            />
          </div>

          <div
            style={{
              marginTop: '16px',
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
              <span style={{ fontSize: '14px' }}>asm-math-08 (Trắc nghiệm 4 câu, điểm qua: 60%)</span>
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

      {/* Sticky Action Bar */}
      <div className="editor-sticky-bar">
        <div style={{ fontSize: '13px', color: 'var(--color-ink-muted)' }}>
          {lessonData.lastSavedAt
            ? `Đã lưu lúc: ${new Date(lessonData.lastSavedAt).toLocaleTimeString('vi-VN')}`
            : 'Chưa lưu thay đổi'}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="staff-btn staff-btn-secondary"
            onClick={() => handleSave('draft')}
            disabled={saveStatus === 'saving' || isSaving}
          >
            Lưu bản nháp
          </button>
          <button
            type="button"
            className="staff-btn staff-btn-secondary"
            onClick={() => handleSave('in-review')}
            disabled={saveStatus === 'saving' || isSaving}
          >
            Gửi kiểm duyệt
          </button>
          <button
            type="button"
            className="staff-btn staff-btn-primary"
            onClick={() => handleSave('published')}
            disabled={saveStatus === 'saving' || isSaving}
          >
            {saveStatus === 'saving' ? 'Đang lưu...' : 'Xuất bản bài học'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function ContentLessonEditorPage() {
  const { id } = useParams<{ id: string }>()
  const lessonId = id || 'lesson-math-08'
  const { lessonData, loading, isSaving, error, save, refresh } = useLessonEditor(lessonId)

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
        <PageErrorState title="Không thể kết nối máy chủ quản trị." message={error || 'Không tìm thấy bài học'} onRetry={refresh} />
      </div>
    )
  }

  return <LessonEditorForm key={lessonData.id} lessonData={lessonData} isSaving={isSaving} onSave={save} />
}
