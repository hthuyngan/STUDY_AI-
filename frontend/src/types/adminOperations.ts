export interface ComponentHealth {
  name: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  latencyMs: number
  details?: string
  lastChecked: string
}

export interface ApiMetrics {
  totalRequests24h: number
  errorRequests24h: number
  errorRatePercent: number | null
  p95LatencyMs: number | null
  activeSessions: number
}

export interface DatabaseHealth {
  canConnect: boolean
  pingLatencyMs: number
  totalUsers: number
  totalLessons: number
  totalQuestions: number
  totalAssessmentAttempts: number
  totalAiLogs: number
  totalLearningEvents: number
}

export interface SystemHealthReport {
  overallStatus: 'healthy' | 'degraded' | 'unhealthy'
  checkedAt: string
  uptimeSeconds: number
  components: ComponentHealth[]
  apiMetrics: ApiMetrics
  databaseHealth: DatabaseHealth
}

export interface AiQualityAuditItem {
  testCaseId: string
  category: string
  prompt: string
  expectedCharacteristics: string
  actualSnippet: string
  passed: boolean
  latencyMs: number
  noExamLeak: boolean
  socraticMethod: boolean
  validKaTeX: boolean
  math12Accuracy: boolean
  notes: string
}

export interface AiQualityBenchmarkReport {
  benchmarkId: string
  executedAt: string
  evaluationMode?: string
  overallPassRate: number
  totalCases: number
  passedCases: number
  failedCases: number
  averageLatencyMs: number
  categoriesTested: string[]
  items: AiQualityAuditItem[]
}

export interface FeatureUsageSummary {
  feature: string
  requestCount: number
  tokens: number
  costUsd: number
  averageLatencyMs: number
  sharePercentage: number
}

export interface AiCostOptimization {
  period: string
  totalTokens: number
  promptTokens: number
  completionTokens: number
  estimatedCostUsd: number
  averageLatencyMs: number | null
  totalAiRequests: number
  successRate: number | null
  usageByFeature: FeatureUsageSummary[]
  optimizationRecommendations: string[]
}

export interface ContentIssueItem {
  severity: 'critical' | 'warning' | 'info'
  category: string
  contentId: string
  contentTitle: string
  description: string
  recommendation: string
}

export interface ContentQualityAuditReport {
  auditedAt: string
  totalLessonsScanned: number
  totalQuestionsScanned: number
  totalVideosScanned: number
  issuesFound: number
  healthScore: number
  issues: ContentIssueItem[]
}

export interface ConsistencyAnomalyItem {
  anomalyType: string
  severity: 'high' | 'medium' | 'low'
  entityId: string
  studentId: string
  description: string
  autoRepairable: boolean
}

export interface DataConsistencyReport {
  auditedAt: string
  totalStudentsScanned: number
  totalMasteryRecordsScanned: number
  totalAttemptsScanned: number
  anomaliesFound: number
  integrityScore: number
  anomalies: ConsistencyAnomalyItem[]
}

export interface StaffAuditLogItem {
  id: string
  actorUserId: string
  action: string
  targetType: string
  targetId: string
  payload?: string
  createdAt: string
}

export interface StaffAuditLogList {
  totalCount: number
  logs: StaffAuditLogItem[]
}

export interface DataConsistencyRepairRequest {
  dryRun: boolean
  anomalyEntityIds?: string[]
}

export interface RepairImpactItem {
  entityType: string
  entityId: string
  anomalyType: string
  fieldModified: string
  oldValue: string
  newValue: string
  explanation: string
}

export interface DataConsistencyRepairReport {
  operationId: string
  wasDryRun: boolean
  status: string
  executedAt: string
  anomaliesScanned: number
  anomaliesAddressed: number
  impactReport: RepairImpactItem[]
  auditLogId?: string
}

