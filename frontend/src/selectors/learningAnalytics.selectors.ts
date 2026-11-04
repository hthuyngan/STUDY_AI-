/**
 * Learning Analytics Selectors & Aggregators
 * Pure, testable functions transforming measured learner progress,
 * assessment attempts, knowledge gaps, and smart review items into analytics insights.
 */

import { mockSubjectsSummary } from '@/data/subjects.mock'
import type {
  LearningAttempt,
  LearningEvent,
  LessonProgressState,
} from '@/types/assessment'
import type { KnowledgeGap } from '@/types/knowledgeGaps'
import type { SmartReviewItem } from '@/types/smartReview'
import type {
  AssessmentTrendItem,
  CompetencyLevel,
  DailyActivityMetric,
  StudentAnalyticsSummary,
  SubjectAnalyticsItem,
  TimelineHistoryItem,
  TopicCompetencyItem,
} from '@/types/analytics'

// Helper to normalize subject ID (supports both 'math' and 'toan-hoc', etc.)
export function normalizeSubjectId(id: string): string {
  if (id === 'toan-hoc' || id === 'math') return 'math'
  if (id === 'vat-ly' || id === 'physics') return 'physics'
  if (id === 'hoa-hoc' || id === 'chemistry') return 'chemistry'
  if (id === 'tieng-anh' || id === 'english') return 'english'
  return id
}

export function getSubjectDisplayName(id: string): string {
  const norm = normalizeSubjectId(id)
  const found = mockSubjectsSummary.find((s) => s.id === norm || s.id === id)
  if (found) return found.name
  if (norm === 'math') return 'Toán học'
  if (norm === 'physics') return 'Vật lý'
  if (norm === 'chemistry') return 'Hóa học'
  if (norm === 'english') return 'Tiếng Anh'
  return id
}

/**
 * 1. Summary Metrics Aggregator
 */
export function selectAnalyticsSummary(
  progressMap: Record<string, LessonProgressState>,
  attempts: LearningAttempt[],
  gaps: KnowledgeGap[],
  reviewItems: SmartReviewItem[]
): StudentAnalyticsSummary {
  // Total available lessons across curriculum
  let totalLessonsAvailable = 0
  mockSubjectsSummary.forEach((s) => {
    totalLessonsAvailable += s.totalLessons || 0
  })
  if (totalLessonsAvailable === 0) totalLessonsAvailable = 118

  // Completed lessons: overallProgress >= 100 or assessmentStatus === 'completed'
  const progressEntries = Object.values(progressMap || {})
  const totalLessonsCompleted = progressEntries.filter(
    (p) => p.overallProgress >= 100 || p.assessmentStatus === 'completed'
  ).length

  const overallCompletionPercent =
    totalLessonsAvailable > 0
      ? Math.min(100, Math.round((totalLessonsCompleted / totalLessonsAvailable) * 100))
      : 0

  // Completed attempts only (no in-progress / paused / draft)
  const completedAttempts = (attempts || []).filter((a) => a.status === 'completed')
  const assessmentAttemptsCount = completedAttempts.length

  let averageAssessmentScore: number | null = null
  if (completedAttempts.length > 0) {
    const totalScore = completedAttempts.reduce((sum, att) => {
      // scoreScaled is 0..1, convert to 0..100%
      const pct =
        typeof att.scoreScaled === 'number'
          ? att.scoreScaled * 100
          : att.scoreMax > 0
            ? (att.scoreRaw / att.scoreMax) * 100
            : 0
      return sum + pct
    }, 0)
    averageAssessmentScore = Math.round(totalScore / completedAttempts.length)
  }

  // Active knowledge gaps vs mastered
  const activeKnowledgeGapsCount = (gaps || []).filter(
    (g) => g.status === 'needs-review' || g.status === 'reinforcing' || g.status === 'progressing'
  ).length
  const masteredGapsCount = (gaps || []).filter((g) => g.status === 'mastered').length

  // Total review sessions / reps completed
  const totalReviewSessionsCompleted = (reviewItems || []).reduce(
    (sum, item) => sum + (item.reviewCount || (item.history ? item.history.length : 0)),
    0
  )

  // Estimated study time in minutes
  // Computed from real assessment session time + measured section reading
  let totalMinutes = 0
  completedAttempts.forEach((att) => {
    if (att.sessionTimeMs && att.sessionTimeMs > 0) {
      totalMinutes += Math.round(att.sessionTimeMs / 60000)
    }
  })
  // Add 4 minutes per completed section (conservative reading pace)
  progressEntries.forEach((p) => {
    if (p.completedSectionIds && p.completedSectionIds.length > 0) {
      totalMinutes += p.completedSectionIds.length * 4
    }
  })
  // Plus 2 minutes per smart review rep
  totalMinutes += totalReviewSessionsCompleted * 2

  return {
    totalLessonsCompleted,
    totalLessonsAvailable,
    overallCompletionPercent,
    assessmentAttemptsCount,
    averageAssessmentScore,
    activeKnowledgeGapsCount,
    masteredGapsCount,
    totalReviewSessionsCompleted,
    estimatedStudyTimeMinutes: Math.max(0, totalMinutes),
  }
}

/**
 * 2. Daily Activity Aggregator (Last 7 Days)
 */
export function selectDailyActivities(
  events: LearningEvent[],
  attempts: LearningAttempt[],
  referenceDate: Date = new Date()
): DailyActivityMetric[] {
  const result: DailyActivityMetric[] = []
  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

  for (let i = 6; i >= 0; i--) {
    const d = new Date(referenceDate)
    d.setDate(d.getDate() - i)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    const dayLabel = dayNames[d.getDay()]

    // Count matching events
    const matchingEvents = (events || []).filter((e) => e.timestamp?.startsWith(dateStr))
    // Count matching attempts
    const matchingAttempts = (attempts || []).filter(
      (a) => (a.startedAt?.startsWith(dateStr) || a.lastActivityAt?.startsWith(dateStr))
    )

    let studyTimeMinutes = 0
    matchingAttempts.forEach((att) => {
      if (att.sessionTimeMs && att.sessionTimeMs > 0) {
        studyTimeMinutes += Math.round(att.sessionTimeMs / 60000)
      }
    })
    // 3 minutes per section completed event
    const sectionCompletedEvents = matchingEvents.filter(
      (e) => e.type === 'lesson_section_completed'
    )
    studyTimeMinutes += sectionCompletedEvents.length * 3

    const totalCount = matchingEvents.length + matchingAttempts.length

    result.push({
      date: dateStr,
      dayLabel,
      eventCount: totalCount,
      studyTimeMinutes,
      hasActivity: totalCount > 0,
    })
  }

  return result
}

/**
 * 3. Student Competency Profile Selector
 * Evaluates topics based on harvest assessment results, Spaced Repetition reviews,
 * and knowledge gaps. Never assigns mastery from raw scroll % alone.
 */
export function selectCompetencyProfile(
  gaps: KnowledgeGap[],
  attempts: LearningAttempt[],
  progressMap: Record<string, LessonProgressState>
): TopicCompetencyItem[] {
  const items: TopicCompetencyItem[] = []
  const processedKeys = new Set<string>()

  // 1. First populate topics from detected Knowledge Gaps (high fidelity weakness evidence)
  ;(gaps || []).forEach((gap) => {
    const key = `${gap.lessonId}_${gap.knowledgePointId}`
    processedKeys.add(key)

    let level: CompetencyLevel = 'needs-review'
    let evidence = `Sai ${gap.wrongAttemptsCount} lần trong bài tập thu hoạch.`

    if (gap.status === 'mastered') {
      level = 'mastered'
      evidence = `Đã củng cố qua ${gap.correctReviewCount} chu kỳ ôn tập ngắt quãng (Spaced Repetition).`
    } else if (gap.status === 'progressing' || gap.status === 'reinforcing') {
      level = 'reinforcing'
      evidence = `Đang trong chu trình ôn tập ngắt quãng (${gap.correctReviewCount} lần đạt).`
    } else {
      level = 'needs-review'
      evidence = `Cần ôn luyện: Chưa vượt qua bài kiểm tra (${gap.wrongAttemptsCount} lần sai).`
    }

    items.push({
      id: gap.id,
      subjectId: normalizeSubjectId(gap.subjectId),
      subjectName: gap.subjectName || getSubjectDisplayName(gap.subjectId),
      lessonId: gap.lessonId,
      lessonTitle: gap.lessonTitle,
      sectionId: gap.sectionId,
      sectionTitle: gap.sectionTitle,
      title: gap.title,
      level,
      evidence,
      wrongAttemptsCount: gap.wrongAttemptsCount,
      lastEvaluatedAt: gap.updatedAt || gap.lastDetectedAt || new Date().toISOString(),
    })
  })

  // 2. Populate topics from completed assessments with high scores (mastery evidence)
  const completedAttempts = (attempts || []).filter(
    (a) => a.status === 'completed' && a.successStatus === 'passed'
  )
  completedAttempts.forEach((att) => {
    const key = `${att.lessonId}_core`
    if (!processedKeys.has(key)) {
      processedKeys.add(key)
      const scorePct =
        typeof att.scoreScaled === 'number'
          ? Math.round(att.scoreScaled * 100)
          : att.scoreMax > 0
            ? Math.round((att.scoreRaw / att.scoreMax) * 100)
            : 80

      items.push({
        id: `comp_${att.lessonId}_core`,
        subjectId: normalizeSubjectId(att.subjectId),
        subjectName: getSubjectDisplayName(att.subjectId),
        lessonId: att.lessonId,
        lessonTitle: `Bài ${att.lessonId}`,
        title: `Kiến thức trọng tâm bài ${att.lessonId}`,
        level: scorePct >= 80 ? 'mastered' : 'reinforcing',
        evidence: `Hoàn thành bài thu hoạch đạt ${scorePct}% ở lần làm #${att.attemptNumber}.`,
        wrongAttemptsCount: 0,
        lastEvaluatedAt: att.lastActivityAt || att.startedAt || new Date().toISOString(),
      })
    }
  })

  // 3. Mark in-progress lessons without assessment as 'insufficient-data'
  Object.values(progressMap || {}).forEach((p) => {
    const key = `${p.lessonId}_core`
    if (!processedKeys.has(key)) {
      processedKeys.add(key)
      items.push({
        id: `comp_${p.lessonId}_pending`,
        subjectId: normalizeSubjectId(p.subjectId),
        subjectName: getSubjectDisplayName(p.subjectId),
        lessonId: p.lessonId,
        lessonTitle: `Bài ${p.lessonId}`,
        title: `Kiến thức bài ${p.lessonId}`,
        level: 'insufficient-data',
        evidence: 'Đang học nội dung lý thuyết, chưa thực hiện bài tập thu hoạch để đo lường.',
        wrongAttemptsCount: 0,
        lastEvaluatedAt: p.updatedAt || new Date().toISOString(),
      })
    }
  })

  return items.sort((a, b) => {
    // Priority order: needs-review -> reinforcing -> mastered -> insufficient-data
    const order: Record<CompetencyLevel, number> = {
      'needs-review': 0,
      reinforcing: 1,
      mastered: 2,
      'insufficient-data': 3,
    }
    return order[a.level] - order[b.level]
  })
}

/**
 * 4. Subject Analytics Selector
 */
export function selectSubjectAnalytics(
  progressMap: Record<string, LessonProgressState>,
  attempts: LearningAttempt[],
  gaps: KnowledgeGap[]
): SubjectAnalyticsItem[] {
  const subjects = ['math', 'physics', 'chemistry', 'english']

  return subjects.map((subjId) => {
    const subjName = getSubjectDisplayName(subjId)
    const summary = mockSubjectsSummary.find((s) => s.id === subjId)
    const totalLessons = summary?.totalLessons || 25

    // Progress for this subject
    const subjectProgresses = Object.values(progressMap || {}).filter(
      (p) => normalizeSubjectId(p.subjectId) === subjId
    )
    const completedLessons = subjectProgresses.filter(
      (p) => p.overallProgress >= 100 || p.assessmentStatus === 'completed'
    ).length

    const completionPercent =
      totalLessons > 0 ? Math.min(100, Math.round((completedLessons / totalLessons) * 100)) : 0

    // Attempts for this subject
    const subjectAttempts = (attempts || []).filter(
      (a) => normalizeSubjectId(a.subjectId) === subjId && a.status === 'completed'
    )
    let assessmentAverageScore: number | null = null
    if (subjectAttempts.length > 0) {
      const sum = subjectAttempts.reduce((acc, a) => {
        const pct =
          typeof a.scoreScaled === 'number'
            ? a.scoreScaled * 100
            : a.scoreMax > 0
              ? (a.scoreRaw / a.scoreMax) * 100
              : 0
        return acc + pct
      }, 0)
      assessmentAverageScore = Math.round(sum / subjectAttempts.length)
    }

    // Gaps for this subject
    const subjectGaps = (gaps || []).filter(
      (g) => normalizeSubjectId(g.subjectId) === subjId
    )
    const activeGapsCount = subjectGaps.filter((g) => g.status !== 'mastered').length
    const masteredCount = subjectGaps.filter((g) => g.status === 'mastered').length

    // Qualitative assessment & competency level
    let competencyLevel: CompetencyLevel = 'insufficient-data'
    let qualitativeAssessment = 'Chưa có đủ bài tập thu hoạch để đánh giá năng lực môn này.'
    let recommendedAction = 'Bắt đầu học các bài mở đầu và làm bài tập thu hoạch.'

    if (subjectAttempts.length > 0) {
      if (activeGapsCount > 0) {
        competencyLevel = 'needs-review'
        qualitativeAssessment = `Có ${activeGapsCount} điểm kiến thức cần củng cố lại.`
        recommendedAction = 'Mở Sổ tay kiến thức yếu và làm bài ôn tập ngắt quãng.'
      } else if (assessmentAverageScore !== null && assessmentAverageScore >= 80) {
        competencyLevel = 'mastered'
        qualitativeAssessment = 'Nắm vững kiến thức trọng tâm, kết quả thu hoạch đạt xuất sắc.'
        recommendedAction = 'Tiếp tục duy trì nhịp độ và học các chuyên đề nâng cao.'
      } else {
        competencyLevel = 'reinforcing'
        qualitativeAssessment = 'Đang tiến bộ ổn định, cần luyện tập thêm để thuần thục.'
        recommendedAction = 'Luyện thêm các bài tập ứng dụng trong chương hiện tại.'
      }
    } else if (completedLessons > 0) {
      competencyLevel = 'reinforcing'
      qualitativeAssessment = 'Đã hoàn thành lý thuyết, cần làm bài kiểm tra để xác nhận năng lực.'
      recommendedAction = 'Làm bài thu hoạch để hoàn thành 100% tiến độ bài học.'
    }

    return {
      subjectId: subjId,
      subjectName: subjName,
      completedLessons,
      totalLessons,
      completionPercent,
      assessmentAverageScore,
      attemptCount: subjectAttempts.length,
      activeGapsCount,
      masteredCount,
      competencyLevel,
      qualitativeAssessment,
      recommendedAction,
    }
  })
}

/**
 * 5. Assessment Trends Selector
 */
export function selectAssessmentTrends(attempts: LearningAttempt[]): AssessmentTrendItem[] {
  const completed = (attempts || []).filter((a) => a.status === 'completed')

  return completed
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime())
    .map((att) => {
      const scorePct =
        typeof att.scoreScaled === 'number'
          ? Math.round(att.scoreScaled * 100)
          : att.scoreMax > 0
            ? Math.round((att.scoreRaw / att.scoreMax) * 100)
            : 0

      return {
        attemptId: att.id,
        lessonId: att.lessonId,
        lessonTitle: `Bài ${att.lessonId}`,
        subjectId: normalizeSubjectId(att.subjectId),
        subjectName: getSubjectDisplayName(att.subjectId),
        scorePercent: scorePct,
        attemptNumber: att.attemptNumber,
        submittedAt: att.lastActivityAt || att.startedAt || new Date().toISOString(),
        isPassing: att.successStatus === 'passed' || scorePct >= 60,
      }
    })
}

/**
 * 6. Learning History Timeline Selector
 * Aggregates meaningful milestones without spamming low-level focus/scroll events.
 */
export function selectLearningHistory(
  events: LearningEvent[],
  attempts: LearningAttempt[],
  gaps: KnowledgeGap[],
  reviewItems: SmartReviewItem[]
): TimelineHistoryItem[] {
  const items: TimelineHistoryItem[] = []

  // Assessment Attempts
  ;(attempts || [])
    .filter((a) => a.status === 'completed')
    .forEach((att) => {
      const scorePct =
        typeof att.scoreScaled === 'number'
          ? Math.round(att.scoreScaled * 100)
          : att.scoreMax > 0
            ? Math.round((att.scoreRaw / att.scoreMax) * 100)
            : 0
      const isPass = att.successStatus === 'passed' || scorePct >= 60
      const ts = att.lastActivityAt || att.startedAt || new Date().toISOString()
      const d = new Date(ts)

      items.push({
        id: `hist_att_${att.id}`,
        timestamp: ts,
        dateFormatted: d.toLocaleDateString('vi-VN'),
        timeFormatted: d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        category: 'assessment',
        title: `Nộp bài thu hoạch: Bài ${att.lessonId}`,
        description: `Đạt ${scorePct}% (${isPass ? 'Đạt chuẩn' : 'Chưa đạt'}) · Lần làm #${att.attemptNumber}`,
        subjectId: normalizeSubjectId(att.subjectId),
        subjectName: getSubjectDisplayName(att.subjectId),
        badgeText: `${scorePct}%`,
        badgeVariant: isPass ? 'success' : 'warning',
      })
    })

  // Knowledge Gaps detected
  ;(gaps || []).forEach((gap) => {
    const ts = gap.lastDetectedAt || gap.createdAt || new Date().toISOString()
    const d = new Date(ts)

    items.push({
      id: `hist_gap_${gap.id}`,
      timestamp: ts,
      dateFormatted: d.toLocaleDateString('vi-VN'),
      timeFormatted: d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      category: 'knowledge_gap',
      title: `Phát hiện kiến thức cần củng cố: ${gap.title}`,
      description: `Môn ${gap.subjectName} · ${gap.lessonTitle}`,
      subjectId: normalizeSubjectId(gap.subjectId),
      subjectName: gap.subjectName,
      badgeText: 'Cần củng cố',
      badgeVariant: 'warning',
    })
  })

  // Smart Review completed items
  ;(reviewItems || []).forEach((rev) => {
    if (rev.history && rev.history.length > 0) {
      rev.history.forEach((h, idx) => {
        const d = new Date(h.reviewedAt)
        const ratingLabels: Record<string, string> = {
          'well-remembered': 'Nhớ rất tốt',
          'partially-remembered': 'Nhớ một phần',
          unremembered: 'Chưa nhớ',
        }

        items.push({
          id: `hist_rev_${rev.id}_${idx}`,
          timestamp: h.reviewedAt,
          dateFormatted: d.toLocaleDateString('vi-VN'),
          timeFormatted: d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          category: 'smart_review',
          title: `Ôn tập Spaced Repetition: ${rev.title}`,
          description: `Đánh giá: ${ratingLabels[h.rating] || h.rating} · Chu kỳ tiếp: ${h.nextIntervalDays} ngày`,
          subjectId: normalizeSubjectId(rev.subjectId),
          subjectName: rev.subjectName,
          badgeText: `+${h.nextIntervalDays}d`,
          badgeVariant: 'primary',
        })
      })
    }
  })

  // Meaningful events from event log (e.g. lesson_section_completed)
  ;(events || [])
    .filter((e) => e.type === 'lesson_section_completed')
    .slice(0, 30) // Limit to latest 30 section completions to prevent clutter
    .forEach((e) => {
      const d = new Date(e.timestamp)
      const secTitle = (e.payload?.sectionTitle as string) || (e.payload?.sectionId as string) || 'Mục bài giảng'

      items.push({
        id: `hist_evt_${e.id}`,
        timestamp: e.timestamp,
        dateFormatted: d.toLocaleDateString('vi-VN'),
        timeFormatted: d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        category: 'lesson_progress',
        title: `Đã hoàn thành nội dung lý thuyết`,
        description: `Mục "${secTitle}" trong bài ${e.lessonId}`,
        subjectId: normalizeSubjectId(e.subjectId),
        subjectName: getSubjectDisplayName(e.subjectId),
        badgeText: 'Đọc xong',
        badgeVariant: 'info',
      })
    })

  // Sort newest first
  return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

