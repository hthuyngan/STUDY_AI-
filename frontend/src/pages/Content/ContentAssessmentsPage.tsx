import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useContentAssessments } from '@/hooks/useContent'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageErrorState } from '@/components/ui/PageErrorState'

interface QuestionItem {
  id: string
  text: string
  type: 'single-choice' | 'true-false'
  options: string[]
  correctIndex: number
  explanation: string
}

const MOCK_QUESTIONS: QuestionItem[] = [
  {
    id: 'q-1',
    text: 'Đồ thị hàm số y = (2x - 1) / (x + 1) có tiệm cận đứng là đường thẳng nào?',
    type: 'single-choice',
    options: ['x = -1', 'x = 1', 'x = 2', 'y = 2'],
    correctIndex: 0,
    explanation: 'Nghiệm của mẫu số x + 1 = 0 suy ra x = -1 là tiệm cận đứng.',
  },
  {
    id: 'q-2',
    text: 'Đồ thị hàm phân thức bậc nhất trên bậc nhất luôn có tâm đối xứng là giao điểm của hai tiệm cận.',
    type: 'true-false',
    options: ['Đúng', 'Sai'],
    correctIndex: 0,
    explanation: 'Theo tính chất đồ thị hàm phân thức hyperbol bậc 1 / bậc 1, tâm đối xứng luôn là giao hai tiệm cận.',
  },
]

export function ContentAssessmentsPage() {
  const { assessments, loading, error, refresh } = useContentAssessments()
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null)
  const [questions, setQuestions] = useState<QuestionItem[]>(MOCK_QUESTIONS)
  const [newQuestionText, setNewQuestionText] = useState('')
  const [newQuestionType, setNewQuestionType] = useState<'single-choice' | 'true-false'>('single-choice')
  const [newQuestionOptions, setNewQuestionOptions] = useState('Đáp án A\nĐáp án B\nĐáp án C\nĐáp án D')
  const [newQuestionCorrect, setNewQuestionCorrect] = useState(0)
  const [newQuestionExplanation, setNewQuestionExplanation] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)

  const handleAddQuestion = () => {
    if (!newQuestionText.trim()) return
    const opts = newQuestionType === 'true-false' ? ['Đúng', 'Sai'] : newQuestionOptions.split('\n').filter(Boolean)
    const newQ: QuestionItem = {
      id: `q-${Date.now()}`,
      text: newQuestionText.trim(),
      type: newQuestionType,
      options: opts,
      correctIndex: Number(newQuestionCorrect),
      explanation: newQuestionExplanation.trim(),
    }
    setQuestions([...questions, newQ])
    setNewQuestionText('')
    setNewQuestionExplanation('')
    setShowAddForm(false)
  }

  return (
    <div className="staff-page">
      <div className="staff-page-header">
        <div className="staff-page-title-row">
          <div>
            <nav className="staff-breadcrumbs" aria-label="Breadcrumb">
              <Link to="/content">Nội dung</Link>
              <span>/</span>
              <span aria-current="page">Bài thu hoạch</span>
            </nav>
            <h1>Ngân hàng câu hỏi thu hoạch</h1>
            <p className="staff-page-desc">
              Quản lý các bộ câu hỏi trắc nghiệm đánh giá năng lực học sinh sau mỗi bài học (Harvest Assessment).
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gap: '8px' }}>
          <Skeleton height={52} />
          <Skeleton height={52} />
          <Skeleton height={52} />
        </div>
      ) : error ? (
        <PageErrorState title="Không thể kết nối máy chủ quản trị." message={error} onRetry={refresh} />
      ) : assessments.length === 0 ? (
        <EmptyState title="Chưa có bài thu hoạch" description="Không tìm thấy bài thu hoạch nào." />
      ) : (
        <div style={{ display: 'grid', gap: '24px' }}>
          <div className="staff-table-wrapper">
            <table className="staff-table">
              <thead>
                <tr>
                  <th>Mã bài</th>
                  <th>Bài học liên kết</th>
                  <th>Số câu hỏi</th>
                  <th>Điểm qua</th>
                  <th>Trạng thái</th>
                  <th>Cập nhật</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {assessments.map((item) => (
                  <tr
                    key={item.id}
                    style={{
                      background: selectedAssessmentId === item.id ? 'var(--color-surface-hover)' : undefined,
                    }}
                  >
                    <td>
                      <code>{item.id}</code>
                    </td>
                    <td>
                      <strong style={{ color: 'var(--color-navy-dark)' }}>{item.lessonTitle}</strong>
                    </td>
                    <td>{item.questionCount} câu</td>
                    <td>{item.passingScore}%</td>
                    <td>
                      <StatusBadge
                        status={item.status}
                        label={
                          item.status === 'published'
                            ? 'Đã xuất bản'
                            : item.status === 'in-review'
                              ? 'Chờ duyệt'
                              : 'Bản nháp'
                        }
                      />
                    </td>
                    <td>{new Date(item.updatedAt).toLocaleDateString('vi-VN')}</td>
                    <td>
                      <button
                        type="button"
                        className="staff-btn staff-btn-secondary"
                        style={{ fontSize: '12px', padding: '4px 8px' }}
                        onClick={() => setSelectedAssessmentId(item.id)}
                      >
                        {selectedAssessmentId === item.id ? 'Đang mở' : 'Biên soạn câu hỏi'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Question management drawer / panel */}
          <div className="staff-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 className="staff-card-title" style={{ margin: 0 }}>
                  Danh sách câu hỏi trắc nghiệm
                </h2>
                <span style={{ fontSize: '13px', color: 'var(--color-ink-muted)' }}>
                  {questions.length} câu hỏi trong bài thu hoạch
                </span>
              </div>
              <button
                type="button"
                className="staff-btn staff-btn-primary"
                style={{ fontSize: '13px', padding: '6px 12px' }}
                onClick={() => setShowAddForm(!showAddForm)}
              >
                {showAddForm ? 'Đóng biểu mẫu' : '+ Thêm câu hỏi'}
              </button>
            </div>

            {showAddForm && (
              <div
                style={{
                  padding: '16px',
                  background: 'var(--color-surface-hover, rgba(0,0,0,0.02))',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  marginBottom: '20px',
                  display: 'grid',
                  gap: '12px',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '14px' }}>Tạo câu hỏi mới</div>

                <div>
                  <label htmlFor="q-text" style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>
                    Nội dung câu hỏi
                  </label>
                  <textarea
                    id="q-text"
                    rows={2}
                    value={newQuestionText}
                    onChange={(e) => setNewQuestionText(e.target.value)}
                    placeholder="Nhập nội dung đề bài..."
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label htmlFor="q-type" style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>
                      Loại câu hỏi
                    </label>
                    <select
                      id="q-type"
                      value={newQuestionType}
                      onChange={(e) => setNewQuestionType(e.target.value as 'single-choice' | 'true-false')}
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                    >
                      <option value="single-choice">Trắc nghiệm 4 lựa chọn (Single choice)</option>
                      <option value="true-false">Đúng / Sai (True / False)</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="q-correct" style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>
                      Đáp án đúng (Index 0-3)
                    </label>
                    <select
                      id="q-correct"
                      value={newQuestionCorrect}
                      onChange={(e) => setNewQuestionCorrect(Number(e.target.value))}
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                    >
                      <option value={0}>Đáp án 1 (A hoặc Đúng)</option>
                      <option value={1}>Đáp án 2 (B hoặc Sai)</option>
                      <option value={2}>Đáp án 3 (C)</option>
                      <option value={3}>Đáp án 4 (D)</option>
                    </select>
                  </div>
                </div>

                {newQuestionType === 'single-choice' && (
                  <div>
                    <label htmlFor="q-options" style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>
                      Các lựa chọn (mỗi dòng 1 phương án)
                    </label>
                    <textarea
                      id="q-options"
                      rows={4}
                      value={newQuestionOptions}
                      onChange={(e) => setNewQuestionOptions(e.target.value)}
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="q-exp" style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>
                    Lời giải thích chi tiết
                  </label>
                  <input
                    id="q-exp"
                    type="text"
                    value={newQuestionExplanation}
                    onChange={(e) => setNewQuestionExplanation(e.target.value)}
                    placeholder="Giải thích tại sao đáp án đó là đúng..."
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                  <button
                    type="button"
                    className="staff-btn staff-btn-secondary"
                    onClick={() => setShowAddForm(false)}
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    className="staff-btn staff-btn-primary"
                    onClick={handleAddQuestion}
                  >
                    Lưu câu hỏi
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gap: '12px' }}>
              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  style={{
                    padding: '12px 14px',
                    border: '1px solid var(--color-border)',
                    borderRadius: '6px',
                    background: 'var(--color-surface)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-navy-dark)' }}>
                      Câu {idx + 1}: {q.text}
                    </div>
                    <span
                      style={{
                        fontSize: '11px',
                        textTransform: 'uppercase',
                        padding: '2px 6px',
                        background: 'var(--color-surface-hover)',
                        borderRadius: '4px',
                      }}
                    >
                      {q.type}
                    </span>
                  </div>

                  <div style={{ marginTop: '8px', display: 'grid', gap: '4px', fontSize: '13px' }}>
                    {q.options.map((opt, oIdx) => (
                      <div
                        key={oIdx}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          background: oIdx === q.correctIndex ? 'rgba(43, 138, 62, 0.1)' : 'transparent',
                          color: oIdx === q.correctIndex ? 'var(--color-success, #2b8a3e)' : 'inherit',
                          fontWeight: oIdx === q.correctIndex ? 600 : 400,
                        }}
                      >
                        {String.fromCharCode(65 + oIdx)}. {opt} {oIdx === q.correctIndex && '✓ (Đáp án đúng)'}
                      </div>
                    ))}
                  </div>

                  {q.explanation && (
                    <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--color-ink-muted)' }}>
                      <em>Giải thích:</em> {q.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
