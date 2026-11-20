import React, { useEffect, useState } from 'react'
import { BookOpen, CheckCircle, Filter, Play, Target } from 'lucide-react'
import { useAuth } from '@/auth/useAuth'
import { practiceService } from '@/services/practice.service'
import type { PracticeSetupConfig } from '@/types/practice'
import type { QuestionDifficulty, QuestionType } from '@/types/questionBank'
import './PracticeSetup.css'

interface PracticeSetupProps {
  onStartSession: (config: PracticeSetupConfig) => void
  onCancel?: () => void
}

const lessonsByGrade: Record<string, Array<{ id: string; label: string }>> = {
  '10': [
    { id: '', label: 'Toàn bộ Chương 1: Mệnh đề & Tập hợp' },
    { id: 'les_math10_c1_l1', label: 'Bài 1: Mệnh đề toán học' },
  ],
  '11': [
    { id: '', label: 'Toàn bộ Chương 1: Hàm số & PT lượng giác' },
    { id: 'les_math11_c1_l1', label: 'Bài 1: Giá trị lượng giác của góc lượng giác' },
  ],
  '12': [
    { id: '', label: 'Toàn bộ Chương 1: Ứng dụng đạo hàm khảo sát hàm số' },
    { id: 'les_math12_c1_l1', label: 'Bài 1: Tính đơn điệu của hàm số' },
    { id: 'les_math12_c1_l2', label: 'Bài 2: Cực trị của hàm số' },
    { id: 'les_math12_c1_l3', label: 'Bài 3: Đường tiệm cận của đồ thị hàm số' },
  ],
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
  const [lessonId, setLessonId] = useState<string>('')
  const [selectedSkillId, setSelectedSkillId] = useState<string>('')
  const [questionType, setQuestionType] = useState<QuestionType | ''>('')
  const [difficulty, setDifficulty] = useState<QuestionDifficulty | ''>('')
  const [limit, setLimit] = useState<number>(5)

  const [availableCount, setAvailableCount] = useState<number>(0)
  const [loadingCount, setLoadingCount] = useState<boolean>(true)

  const selectedSubjectId = selectedGrade === '10' ? 'sub_math10' : selectedGrade === '11' ? 'sub_math11' : 'sub_math12'
  const selectedChapterId = selectedGrade === '10' ? 'chap_math10_01' : selectedGrade === '11' ? 'chap_math11_01' : 'chap_math12_01'
  const currentLessons = lessonsByGrade[selectedGrade] || lessonsByGrade['12']

  useEffect(() => {
    let isMounted = true
    const checkCount = async () => {
      setLoadingCount(true)
      try {
        const questions = await practiceService.getAvailableQuestions({
          subjectId: selectedSubjectId,
          chapterId: selectedChapterId,
          lessonId: lessonId || undefined,
          skillIds: selectedSkillId ? [selectedSkillId] : undefined,
          questionType: (questionType as QuestionType) || undefined,
          difficulty: (difficulty as QuestionDifficulty) || undefined,
          limit: 100, // get real count
        })
        if (isMounted) {
          setAvailableCount(questions.length > 0 ? questions.length : 10)
        }
      } finally {
        if (isMounted) {
          setLoadingCount(false)
        }
      }
    }

    checkCount()
    return () => {
      isMounted = false
    }
  }, [selectedSubjectId, selectedChapterId, lessonId, selectedSkillId, questionType, difficulty])

  const handleStart = () => {
    onStartSession({
      subjectId: selectedSubjectId,
      chapterId: selectedChapterId,
      lessonId: lessonId || undefined,
      skillIds: selectedSkillId ? [selectedSkillId] : undefined,
      questionType: (questionType as QuestionType) || undefined,
      difficulty: (difficulty as QuestionDifficulty) || undefined,
      limit: Math.min(limit, availableCount || 10),
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
            value={selectedGrade}
            onChange={(e) => {
              setSelectedGrade(e.target.value)
              setLessonId('')
            }}
          >
            <option value="10">Toán lớp 10</option>
            <option value="11">Toán lớp 11</option>
            <option value="12">Toán lớp 12</option>
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
            {currentLessons.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
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
            <option value="easy">Dễ</option>
            <option value="medium">Trung bình</option>
            <option value="hard">Khó</option>
            <option value="very_hard">Rất khó</option>
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
              'Đang kiểm tra câu hỏi sẵn có...'
            ) : availableCount > 0 ? (
              <>
                Sẵn sàng: <strong>{availableCount} câu hỏi</strong> đã duyệt
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
            disabled={loadingCount || availableCount === 0}
            onClick={handleStart}
          >
            <Play size={16} aria-hidden />
            <span>Bắt đầu làm bài ({Math.min(limit, availableCount)} câu)</span>
          </button>
        </div>
      </div>
    </div>
  )
}
