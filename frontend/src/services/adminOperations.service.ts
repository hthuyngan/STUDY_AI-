import { apiClient } from '@/lib/apiClient';
import type {
  SystemHealthReport,
  AiQualityBenchmarkReport,
  AiCostOptimization,
  ContentQualityAuditReport,
  DataConsistencyReport,
  StaffAuditLogList,
} from '@/types/adminOperations';

export const adminOperationsService = {
  async getSystemHealth(): Promise<SystemHealthReport> {
    return await apiClient.get<SystemHealthReport>('/api/v1/admin/operations/health');
  },

  async runBenchmarkSuite(): Promise<AiQualityBenchmarkReport> {
    return await apiClient.post<AiQualityBenchmarkReport>('/api/v1/admin/operations/benchmark/run');
  },

  async getLatestBenchmarkReport(): Promise<AiQualityBenchmarkReport> {
    return await apiClient.get<AiQualityBenchmarkReport>('/api/v1/admin/operations/benchmark/latest');
  },

  async getAiCostOptimization(days: number = 30): Promise<AiCostOptimization> {
    return await apiClient.get<AiCostOptimization>(`/api/v1/admin/operations/ai-cost?days=${days}`);
  },

  async getContentQualityAudit(): Promise<ContentQualityAuditReport> {
    return await apiClient.get<ContentQualityAuditReport>('/api/v1/admin/operations/content-quality');
  },

  async getDataConsistencyReport(): Promise<DataConsistencyReport> {
    return await apiClient.get<DataConsistencyReport>('/api/v1/admin/operations/data-consistency');
  },

  async repairDataConsistency(
    dryRun: boolean = true,
    anomalyEntityIds?: string[]
  ): Promise<import('@/types/adminOperations').DataConsistencyRepairReport> {
    return await apiClient.post<import('@/types/adminOperations').DataConsistencyRepairReport>(
      '/api/v1/admin/operations/data-consistency/repair',
      { dryRun, anomalyEntityIds }
    );
  },

  async getStaffAuditLogs(
    action?: string,
    targetType?: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<StaffAuditLogList> {
    const params = new URLSearchParams();
    if (action) params.append('action', action);
    if (targetType) params.append('targetType', targetType);
    params.append('page', page.toString());
    params.append('pageSize', pageSize.toString());

    return await apiClient.get<StaffAuditLogList>(
      `/api/v1/admin/operations/audit-logs?${params.toString()}`
    );
  },
};

