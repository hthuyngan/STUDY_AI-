import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Bot,
  BookMarked,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  Flame,
  HelpCircle,
  Pause,
  Play,
  RotateCw,
  Sparkles,
} from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { Progress } from '@/components/ui/Progress'
import { useSmartReview } from '@/hooks/useSmartReview'
import { useStudyNotes } from '@/hooks/useStudyNotes'
import type { ReviewRating } from '@/types/smartReview'
import { learningContextService } from '@/services/learningContext.service'
import './SmartReviewPage.css'

export function SmartReviewPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const targetGapId = searchParams.get('gapId')

  const {
    items,
    dueItems,
    summary,
    activeSession,
    startSession,
    rateItem,
    completeSession,
    exitSession,
  } = useSmartReview()

  const [isRevealed, setIsRevealed] = useState(false)
  const { notes } = useStudyNotes()

  // Auto-start session if gapId is supplied in query param
  useEffect(() => {
    if (targetGapId && !activeSession) {
      startSession(targetGapId)
    }
  }, [targetGapId, activeSession, startSession])

  const handleStartReview = () => {
    setIsRevealed(false)
    startSession()
  }



  const handleRate = (rating: ReviewRating) => {
    if (!activeSession) return
    const currentItem = activeSession.items[activeSession.currentIndex]
    if (!currentItem) return

    rateItem(currentItem.reviewItemId, rating)
    setIsRevealed(false)

    // Check if session just finished
    if (activeSession.currentIndex >= activeSession.items.length - 1) {
      completeSession()
    }
  }

  const handleOpenLesson = (
    subjectId: string,
    lessonId: string,
    sectionId?: string
  ) => {
    const hash = sectionId ? `#${sectionId}` : ''
    navigate(`/subjects/${subjectId}/lessons/${lessonId}${hash}`)
  }

  // Active Session Current Item
  const currentSessionItem = useMemo(() => {
    if (!activeSession || activeSession.status === 'completed') return null
    return activeSession.items[activeSession.currentIndex] || null
  }, [activeSession])

  const handleAskAIHint = () => {
    if (!currentSessionItem) return
    learningContextService.setContext({
      source: 'smart-review',
      knowledgeGapId: currentSessionItem.gapId || currentSessionItem.reviewItemId,
      subjectId: currentSessionItem.subjectId,
      lessonId: currentSessionItem.lessonId,
      sectionId: currentSessionItem.sectionId,
      title: currentSessionItem.title,
      excerpt: currentSessionItem.prompt,
      returnUrl: '/review',
    })
    navigate('/ai-tutor')
  }

  // Related note for current session item if any
  const relatedNote = useMemo(() => {
    if (!currentSessionItem) return null
    return notes.find((n) => n.lessonId === currentSessionItem.lessonId) || null
  }, [currentSessionItem, notes])

  // --- RENDER 1: SESSION COMPLETED VIEW ---
  if (activeSession && activeSession.status === 'completed') {
    return (
      <div className="smart-review-root">
        <Breadcrumb
          items={[
            { label: 'Học tập', to: '/dashboard' },
            { label: 'Ôn tập thông minh' },
          ]}
        />

        <div className="review-completed-card">
          <div className="completed-celebration-badge" aria-hidden>
            <Sparkles size={36} />
          </div>
          <h2 className="completed-heading">Xuất sắc! Bạn đã hoàn thành phiên ôn tập!</h2>
          <p className="completed-subtext">
            Đã củng cố thành công <strong>{activeSession.items.length} mục kiến thức</strong>. Hệ thống đã tự động tính toán và dời lịch ôn tiếp theo theo chu trình Spaced Repetition.
          </p>

          <div className="completed-stats-row">
            <div className="completed-stat-item">
              <span className="stat-val">{activeSession.items.length}</span>
              <span className="stat-lbl">Kiến thức đã ôn</span>
            </div>
            <div className="completed-stat-item">
              <span className="stat-val">+50 XP</span>
              <span className="stat-lbl">Thưởng củng cố</span>
            </div>
            <div className="completed-stat-item">
              <span className="stat-val">100%</span>
              <span className="stat-lbl">Hoàn thành phiên</span>
            </div>
          </div>

          <div className="completed-actions-row">
            <Button variant="primary" icon={ArrowRight} onClick={() => exitSession()}>
              Về trang ôn tập
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                exitSession()
                navigate('/knowledge-gaps')
              }}
            >
              Xem sổ tay kiến thức yếu
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                exitSession()
                navigate('/dashboard')
              }}
            >
              Về bảng điều khiển
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // --- RENDER 2: ACTIVE SESSION FLASHCARD INTERACTION ---
  if (activeSession && currentSessionItem) {
    const progressPercent = Math.round(
      ((activeSession.currentIndex + 1) / activeSession.items.length) * 100
    )

    return (
      <div className="smart-review-root">
        {/* Top Session Bar */}
        <div className="session-top-bar">
          <div className="session-counter-tag">
            <span>Mục {activeSession.currentIndex + 1} / {activeSession.items.length}</span>
          </div>

          <div className="session-progress-wrapper">
            <Progress value={progressPercent} height={6} />
          </div>

          <Button
            size="sm"
            variant="ghost"
            icon={Pause}
            onClick={() => exitSession()}
            aria-label="Tạm dừng phiên ôn tập"
          >
            Tạm dừng
          </Button>
        </div>

        {/* Main Review Card */}
        <div className="review-flashcard">
          <div className="flashcard-header">
            <div className="flashcard-badges">
              <span className="subject-chip">{currentSessionItem.subjectName}</span>
              <span className="lesson-chip">{currentSessionItem.lessonTitle}</span>
              {currentSessionItem.sectionTitle && (
                <span className="section-chip">
                  <BookOpen size={12} aria-hidden /> {currentSessionItem.sectionTitle}
                </span>
              )}
            </div>
          </div>

          <div className="flashcard-body">
            <h2 className="flashcard-title">{currentSessionItem.title}</h2>

            <div className="flashcard-prompt-box">
              <span className="box-badge">Câu hỏi / Yêu cầu nhớ lại:</span>
              <p className="box-content">{currentSessionItem.prompt}</p>
            </div>

            {/* Answer & Explanation Reveal */}
            {!isRevealed ? (
              <div className="reveal-trigger-area">
                <Button
                  variant="primary"
                  size="lg"
                  icon={HelpCircle}
                  onClick={() => setIsRevealed(true)}
                  className="reveal-btn"
                >
                  Xem giải thích & Đáp án
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  icon={Bot}
                  onClick={handleAskAIHint}
                  className="reveal-btn hint-btn"
                >
                  Cho mình gợi ý
                </Button>
              </div>
            ) : (
              <div className="flashcard-answer-revealed">
                <div className="explanation-bubble">
                  <span className="box-badge">Phương pháp giải & Điểm mấu chốt:</span>
                  <p className="box-content">{currentSessionItem.explanation}</p>
                </div>

                {/* Related Study Note if exists */}
                {relatedNote && (
                  <div className="related-note-bubble">
                    <span className="box-badge">
                      <BookMarked size={12} aria-hidden /> Ghi chú bạn đã lưu trong bài này:
                    </span>
                    <p className="box-content">{relatedNote.content}</p>
                  </div>
                )}

                {/* Rating Bar */}
                <div className="rating-prompt-row">
                  <h4 className="rating-heading">Bạn nhớ kiến thức này thế nào?</h4>
                  <p className="rating-sub">Chọn mức độ nhớ để hệ thống tối ưu hóa chu kỳ ôn tập tiếp theo:</p>

                  <div className="rating-buttons-grid">
                    <button
                      type="button"
                      className="rating-btn red"
                      onClick={() => handleRate('unremembered')}
                    >
                      <span className="rating-emoji">🔴</span>
                      <span className="rating-name">Chưa nhớ</span>
                      <span className="rating-hint">Ôn lại ngày mai</span>
                    </button>

                    <button
                      type="button"
                      className="rating-btn yellow"
                      onClick={() => handleRate('partially-remembered')}
                    >
                      <span className="rating-emoji">🟡</span>
                      <span className="rating-name">Nhớ một phần</span>
                      <span className="rating-hint">Ôn lại sau 3 ngày</span>
                    </button>

                    <button
                      type="button"
                      className="rating-btn green"
                      onClick={() => handleRate('well-remembered')}
                    >
                      <span className="rating-emoji">🟢</span>
                      <span className="rating-name">Nhớ rất tốt</span>
                      <span className="rating-hint">Tăng giãn cách ôn</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Flashcard Footer */}
          <div className="flashcard-footer">
            <Button
              variant="outline"
              size="sm"
              icon={ExternalLink}
              onClick={() =>
                handleOpenLesson(
                  currentSessionItem.subjectId,
                  currentSessionItem.lessonId,
                  currentSessionItem.sectionId
                )
              }
            >
              Mở lại bài giảng
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // --- RENDER 3: REVIEW HOME VIEW ---
  return (
    <div className="smart-review-root">
      {/* 1. Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Học tập', to: '/dashboard' },
          { label: 'Ôn tập thông minh' },
        ]}
      />

      {/* 2. Hero Header Banner */}
      <header className="review-home-header">
        <div className="review-header-info">
          <div className="review-header-tag">
            <Flame size={14} aria-hidden /> SPACED REPETITION ENGINE
          </div>
          <h1 className="review-page-title">Ôn tập thông minh ngắt quãng</h1>
          <p className="review-page-desc">
            Ôn đúng lúc ngay khi não bộ chuẩn bị quên. Phương pháp lặp lại ngắt quãng (1 → 3 → 7 → 14 → 30 ngày) giúp biến kiến thức yếu thành trí nhớ dài hạn.
          </p>
        </div>

        {/* 3 Metric cards */}
        <div className="review-stats-row">
          <div className="review-stat-card due-today">
            <span className="stat-num">{summary.dueTodayCount}</span>
            <span className="stat-label">Cần ôn hôm nay</span>
          </div>
          <div className="review-stat-card overdue">
            <span className="stat-num">{summary.overdueCount}</span>
            <span className="stat-label">Quá hạn</span>
          </div>
          <div className="review-stat-card upcoming">
            <span className="stat-num">{summary.upcomingCount}</span>
            <span className="stat-label">Sắp tới</span>
          </div>
        </div>
      </header>

      {/* 3. Main Action Section */}
      <main className="review-home-content">
        {dueItems.length > 0 ? (
          <div className="due-items-section">
            <div className="due-section-header">
              <div>
                <h2 className="section-title">Danh sách cần ôn ({dueItems.length} mục)</h2>
                <p className="section-desc">
                  Các điểm kiến thức đã đến hạn hoặc quá hạn ôn tập theo chu kỳ ghi nhớ của bạn.
                </p>
              </div>

              <Button
                variant="primary"
                size="lg"
                icon={Play}
                onClick={handleStartReview}
                className="start-session-main-btn"
              >
                Bắt đầu ôn tập ({dueItems.length})
              </Button>
            </div>

            <div className="review-items-list">
              {dueItems.map((item) => (
                <div key={item.id} className="review-item-row">
                  <div className="item-info">
                    <div className="item-meta">
                      <span className="item-subject">{item.subjectName}</span>
                      <span className="item-lesson">{item.lessonTitle}</span>
                      {item.status === 'overdue' && (
                        <span className="item-badge overdue">Quá hạn</span>
                      )}
                      {item.status === 'due' && (
                        <span className="item-badge due">Hôm nay</span>
                      )}
                    </div>
                    <h3 className="item-title">{item.title}</h3>
                    <div className="item-sub-meta">
                      <span>Chu kỳ hiện tại: {item.intervalDays} ngày</span>
                      <span>·</span>
                      <span>Đã ôn: {item.reviewCount} lần</span>
                    </div>
                  </div>

                  <div className="item-action">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={ExternalLink}
                      onClick={() =>
                        handleOpenLesson(item.subjectId, item.lessonId, item.sectionId)
                      }
                    >
                      Bài giảng
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Empty or Up-to-date State */
          <div className="review-up-to-date-box">
            <CheckCircle2 size={44} className="up-to-date-icon" aria-hidden />
            <h3 className="up-to-date-title">Hôm nay không có kiến thức nào cần ôn gấp!</h3>
            <p className="up-to-date-desc">
              Bạn đã hoàn thành toàn bộ lịch ôn tập hôm nay hoặc chưa có kiến thức nào đến hạn.
            </p>

            <div className="up-to-date-actions">
              <Button
                variant="primary"
                icon={Sparkles}
                onClick={() => navigate('/knowledge-gaps')}
              >
                Xem sổ tay kiến thức yếu ({items.length})
              </Button>

              {items.length > 0 && (
                <Button
                  variant="outline"
                  icon={RotateCw}
                  onClick={handleStartReview}
                >
                  Ôn tập trước lịch ({items.length} mục)
                </Button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default SmartReviewPage
