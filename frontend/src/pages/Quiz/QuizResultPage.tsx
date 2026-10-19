import { useState } from 'react'
import {
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  XCircle,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { PageErrorState } from '@/components/ui/PageErrorState'
import { Skeleton } from '@/components/ui/Skeleton'
import { useQuizResult } from '@/hooks/useQuiz'
import './QuizResultPage.css'

export function QuizResultPage() {
  const { quizId } = useParams<{ quizId: string }>()
  const navigate = useNavigate()
  const { result, isLoading, error, reload } = useQuizResult(quizId)
  const [showSolutionList, setShowSolutionList] = useState(false)

  if (isLoading) {
    return (
      <div className="quiz-result-root">
        <Skeleton variant="text" width={200} height={16} />
        <Skeleton variant="rect" width="100%" height={240} />
      </div>
    )
  }

  if (error || !result) {
    return (
      <div className="quiz-result-root">
        <Breadcrumb items={[{ label: 'Bài kiểm tra', to: `/quiz/${quizId}` }, { label: 'Kết quả' }]} />
        <PageErrorState description={error || 'Không tìm thấy kết quả'} onRetry={reload} />
      </div>
    )
  }

  const handleAskAIAboutResult = () => {
    const weaknesses = result.improvements.join(', ')
    const promptText = `Tôi vừa hoàn thành bài kiểm tra "${result.quizTitle}" với số điểm ${result.percentage}%. Tôi cần ôn lại các phần: ${weaknesses}. Hãy cho tôi một kế hoạch ôn tập nhanh và 3 ví dụ vận dụng.`
    navigate(`/ai-tutor?prompt=${encodeURIComponent(promptText)}`)
  }

  return (
    <div className="quiz-result-root">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Bài kiểm tra', to: `/quiz/${result.quizId}` },
          { label: 'Kết quả' },
        ]}
      />

      {/* Main Score Card */}
      <div className="quiz-result-score-card">
        <div className="result-score-header">
          <span className="result-subject-tag">{result.subjectName}</span>
          <h1 className="result-quiz-title">{result.quizTitle}</h1>
        </div>

        <div className="result-score-body">
          <div className="score-circle-display">
            <span className="score-ratio">
              {result.correctCount} / {result.totalQuestions}
            </span>
            <span className="score-percent">{result.percentage}%</span>
          </div>

          <div className="result-score-details">
            <div className="result-xp-row">
              <span className="result-xp-pill">
                <Sparkles size={14} aria-hidden /> +{result.earnedXP} XP
              </span>
              <span className="result-time-text">
                Thời gian làm: {Math.floor(result.timeTakenSeconds / 60)} phút {result.timeTakenSeconds % 60} giây
              </span>
            </div>

            <div className="result-status-message">
              {result.passed ? (
                <span className="pass-text">
                  ✓ Bạn đã đạt yêu cầu chuẩn đầu ra của bài học này.
                </span>
              ) : (
                <span className="fail-text">
                  Bạn cần đạt từ 80% trở lên để hoàn thành mục tiêu. Hãy ôn tập lại các phần còn yếu!
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Strengths & Improvements Columns */}
        <div className="analysis-grid">
          {/* Strengths */}
          <div className="analysis-col strengths-col">
            <div className="analysis-col-header">
              <CheckCircle2 size={16} className="text-success" aria-hidden />
              <h2 className="analysis-col-title">Điểm mạnh</h2>
            </div>
            <ul className="analysis-list">
              {result.strengths.map((item, idx) => (
                <li key={idx} className="analysis-list-item">
                  <span className="item-bullet">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Improvements */}
          <div className="analysis-col improvements-col">
            <div className="analysis-col-header">
              <XCircle size={16} className="text-danger" aria-hidden />
              <h2 className="analysis-col-title">Cần cải thiện</h2>
            </div>
            <ul className="analysis-list">
              {result.improvements.map((item, idx) => (
                <li key={idx} className="analysis-list-item">
                  <span className="item-bullet">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="result-actions-bar">
          <Button
            variant="outline"
            icon={showSolutionList ? ChevronUp : ChevronDown}
            onClick={() => setShowSolutionList((prev) => !prev)}
          >
            {showSolutionList ? 'Ẩn lời giải' : 'Xem lời giải chi tiết'}
          </Button>

          <Button
            variant="outline"
            icon={RotateCcw}
            onClick={() => navigate(`/quiz/${result.quizId}`)}
          >
            Làm lại bài thi
          </Button>

          <Button
            variant="primary"
            icon={Bot}
            onClick={handleAskAIAboutResult}
          >
            Hỏi AI Tutor
          </Button>
        </div>
      </div>

      {/* Collapsible Solution Detail List */}
      {showSolutionList && (
        <div className="solutions-container">
          <h2 className="solutions-heading">Chi tiết bài làm từng câu</h2>
          <div className="solutions-list">
            {result.answers.map((ans) => (
              <div
                key={ans.questionId}
                className={`solution-item-card ${ans.isCorrect ? 'correct' : 'wrong'}`}
              >
                <div className="solution-item-header">
                  <span className="solution-q-num">Câu {ans.questionNumber}</span>
                  {ans.isCorrect ? (
                    <span className="solution-badge-tag correct">Chính xác</span>
                  ) : (
                    <span className="solution-badge-tag wrong">Chưa đúng</span>
                  )}
                </div>

                <p className="solution-q-text">{ans.questionText}</p>

                <div className="solution-explanation-box">
                  <strong>Giải thích đáp án: </strong>
                  {ans.explanation}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default QuizResultPage
