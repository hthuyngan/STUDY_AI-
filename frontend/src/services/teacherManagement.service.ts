import { apiClient } from '@/lib/apiClient';
import type {
  TeacherClassroomSummary,
  ClassroomAnalytics,
  TeachingRecommendation,
  CreateRemedialInterventionRequest,
  RemedialInterventionOutcome,
  AiContentQualityAuditRequest,
  AiContentQualityAuditResponse,
  LessonAuthoringOutlineRequest,
  LessonAuthoringOutlineResponse,
  GenerateCheckpointQuestionsRequest,
  CheckpointQuestionDraft,
  ContentWorkflowActionRequest,
  ContentWorkflowActionResult,
} from '@/types/teacherManagement';

export const teacherManagementService = {
  async getTeacherClassrooms(): Promise<TeacherClassroomSummary[]> {
    return await apiClient.get<TeacherClassroomSummary[]>('/api/v1/teacher/classrooms');
  },

  async getClassroomAnalytics(classroomId: string): Promise<ClassroomAnalytics> {
    return await apiClient.get<ClassroomAnalytics>(
      `/api/v1/teacher/classrooms/${encodeURIComponent(classroomId)}/analytics`
    );
  },

  async getCohortRecommendations(classroomId: string): Promise<TeachingRecommendation[]> {
    return await apiClient.get<TeachingRecommendation[]>(
      `/api/v1/teacher/classrooms/${encodeURIComponent(classroomId)}/recommendations`
    );
  },

  async assignRemedialIntervention(
    request: CreateRemedialInterventionRequest
  ): Promise<RemedialInterventionOutcome> {
    return await apiClient.post<RemedialInterventionOutcome>(
      '/api/v1/teacher/interventions',
      request
    );
  },

  async getClassroomInterventions(classroomId: string): Promise<RemedialInterventionOutcome[]> {
    return await apiClient.get<RemedialInterventionOutcome[]>(
      `/api/v1/teacher/classrooms/${encodeURIComponent(classroomId)}/interventions`
    );
  },

  async auditContentQualityWithAi(
    request: AiContentQualityAuditRequest
  ): Promise<AiContentQualityAuditResponse> {
    return await apiClient.post<AiContentQualityAuditResponse>(
      '/api/v1/content/governance/quality-audit',
      request
    );
  },

  async executeContentWorkflowAction(
    request: ContentWorkflowActionRequest
  ): Promise<ContentWorkflowActionResult> {
    return await apiClient.post<ContentWorkflowActionResult>(
      '/api/v1/content/governance/workflow',
      request
    );
  },

  async generateLessonOutlineDraft(
    request: LessonAuthoringOutlineRequest
  ): Promise<LessonAuthoringOutlineResponse> {
    return await apiClient.post<LessonAuthoringOutlineResponse>(
      '/api/v1/content/governance/lesson-authoring/outline',
      request
    );
  },

  async generateCheckpointQuestions(
    request: GenerateCheckpointQuestionsRequest
  ): Promise<CheckpointQuestionDraft[]> {
    return await apiClient.post<CheckpointQuestionDraft[]>(
      '/api/v1/content/governance/lesson-authoring/checkpoint-questions',
      request
    );
  },

  async flagQuestionForModeration(questionId: string, reason: string): Promise<{ success: boolean; message: string }> {
    return await apiClient.post<{ success: boolean; message: string }>(
      `/api/v1/content/governance/questions/${encodeURIComponent(questionId)}/flag`,
      { reason }
    );
  },
};

