export interface TeacherClassroomSummary {
  classroomId: string;
  name: string;
  code?: string;
  grade?: string;
  subject?: string;
  studentCount: number;
  activeAssignmentsCount: number;
  averageMasteryPercent: number;
  atRiskStudentCount: number;
  createdAt: string;
}

export interface AtRiskStudentItem {
  studentId: string;
  fullName: string;
  email: string;
  overallMasteryPercent: number;
  riskLevel: 'high' | 'medium' | 'low';
  primaryWeakTopic: string;
  consecutiveMistakesCount: number;
  interventionStatus: 'needs_action' | 'assigned' | 'in_progress' | 'resolved';
}

export interface DifficultTopicCohort {
  topicName: string;
  chapterTitle: string;
  cohortAccuracyPercent: number;
  affectedStudentsCount: number;
  totalAttemptsCount: number;
  cognitiveLevel: string;
}

export interface ClassroomAnalytics {
  classroomId: string;
  classroomName: string;
  subject: string;
  totalStudents: number;
  cohortAverageMasteryPercent: number;
  curriculumCompletionRatePercent: number;
  mockExamAverageScore: number;
  difficultTopics: DifficultTopicCohort[];
  atRiskStudents: AtRiskStudentItem[];
  masteryDistribution: Record<string, number>;
}

export interface TeachingRecommendation {
  recommendationId: string;
  classroomId: string;
  title: string;
  detectionNarrative: string;
  dataEvidence: string;
  priority: 'high' | 'medium' | 'standard';
  actionType: string;
  suggestedTopic: string;
  actionableDescription: string;
  isActioned: boolean;
}

export interface CreateRemedialInterventionRequest {
  classroomId: string;
  targetStudentIds: string[];
  title: string;
  targetTopic: string;
  instructions?: string;
  dueDate: string;
  questionCount?: number;
}

export interface RemedialInterventionOutcome {
  interventionId: string;
  classroomId: string;
  studentId: string;
  studentName: string;
  topicName: string;
  initialMasteryScore: number;
  currentMasteryScore: number;
  masteryDelta: number;
  status: 'assigned' | 'in_progress' | 'completed' | 'improved' | 'not_improved';
  assignedAt: string;
  completedAt?: string;
}

export interface ContentQualitySuggestionItem {
  category: 'spelling' | 'katex_syntax' | 'pedagogical_clarity' | 'duplicate' | 'difficulty';
  originalSnippet: string;
  proposedCorrection: string;
  reason: string;
}

export interface AiContentQualityAuditRequest {
  contentType: 'lesson' | 'question' | 'theory';
  title: string;
  bodyText: string;
  formulasOrOptionsJson?: string;
  subjectId?: string;
}

export interface AiContentQualityAuditResponse {
  contentType: string;
  hasIssues: boolean;
  issueCount: number;
  overallAssessment: string;
  suggestions: ContentQualitySuggestionItem[];
  proposedImprovedBody: string;
  suggestedCognitiveDifficulty: string;
  provider: string;
  requiresHumanApproval: boolean;
}

export interface LessonAuthoringOutlineRequest {
  subjectName: string;
  chapterTitle: string;
  lessonTitle: string;
  targetGrade?: string;
}

export interface LessonAuthoringOutlineResponse {
  lessonTitle: string;
  learningObjectives: string[];
  introductionDraft: string;
  keyDefinitions: string[];
  coreFormulasKaTeX: string[];
  workedExamples: string[];
  pedagogicalNotes: string;
}

export interface GenerateCheckpointQuestionsRequest {
  subjectId?: string;
  topicName: string;
  questionCount: number;
  targetDifficulty?: string;
}

export interface CheckpointQuestionDraft {
  prompt: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  cognitiveLevel: string;
}

export interface ContentWorkflowActionRequest {
  entityType: 'lesson' | 'question';
  entityId: string;
  action: 'submit_review' | 'approve' | 'reject' | 'publish' | 'archive';
  reasonOrNotes?: string;
}

export interface ContentWorkflowActionResult {
  entityType: string;
  entityId: string;
  previousStatus: string;
  newStatus: string;
  message: string;
  timestamp: string;
}

