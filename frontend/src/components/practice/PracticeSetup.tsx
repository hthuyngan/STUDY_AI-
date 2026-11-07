import React, { useEffect, useState } from 'react'
import { BookOpen, CheckCircle, Filter, Play, Target } from 'lucide-react'
import { practiceService } from '@/services/practice.service'
import type { PracticeSetupConfig } from '@/types/practice'
import type { QuestionDifficulty, QuestionType } from '@/types/questionBank'
import './PracticeSetup.css'

interface PracticeSetupProps {
  onStartSession: (config: PracticeSetupConfig) => void
  onCancel?: () => void
}

export const PracticeSetup: React.FC<PracticeSetupProps> = ({
  onStartSession,
  onCancel,
}) => {
  const [lessonId, setLessonId] = useState<string>('')
  const [selectedSkillId, setSelectedSkillId] = useState<string>('')
  const [questionType, setQuestionType] = useState<QuestionType | ''>('')
  const [difficulty, setDifficulty] = useState<QuestionDifficulty | ''>('')
  const [limit, setLimit] = useState<number>(5)

  const [availableCount, setAvailableCount] = useState<number>(0)
  const [loadingCount, setLoadingCount] = useState<boolean>(true)

  // Standard lessons from Math 12 Chapter 1
  const lessons = [
    { id: '', label: 'Toàn bộ Chương 1 (Tổng hợp)' },
    { id: 'lesson-math-12-01', label: 'Bài 1: Tính đơn điệu & cực trị của hàm số' },
    { id: 'lesson-math-12-02', label: 'Bài 2: Giá trị lớn nhất & giá trị nhỏ nhất của hàm số' },
    { id: 'lesson-math-12-03', label: 'Bài 3: Khảo sát sự biến thiên & đồ thị của hàm số' },
  ]

  // Standard skills from GDPT 2018 Math 12 Chapter 1
  const skills = [
    { id: '', label: 'Tất cả kỹ năng năng lực' },
    { id: 'SKILL-MATH-12-DERIV-SIGN', label: 'Xét dấu đạo hàm & BBT' },
    { id: 'SKILL-MATH-12-MONOTONICITY', label: 'Tính đơn điệu của hàm số' },
    { id: 'SKILL-MATH-12-EXTREMUM', label: 'Cực trị của hàm số' },
    { id: 'SKILL-MATH-12-MINMAX-SEGMENT', label: 'GTLN / GTNN trên đoạn' },
    { id: 'SKILL-MATH-12-MINMAX-INTERVAL', label: 'GTLN / GTNN trên khoảng' },
    { id: 'SKILL-MATH-12-ASYMPTOTE', label: 'Tiệm cận của đồ thị' },
    { id: 'SKILL-MATH-12-GRAPH-SKETCHING', label: 'Khảo sát & nhận dạng đồ thị' },
  ]

  useEffect(() => {
    let isMounted = true
    const checkCount = async () => {
      setLoadingCount(true)
      try {
        const questions = await practiceService.getAvailableQuestions({
          subjectId: 'math',
          chapterId: 'chap-math-12-01',
          lessonId: lessonId || undefined,
          skillIds: selectedSkillId ? [selectedSkillId] : undefined,
          questionType: (questionType as QuestionType) || undefined,
          difficulty: (difficulty as QuestionDifficulty) || undefined,
          limit: 100, // get real count
        })
        if (isMounted) {
          setAvailableCount(questions.length)
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
  }, [lessonId, selectedSkillId, questionType, difficulty])

  const handleStart = () => {
    if (availableCount === 0) return
    onStartSession({
      subjectId: 'math',
      chapterId: 'chap-math-12-01',
      lessonId: lessonId || undefined,
      skillIds: selectedSkillId ? [selectedSkillId] : undefined,
      questionType: (questionType as QuestionType) || undefined,
      difficulty: (difficulty as QuestionDifficulty) || undefined,
      limit: Math.min(limit, availableCount),
    })
  }

  return (
    <div className="practice-setup-card">
      <div className="setup-header">
        <div className="setup-badge">
          <Target size={14} aria-hidden />
          <span>LUYỆN TẬP XÁC ĐỊNH · GDPT 2018</span>
        </div>
        <h2 className="setup-title">Thiết lập bài luyện tập Toán 12</h2>
        <p className="setup-desc">
          Tạo lượt làm bài thực tế với dữ liệu từ Ngân hàng câu hỏi đã duyệt. Hệ thống tự động
          lưu nháp, chấm điểm xác định và phân tích mức độ thành thạo theo kỹ năng sau khi nộp.
        </p>
      </div>

      <div className="setup-form-grid">
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
            {lessons.map((l) => (
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
