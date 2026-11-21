import React, { useEffect, useState } from 'react'
import {
  AlertCircle,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  HelpCircle,
  Loader2,
  RotateCcw,
  Sparkles,
  Target,
  XCircle,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { isRemoteApiConfigured } from '@/config/learner'
import { MathView } from '@/components/common/MathView'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { PageErrorState } from '@/components/ui/PageErrorState'
import { Skeleton } from '@/components/ui/Skeleton'
import { ExamReviewAnalyticsModal } from '@/components/exam/ExamReviewAnalyticsModal'
import { aiTutorService } from '@/services/aiTutor.service'
import { learningContextService } from '@/services/learningContext.service'
import { practiceService } from '@/services/practice.service'
import { roundPoints } from '@/services/scoringEngine'
import type { AiErrorAnalysisResult } from '@/types/aiTutor'
import type { PracticeResult, ScoredQuestionResult } from '@/types/practice'
import './PracticeResultPage.css'

export const PracticeResultPage: React.FC = () => {
  const { resultId } = useParams<{ resultId: string }>()
  const navigate = useNavigate()
  const { state: authState, user } = useAuth()

  const [result, setResult] = useState<PracticeResult | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Track expanded question explanation drawers
  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({})

  // AI Error Analysis state
  const [aiAnalysis, setAiAnalysis] = useState<AiErrorAnalysisResult | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState<boolean>(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [showAnalysis, setShowAnalysis] = useState<boolean>(false)
  const [showExamReviewModal, setShowExamReviewModal] = useState<boolean>(false)

  const handleRunAiAnalysis = async () => {
    if (!result) return
    setShowAnalysis(true)
    if (aiAnalysis) return // Already loaded

    setAnalysisLoading(true)
    setAnalysisError(null)

    try {
      const res = await aiTutorService.analyzeSessionErrors(result.sessionId, result.subjectId)
      setAiAnalysis(res)
    } catch (err: any) {
      setAnalysisError(err?.message || 'Không thể thực hiện phân tích lỗi sai AI vào lúc này.')
    } finally {
      setAnalysisLoading(false)
    }
  }

  useEffect(() => {
    // Refresh cookies hydrate the access token asynchronously after a hard reload.
    // Never read a protected result under the temporary guest identity.
    if (authState === 'initializing') return

    let isMounted = true
    const fetchData = async () => {
      setResult(null)
      if (authState !== 'authenticated' && isRemoteApiConfigured()) {
        if (isMounted) {
          setError('Vui lòng đăng nhập để xem kết quả bài làm.')
          setLoading(false)
        }
        return
      }
      if (!resultId) {
        if (isMounted) {
          setError('Thiếu mã kết quả bài làm.')
          setLoading(false)
        }
        return
      }

      setLoading(true)
      setError(null)

      try {
        const res = await practiceService.getResultById(resultId)
        if (!res) {
          if (isMounted) {
            setError(`Không tìm thấy kết quả với mã "${resultId}".`)
          }
          return
        }
        if (isMounted) {
          setResult(res)
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Lỗi khi tải kết quả bài làm.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchData()
    return () => {
      isMounted = false
    }
  }, [resultId, authState, user?.id])

  const toggleExplanation = (qId: string) => {
    setExpandedQuestions((prev) => ({
      ...prev,
      [qId]: !prev[qId],
    }))
  }

  // Ask AI about a specific scored question
  const handleAskAIAboutQuestion = (qRes: ScoredQuestionResult) => {
    learningContextService.setContext({
      source: 'assessment-question',
      title: `Giải đáp kết quả câu ${qRes.questionId}`,
      subjectId: result?.subjectId || 'math',
      subjectName: 'Toán học 12',
      lessonId: result?.lessonId,
      lessonTitle: 'Toán 12 — Khảo sát hàm số',
      sectionId: qRes.questionId,
      sectionTitle: `Câu hỏi ${qRes.questionId} (${qRes.questionType})`,
      excerpt: `Câu hỏi: ${qRes.stem}\nĐáp án học sinh: ${
        qRes.studentAnswer ? JSON.stringify(qRes.studentAnswer) : 'Chưa làm'
      }\nĐáp án đúng: ${qRes.correctAnswerDisplay}\nLời giải: ${qRes.explanation}`,
      returnUrl: `/practice/result/${result?.id}`,
    })
    navigate('/ai-tutor')
  }

  if (loading) {
    return (
      <div className="practice-result-root">
        <Skeleton variant="text" width={240} height={20} />
        <div style={{ marginTop: 20 }}>
          <Skeleton variant="rect" width="100%" height={200} />
        </div>
      </div>
    )
  }

  if (error || !result) {
    return (
      <div className="practice-result-root">
        <Breadcrumb
          items={[
            { label: 'Học tập', to: '/dashboard' },
            { label: 'Luyện tập', to: '/exercises' },
            { label: 'Kết quả bài làm' },
          ]}
        />
        <PageErrorState description={error || 'Kết quả không khả dụng.'} onRetry={() => window.location.reload()} />
      </div>
    )
  }

  const durationMin = Math.floor(result.durationSeconds / 60)
  const durationSec = result.durationSeconds % 60

  return (
    <div className="practice-result-root">
      {/* Top Breadcrumb */}
      <div className="result-top-nav">
        <Breadcrumb
          items={[
            { label: 'Học tập', to: '/dashboard' },
            { label: 'Luyện tập', to: '/exercises' },
            { label: 'Kết quả đánh giá năng lực' },
          ]}
        />
      </div>

      {/* Hero Score Banner */}
      <div className="result-hero-card" data-testid="practice-result-summary">
        <div className="hero-score-badge">
          <Award size={18} aria-hidden />
          <span>KẾT QUẢ ĐÃ CHẤM XÁC ĐỊNH</span>
        </div>

        <div className="hero-main-flex">
          <div className="hero-score-left">
            <h1 className="hero-title">Đánh giá kết quả luyện tập</h1>
            <p className="hero-subtitle">
              Chấm điểm theo thang chuẩn GDPT 2018 (áp dụng quy tắc trắc nghiệm Đúng/Sai 4 ý và trả lời ngắn).
            </p>
            <div className="hero-meta-strip">
              <span className="hero-meta-item">
                <Clock size={14} aria-hidden /> Thời gian: {durationMin} phút {durationSec} giây
              </span>
              <span className="hero-meta-item">
                <Target size={14} aria-hidden /> Tổng số: {result.totalQuestions} câu hỏi
              </span>
            </div>
          </div>

          <div className="hero-score-right">
            <div className="score-circle">
              <span className="score-number" data-testid="score-number">
                {result.earnedPoints} <small>/ {result.maxPoints}</small>
              </span>
              <span className="score-percent" data-testid="score-percent">{result.percentage}% điểm đạt</span>
            </div>
          </div>
        </div>

        {/* Breakdown Summary Stats */}
        <div className="score-stats-grid">
          <div className="stat-box stat-correct">
            <CheckCircle2 size={16} aria-hidden />
            <span className="stat-val">{result.correctCount}</span>
            <span className="stat-lbl">Đúng tuyệt đối</span>
          </div>

          <div className="stat-box stat-partial">
            <CheckCircle2 size={16} aria-hidden />
            <span className="stat-val">{result.partialCount}</span>
            <span className="stat-lbl">Đúng một phần</span>
          </div>

          <div className="stat-box stat-incorrect">
            <XCircle size={16} aria-hidden />
            <span className="stat-val">{result.incorrectCount}</span>
            <span className="stat-lbl">Sai</span>
          </div>

          <div className="stat-box stat-unanswered">
            <HelpCircle size={16} aria-hidden />
            <span className="stat-val">{result.unansweredCount}</span>
            <span className="stat-lbl">Chưa trả lời</span>
          </div>
        </div>
      </div>

      {/* Skill Breakdown Analysis Table */}
      {result.skillBreakdown && result.skillBreakdown.length > 0 && (
        <div className="skill-breakdown-card">
          <h2 className="section-heading">Phân tích kết quả theo kỹ năng năng lực</h2>
          <p className="section-subtext">
            Điểm số và tỷ lệ hoàn thành được tính toán dựa trên các câu hỏi thuộc từng kỹ năng trong bài luyện tập:
          </p>

          <div className="skill-table-wrap">
            <table className="skill-table">
              <thead>
                <tr>
                  <th>Mã kỹ năng & Tên kỹ năng</th>
                  <th>Số câu</th>
                  <th>Câu đúng</th>
                  <th>Điểm đạt</th>
                  <th>Tỷ lệ hoàn thành</th>
                </tr>
              </thead>
              <tbody>
                {result.skillBreakdown.map((sk) => (
                  <tr key={sk.skillId}>
                    <td>
                      <code className="skill-code-tag">{sk.skillId}</code>
                      <div className="skill-name-text">{sk.skillName}</div>
                    </td>
                    <td>{sk.totalQuestions}</td>
                    <td>{sk.fullyCorrectQuestions}</td>
                    <td>
                      <strong>{roundPoints(sk.earnedPoints)}</strong> / {roundPoints(sk.maxPoints)}
                    </td>
                    <td>
                      <div className="skill-progress-wrap">
                        <div className="skill-progress-bar">
                          <div
                            className="skill-progress-fill"
                            style={{ width: `${Math.min(100, sk.percentage)}%` }}
                          />
                        </div>
                        <span className="skill-percent-text">{sk.percentage}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AI Error Analysis Section */}
      <div className="ai-error-analysis-card">
        <div className="ai-analysis-header">
          <div className="ai-analysis-title-group">
            <Sparkles className="ai-sparkle-icon" size={22} />
            <div>
              <h2 className="ai-analysis-title">Phân tích Lỗi sai Thông minh (AI Error Analysis)</h2>
              <p className="ai-analysis-subtitle">
                Trợ lý AI phân tích các bước làm bài, chỉ ra nguyên nhân sai sót và đề xuất kế hoạch ôn tập.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Button
              variant="outline"
              icon={Award}
              onClick={() => setShowExamReviewModal(true)}
            >
              Phân tích đề thi chi tiết
            </Button>
            <Button
              variant={showAnalysis ? 'outline' : 'primary'}
              icon={showAnalysis ? ChevronUp : Sparkles}
              onClick={showAnalysis ? () => setShowAnalysis(false) : handleRunAiAnalysis}
              disabled={analysisLoading}
            >
              {analysisLoading ? 'Đang phân tích...' : showAnalysis ? 'Thu gọn phân tích' : 'Chẩn đoán bài làm với AI'}
            </Button>
          </div>
        </div>

        {showAnalysis && (
          <div className="ai-analysis-body">
            {analysisLoading && (
              <div className="ai-analysis-loading">
                <Loader2 className="spinner" size={24} />
                <span>AI đang đối chiếu kết quả làm bài với chuẩn kiến thức GDPT 2018...</span>
              </div>
            )}

            {analysisError && (
              <div className="ai-analysis-error">
                <AlertCircle size={18} />
                <span>{analysisError}</span>
                <Button size="sm" variant="outline" onClick={handleRunAiAnalysis}>Thử lại</Button>
              </div>
            )}

            {!analysisLoading && !analysisError && aiAnalysis && (
              <div className="ai-analysis-content">
                {/* Overall Assessment */}
                <div className="ai-overall-box">
                  <h3 className="ai-subheading">Đánh giá tổng quan từ AI Tutor:</h3>
                  <p className="ai-overall-text">{aiAnalysis.overallAssessment}</p>
                </div>

                {/* Key Concepts to Review */}
                {aiAnalysis.keyConceptsToReview.length > 0 && (
                  <div className="ai-concepts-box">
                    <h3 className="ai-subheading">Chuyên đề trọng tâm cần củng cố:</h3>
                    <div className="ai-concept-tags">
                      {aiAnalysis.keyConceptsToReview.map((concept, idx) => (
                        <span key={idx} className="ai-concept-tag">{concept}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Question Errors List */}
                {aiAnalysis.analyzedErrors.length > 0 ? (
                  <div className="ai-errors-list">
                    <h3 className="ai-subheading">Chi tiết nguyên nhân sai theo từng câu ({aiAnalysis.analyzedErrors.length} câu):</h3>
                    {aiAnalysis.analyzedErrors.map((errItem) => (
                      <div key={errItem.questionId} className="ai-error-item-card">
                        <div className="ai-error-item-header">
                          <span className="ai-error-qid">Câu {errItem.questionId}</span>
                          <span className={`ai-error-badge badge-${errItem.errorClassification}`}>
                            {errItem.errorClassification === 'verified'
                              ? 'Lỗi kiến thức đã xác nhận'
                              : errItem.errorClassification === 'hypothesized'
                                ? 'Nguyên nhân giả định'
                                : 'Lỗi có thể suy luận'}
                          </span>
                          <span className="ai-error-concept">Chủ đề: {errItem.prerequisiteConcept}</span>
                        </div>

                        <div className="ai-error-stem">
                          <MathView math={errItem.stem} />
                        </div>

                        <div className="ai-error-cause-box">
                          <strong>Nguyên nhân có khả năng cao:</strong> {errItem.likelyCause}
                        </div>

                        <div className="ai-error-correct-method">
                          <strong>Phương pháp giải đúng:</strong>
                          <div className="method-math">
                            <MathView math={errItem.correctMethod} />
                          </div>
                        </div>

                        {errItem.recommendedLessonId && (
                          <div className="ai-error-lesson-link">
                            <Button
                              size="sm"
                              variant="outline"
                              icon={BookOpen}
                              onClick={() => navigate(`/subjects/${result.subjectId || 'sub_math12'}/lessons/${errItem.recommendedLessonId}`)}
                            >
                              Ôn lại bài giảng: {errItem.recommendedLessonTitle || 'Xem bài học'}
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="ai-no-errors-box">
                    <CheckCircle2 className="ai-perfect-icon" size={24} />
                    <span>Chúc mừng! Bạn đã trả lời đúng tất cả các câu hỏi trong bài làm này. Không phát hiện lỗi sai kiến thức.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="question-reviews-container">
        <h2 className="section-heading">Chi tiết từng câu hỏi & Hướng dẫn giải KaTeX</h2>

        {result.questionResults.map((qRes, idx) => {
          const isExpanded = !!expandedQuestions[qRes.questionId]

          return (
            <div key={qRes.questionId} className="result-question-card">
              <div className="result-q-header">
                <div className="result-q-meta">
                  <span className="result-q-number">Câu {idx + 1}</span>
                  <span
                    className={`result-q-status-pill ${
                      qRes.isFullyCorrect
                        ? 'pill-correct'
                        : qRes.isPartiallyCorrect
                          ? 'pill-partial'
                          : qRes.isUnanswered
                            ? 'pill-unanswered'
                            : 'pill-incorrect'
                    }`}
                  >
                    {qRes.isFullyCorrect
                      ? `Đúng (${qRes.earnedPoints}đ)`
                      : qRes.isPartiallyCorrect
                        ? `Đúng một phần (${qRes.earnedPoints}đ)`
                        : qRes.isUnanswered
                          ? 'Chưa làm (0đ)'
                          : 'Sai (0đ)'}
                  </span>
                </div>

                <div className="result-q-actions">
                  <button
                    type="button"
                    className="result-ai-btn"
                    onClick={() => handleAskAIAboutQuestion(qRes)}
                    title="Hỏi AI Tutor giải thích câu này"
                  >
                    <Sparkles size={14} aria-hidden />
                    <span>Hỏi AI giải thích</span>
                  </button>

                  <button
                    type="button"
                    className="result-exp-toggle"
                    onClick={() => toggleExplanation(qRes.questionId)}
                  >
                    <span>{isExpanded ? 'Ẩn lời giải' : 'Xem lời giải'}</span>
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
              </div>

              {/* Question Stem */}
              <div className="result-q-stem">
                <MathView math={qRes.stem} />
              </div>

              {/* Student Answer vs Correct Answer Summary */}
              <div className="result-answers-comparison">
                {/* For MCQ */}
                {qRes.questionType === 'multiple_choice' && (
                  <div className="comparison-row">
                    <span className="comparison-lbl">Lựa chọn của bạn:</span>
                    <strong
                      className={`comparison-val ${
                        qRes.isFullyCorrect ? 'text-correct' : 'text-incorrect'
                      }`}
                    >
                      {qRes.studentAnswer && (qRes.studentAnswer as any).selectedOption
                        ? (qRes.studentAnswer as any).selectedOption
                        : '(Chưa chọn)'}
                    </strong>
                    <span className="comparison-divider">|</span>
                    <span className="comparison-lbl">Đáp án chuẩn:</span>
                    <strong className="comparison-val text-correct">{qRes.correctAnswerDisplay}</strong>
                  </div>
                )}

                {/* For True/False Group */}
                {qRes.questionType === 'true_false_group' && qRes.subItemDetails && (
                  <div className="tfg-comparison-table-wrap">
                    <table className="tfg-comparison-table">
                      <thead>
                        <tr>
                          <th>Ý</th>
                          <th>Mệnh đề</th>
                          <th>Bạn chọn</th>
                          <th>Đáp án</th>
                          <th>Kết quả</th>
                        </tr>
                      </thead>
                      <tbody>
                        {qRes.subItemDetails.map((sub) => (
                          <tr key={sub.id}>
                            <td>
                              <strong>{sub.id}</strong>
                            </td>
                            <td>
                              <MathView math={sub.statement} inline />
                            </td>
                            <td>
                              {sub.studentChoice === true
                                ? 'Đúng'
                                : sub.studentChoice === false
                                  ? 'Sai'
                                  : '(Trống)'}
                            </td>
                            <td>
                              <strong>{sub.correctChoice ? 'Đúng' : 'Sai'}</strong>
                            </td>
                            <td>
                              <span
                                className={`tfg-sub-badge ${
                                  sub.isCorrect ? 'badge-correct' : 'badge-incorrect'
                                }`}
                              >
                                {sub.isCorrect ? 'Đúng' : 'Sai'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* For Short Answer */}
                {qRes.questionType === 'short_answer' && (
                  <div className="comparison-row">
                    <span className="comparison-lbl">Câu trả lời của bạn:</span>
                    <strong
                      className={`comparison-val ${
                        qRes.isFullyCorrect ? 'text-correct' : 'text-incorrect'
                      }`}
                    >
                      {qRes.studentAnswer && (qRes.studentAnswer as any).rawInput
                        ? (qRes.studentAnswer as any).rawInput
                        : '(Để trống)'}
                    </strong>
                    <span className="comparison-divider">|</span>
                    <span className="comparison-lbl">Đáp án chuẩn:</span>
                    <strong className="comparison-val text-correct">
                      <MathView math={qRes.correctAnswerDisplay} inline />
                    </strong>
                  </div>
                )}
              </div>

              {/* Step-by-Step KaTeX Explanation Drawer */}
              {isExpanded && (
                <div className="result-explanation-drawer">
                  <div className="exp-drawer-header">
                    <CheckCircle2 size={16} aria-hidden />
                    <span>Hướng dẫn giải chi tiết (Từng bước):</span>
                  </div>
                  <div className="exp-drawer-content">
                    <MathView math={qRes.explanation} />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Bottom Action Footer */}
      <div className="result-footer-actions">
        <Button
          variant="outline"
          icon={RotateCcw}
          onClick={() => navigate('/exercises')}
        >
          Làm bài luyện tập mới
        </Button>
      </div>
      {result && (
        <ExamReviewAnalyticsModal
          sessionId={result.sessionId}
          isOpen={showExamReviewModal}
          onClose={() => setShowExamReviewModal(false)}
        />
      )}
    </div>
  )
}

export default PracticeResultPage
