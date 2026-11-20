import { apiClient } from '@/lib/apiClient';
import type {
  ExamBlueprintDto,
  ExamReadinessDto,
  RevisionPlanDto,
  CreateRevisionPlanRequestDto,
  SpacedRepetitionQueueDto,
  SpacedRepetitionReviewRequestDto,
  SpacedRepetitionReviewResultDto,
  QuestionQualityAuditReportDto,
} from '@/types/examPrep';

export const examPrepService = {
  async getBlueprints(subjectId = 'sub_math12'): Promise<ExamBlueprintDto[]> {
    return await apiClient.get<ExamBlueprintDto[]>(
      `/api/v1/ai/exam-prep/blueprints?subjectId=${encodeURIComponent(subjectId)}`
    );
  },

  async getBlueprintById(blueprintId: string): Promise<ExamBlueprintDto> {
    return await apiClient.get<ExamBlueprintDto>(
      `/api/v1/ai/exam-prep/blueprints/${encodeURIComponent(blueprintId)}`
    );
  },

  async getReadiness(subjectId = 'sub_math12'): Promise<ExamReadinessDto> {
    return await apiClient.get<ExamReadinessDto>(
      `/api/v1/ai/exam-prep/readiness?subjectId=${encodeURIComponent(subjectId)}`
    );
  },

  async getRevisionPlan(subjectId = 'sub_math12'): Promise<RevisionPlanDto> {
    return await apiClient.get<RevisionPlanDto>(
      `/api/v1/ai/exam-prep/revision-plan?subjectId=${encodeURIComponent(subjectId)}`
    );
  },

  async createOrUpdateRevisionPlan(request: CreateRevisionPlanRequestDto): Promise<RevisionPlanDto> {
    return await apiClient.post<RevisionPlanDto>('/api/v1/ai/exam-prep/revision-plan', request);
  },

  async getSpacedRepetitionQueue(subjectId = 'sub_math12'): Promise<SpacedRepetitionQueueDto> {
    return await apiClient.get<SpacedRepetitionQueueDto>(
      `/api/v1/ai/exam-prep/spaced-repetition?subjectId=${encodeURIComponent(subjectId)}`
    );
  },

  async recordSpacedRepetitionReview(request: SpacedRepetitionReviewRequestDto): Promise<SpacedRepetitionReviewResultDto> {
    return await apiClient.post<SpacedRepetitionReviewResultDto>(
      '/api/v1/ai/exam-prep/spaced-repetition/review',
      request
    );
  },

  async auditQuestionQuality(subjectId = 'sub_math12'): Promise<QuestionQualityAuditReportDto> {
    return await apiClient.get<QuestionQualityAuditReportDto>(
      `/api/v1/ai/exam-prep/question-quality?subjectId=${encodeURIComponent(subjectId)}`
    );
  },
};

