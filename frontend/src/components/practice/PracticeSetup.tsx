import React, { useCallback, useEffect, useState } from 'react'
import { AlertCircle, BookOpen, CheckCircle, Filter, Play, Target } from 'lucide-react'
import { useAuth } from '@/auth/useAuth'
import { curriculumService, type LearnerChapter } from '@/services/curriculum.service'
import { practiceService } from '@/services/practice.service'
import type { PracticeSetupConfig } from '@/types/practice'
import type { QuestionDifficulty, QuestionType } from '@/types/questionBank'
import './PracticeSetup.css'

interface PracticeSetupProps {
  onStartSession: (config: PracticeSetupConfig) => void
  onCancel?: () => void
}

// Standard skills from GDPT 2018
const skills = [
  { id: '', label: 'Tất cả kỹ năng năng lực' },
  { id: 'SKILL-MATH-DERIV-SIGN', label: 'Xét dấu đạo hàm & BBT' },
  { id: 'SKILL-MATH-MONOTONICITY', label: 'Tính đơn điệu của hàm số' },
  { id: 'SKILL-MATH-EXTREMUM', label: 'Cực trị của hàm số' },
  { id: 'SKILL-MATH-MINMAX', label: 'Giá trị lớn nhất & nhỏ nhất' },
  { id: 'SKILL-MATH-ASYMPTOTE', label: 'Tiệm cận của đồ thị' },
  { id: 'SKILL-MATH-GRAPH-SKETCHING', label: 'Khảo sát & nhận dạng đồ thị' },
]

export const PracticeSetup: React.FC<PracticeSetupProps> = ({
  onStartSession,
  onCancel,
}) => {
  const { user } = useAuth()
  const defaultGrade = user?.grade === '10' ? '10' : user?.grade === '11' ? '11' : '12'
  const [selectedGrade, setSelectedGrade] = useState<string>(defaultGrade)
  const [chapters, setChapters] = useState<LearnerChapter[]>([])
  const [selectedChapterId, setSelectedChapterId] = useState<string>('')
  const [lessonId, setLessonId] = useState<string>('')
  const [selectedSkillId, setSelectedSkillId] = useState<string>('')
  const [questionType, setQuestionType] = useState<QuestionType | ''>('')
  const [difficulty, setDifficulty] = useState<QuestionDifficulty | ''>('')
  const [limit, setLimit] = useState<number>(5)

  const [availableCount, setAvailableCount] = useState<number | null>(null)
  const [loadingCount, setLoadingCount] = useState<boolean>(true)
  const [countError, setCountError] = useState<string | null>(null)

  const selectedSubjectId =
    selectedGrade === '10' ? 'sub_math10' : selectedGrade === '11' ? 'sub_math11' : 'sub_math12'

  // Fetch real curriculum chapters whenever selected grade/subject changes
  useEffect(() => {
    let isMounted = true
    const loadChapters = async () => {
      try {
        const fetchedChapters = await curriculumService.getSubjectChapters(selectedSubjectId)
        if (isMounted) {
          setChapters(fetchedChapters || [])
          setSelectedChapterId('')
          setLessonId('')
        }
      } catch {
        if (isMounted) {
          setChapters([])
          setSelectedChapterId('')
          setLessonId('')
        }
      }
    }
    loadChapters()
    return () => {
      isMounted = false
    }
  }, [selectedSubjectId])

  // Derive visible lessons based on selected chapter or all chapters
  const availableLessons = React.useMemo(() => {
    if (selectedChapterId) {
      const chap = chapters.find((c) => c.id === selectedChapterId)
      return chap ? chap.lessons : []
    }
    return chapters.flatMap((c) => c.lessons || [])
  }, [chapters, selectedChapterId])

  // Query real question count from SQL backend with unified server predicate
  const checkCount = useCallback(async () => {
    setLoadingCount(true)
    setCountError(null)
    try {
      const count = await practiceService.getQuestionCount({
        subjectId: selectedSubjectId,
        chapterId: selectedChapterId || undefined,
        lessonId: lessonId || undefined,
        difficulty: difficulty || undefined,
        skillId: selectedSkillId || undefined,
        questionType: questionType || undefined,
        grade: selectedGrade || undefined,
      })
      setAvailableCount(count)
      setCountError(null)
    } catch {
      setAvailableCount(null)
      setCountError('Không thể kết nối máy chủ để kiểm tra số lượng câu hỏi.')
    } finally {
      setLoadingCount(false)
    }
  }, [selectedSubjectId, selectedChapterId, lessonId, difficulty, selectedSkillId, questionType, selectedGrade])

  useEffect(() => {
    checkCount()
  }, [checkCount])

  const handleStart = () => {
    if (!availableCount || availableCount === 0 || countError) return
    onStartSession({
      subjectId: selectedSubjectId,
      chapterId: selectedChapterId || undefined,
      lessonId: lessonId || undefined,
      skillId: selectedSkillId || undefined,
      skillIds: selectedSkillId ? [selectedSkillId] : undefined,
      questionType: (questionType as QuestionType) || undefined,
      difficulty: (difficulty as QuestionDifficulty) || undefined,
      grade: selectedGrade || undefined,
      limit: Math.min(limit, availableCount),
      mode: 'practice',
    })
  }

  return (
    <div className="practice-setup-card">
      <div className="setup-header">
        <div className="setup-badge">
          <Target size={14} aria-hidden />
          <span>LUYỆN TẬP XÁC ĐỊNH · GDPT 2018</span>
        </div>
        <h2 className="setup-title">Thiết lập bài luyện tập môn Toán lớp {selectedGrade}</h2>
        <p className="setup-desc">
          Tạo lượt làm bài thực tế với dữ liệu từ Ngân hàng câu hỏi đã duyệt. Hệ thống tự động
          lưu nháp, chấm điểm xác định và phân tích mức độ thành thạo theo kỹ năng sau khi nộp.
        </p>
      </div>

      <div className="setup-form-grid">
        {/* Grade Select */}
        <div className="setup-field-group">
          <label className="setup-field-label">
            <BookOpen size={14} aria-hidden />
            <span>Khối lớp</span>
          </label>
          <select
            className="setup-select"
            data-testid="grade-select"
            value={selectedGrade}
            onChange={(e) => {
              setSelectedGrade(e.target.value)
              setSelectedChapterId('')
              setLessonId('')
            }}
          >
            <option value="10">Toán lớp 10</option>
            <option value="11">Toán lớp 11</option>
            <option value="12">Toán lớp 12</option>
          </select>
        </div>

        {/* Chapter Select */}
        <div className="setup-field-group">
          <label className="setup-field-label">
            <BookOpen size={14} aria-hidden />
            <span>Chương học</span>
          </label>
          <select
            className="setup-select"
            value={selectedChapterId}
            onChange={(e) => {
              setSelectedChapterId(e.target.value)
              setLessonId('')
            }}
          >
            <option value="">Tất cả chương</option>
            {chapters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>

        {/* Lesson Select */}
        <div className="setup-field-group">
          <label className="setup-field-label">
            <BookOpen size={14} aria-hidden />
            <span>Phạm vi bài học</span>
          </label>
          <select
            className="setup-select"
            value={lessonId}
            onChange={(e) => setLessonId(e.target.value)}
          >
            <option value="">Tất cả bài học</option>
            {availableLessons.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title}
              </option>
            ))}
          </select>
        </div>

        {/* Skill Select */}
        <div className="setup-field-group">
          <label className="setup-field-label">
            <Filter size={14} aria-hidden />
            <span>Kỹ năng năng lực</span>
          </label>
          <select
            className="setup-select"
            value={selectedSkillId}
            onChange={(e) => setSelectedSkillId(e.target.value)}
          >
            {skills.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Question Type */}
        <div className="setup-field-group">
          <label className="setup-field-label">
            <span>Định dạng câu hỏi</span>
          </label>
          <select
            className="setup-select"
            data-testid="question-type-select"
            value={questionType}
            onChange={(e) => setQuestionType(e.target.value as QuestionType | '')}
          >
            <option value="">Tất cả 3 dạng (MCQ, Đúng/Sai, Trả lời ngắn)</option>
            <option value="multiple_choice">Trắc nghiệm 4 lựa chọn (MCQ)</option>
            <option value="true_false_group">Đúng / Sai theo cụm 4 ý</option>
            <option value="short_answer">Điền đáp án ngắn số học</option>
          </select>
        </div>

        {/* Difficulty */}
        <div className="setup-field-group">
          <label className="setup-field-label">
            <span>Độ khó</span>
          </label>
          <select
            className="setup-select"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as QuestionDifficulty | '')}
          >
            <option value="">Tất cả độ khó</option>
            <option value="easy">Dễ (Nhận biết)</option>
            <option value="medium">Trung bình (Thông hiểu)</option>
            <option value="hard">Khó (Vận dụng)</option>
            <option value="very_hard">Rất khó (Vận dụng cao)</option>
          </select>
        </div>

        {/* Number of Questions */}
        <div className="setup-field-group full-row">
          <label className="setup-field-label">
            <span>Số lượng câu hỏi làm bài</span>
          </label>
          <div className="limit-buttons-group">
            {[5, 10, 15, 20].map((num) => (
              <button
                key={num}
                type="button"
                className={`limit-btn ${limit === num ? 'active' : ''}`}
                onClick={() => setLimit(num)}
              >
                {num} câu
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Available Questions Indicator & Action Footer */}
      <div className="setup-footer-bar">
        <div className="available-count-box">
          <CheckCircle size={16} className="count-icon" aria-hidden />
          <span className="count-text">
            {loadingCount ? (
              'Đang kiểm tra câu hỏi sẵn có từ máy chủ...'
            ) : countError ? (
              <span className="count-error-alert" style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} aria-hidden />
                <span>{countError}</span>
                <button
                  type="button"
                  className="retry-count-btn"
                  onClick={() => checkCount()}
                  style={{ textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 600 }}
                >
                  Thử lại
                </button>
              </span>
            ) : availableCount !== null && availableCount > 0 ? (
              <>
                Sẵn sàng: <strong>{availableCount} câu hỏi</strong> đã duyệt trong ngân hàng
              </>
            ) : (
              <span className="no-question-alert">
                Không có câu hỏi nào phù hợp với bộ lọc đã chọn.
              </span>
            )}
          </span>
        </div>

        <div className="setup-actions">
          {onCancel && (
            <button type="button" className="setup-cancel-btn" onClick={onCancel}>
              Hủy
            </button>
          )}
          <button
            type="button"
            className="setup-start-btn"
            data-testid="practice-start-btn"
            disabled={loadingCount || !!countError || !availableCount || availableCount === 0}
            onClick={handleStart}
          >
            <Play size={16} aria-hidden />
            <span>Bắt đầu làm bài ({availableCount ? Math.min(limit, availableCount) : 0} câu)</span>
          </button>
        </div>
      </div>
    </div>
  )
}
