export interface ExamBlueprintSectionDto {
  sectionIndex: number;
  title: string;
  questionType: string;
  questionCount: number;
  subQuestionCount?: number;
  pointsPerQuestion: number;
  maxSectionScore: number;
  scoringRuleDescription: string;
  scoringFormula?: string;
  targetCognitiveDistribution: Record<string, number>;
}

export interface ExamBlueprintDto {
  blueprintId: string;
  title: string;
  subjectId: string;
  subjectName: string;
  version: string;
  applicableYear: number;
  regulationSource: string;
  verificationStatus: string;
  examType: string;
  durationMinutes: number;
  totalQuestions: number;
  totalSubQuestions?: number;
  scorableUnits?: number;
  maxScore: number;
  description: string;
  sections: ExamBlueprintSectionDto[];
  isOfficialStandard: boolean;
}

export interface ExamReadinessDto {
  userId: string;
  subjectId: string;
  assessedAt: string;
  readinessScorePercent: number;
  readinessTier: 'insufficient_data' | 'needs_reinforcement' | 'progressing' | 'exam_ready';
  curriculumCoveragePercent: number;
  examScoreStabilityPercent: number;
  predictedScoreMin: number;
  predictedScoreMax: number;
  criticalTopicsMastery: Record<string, number>;
  disclaimer: string;
  recommendedAction: string;
}

export interface RevisionPlanMilestoneDto {
  dayIndex: number;
  date: string;
  title: string;
  allocatedMinutes: number;
  focusTopic: string;
  objective: string;
  isCompleted: boolean;
}

export interface RevisionPlanAdjustmentLogDto {
  adjustedAt: string;
  reason: string;
  previousTargetScore: number;
  newTargetScore: number;
}

export interface RevisionPlanDto {
  planId: string;
  userId: string;
  subjectId: string;
  targetScore: number;
  dailyStudyMinutes: number;
  examDate: string;
  daysRemaining: number;
  status: string;
  createdAt: string;
  lastUpdatedAt: string;
  milestones: RevisionPlanMilestoneDto[];
  adjustmentHistory: RevisionPlanAdjustmentLogDto[];
}

export interface CreateRevisionPlanRequestDto {
  subjectId?: string;
  targetScore: number;
  dailyStudyMinutes: number;
  examDate: string;
}

export interface SpacedRepetitionItemDto {
  itemId: string;
  topicName: string;
  subjectId: string;
  repetitionNumber: number;
  easinessFactor: number;
  intervalDays: number;
  lastReviewedAt: string | null;
  nextReviewDate: string;
  queueStatus: 'due_today' | 'upcoming' | 'completed' | 'needs_reinforcement';
  masteryScore: number;
}

export interface SpacedRepetitionQueueDto {
  subjectId: string;
  dueToday: SpacedRepetitionItemDto[];
  upcoming: SpacedRepetitionItemDto[];
  completedToday: SpacedRepetitionItemDto[];
  needsReinforcement: SpacedRepetitionItemDto[];
  totalItems: number;
  retentionRateEstimatePercent: number;
}

export interface SpacedRepetitionReviewRequestDto {
  itemId: string;
  topicName: string;
  subjectId?: string;
  qualityScore: number; // 0 to 5
}

export interface SpacedRepetitionReviewResultDto {
  itemId: string;
  newEasinessFactor: number;
  newIntervalDays: number;
  nextReviewDate: string;
  message: string;
}

export interface QuestionQualityIssueDto {
  questionId: string;
  issueType: string;
  severity: 'error' | 'warning';
  description: string;
  detailSnippet?: string;
}

export interface QuestionQualityAuditReportDto {
  subjectId: string;
  auditedAt: string;
  totalQuestions: number;
  validCount: number;
  needsReviewCount: number;
  brokenLatexCount: number;
  duplicateCount: number;
  missingAnswerCount: number;
  qualityScorePercent: number;
  issues: QuestionQualityIssueDto[];
}

