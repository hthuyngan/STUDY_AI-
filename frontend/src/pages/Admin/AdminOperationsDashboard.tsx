import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  FileCheck,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  XCircle,
  Zap,
} from 'lucide-react';
import { adminOperationsService } from '@/services/adminOperations.service';
import type {
  SystemHealthReport,
  AiQualityBenchmarkReport,
  AiCostOptimization,
  ContentQualityAuditReport,
  DataConsistencyReport,
  StaffAuditLogList,
} from '@/types/adminOperations';
import { Button } from '@/components/ui/Button';
import './AdminPages.css';
import '@/components/admin/AdminComponents.css';

type TabKey = 'health' | 'cost' | 'content' | 'consistency' | 'benchmark' | 'logs';

export const AdminOperationsDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('health');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [runningBenchmark, setRunningBenchmark] = useState<boolean>(false);

  // States for each tab data
  const [healthData, setHealthData] = useState<SystemHealthReport | null>(null);
  const [costData, setCostData] = useState<AiCostOptimization | null>(null);
  const [contentData, setContentData] = useState<ContentQualityAuditReport | null>(null);
  const [consistencyData, setConsistencyData] = useState<DataConsistencyReport | null>(null);
  const [benchmarkData, setBenchmarkData] = useState<AiQualityBenchmarkReport | null>(null);
  const [auditLogsData, setAuditLogsData] = useState<StaffAuditLogList | null>(null);
  const [repairReport, setRepairReport] = useState<import('@/types/adminOperations').DataConsistencyRepairReport | null>(null);
  const [repairing, setRepairing] = useState<boolean>(false);

  // Filters
  const [contentSeverityFilter, setContentSeverityFilter] = useState<string>('all');
  const [costPeriodDays, setCostPeriodDays] = useState<number>(30);

  const loadTabData = async (tab: TabKey) => {
    try {
      if (tab === 'health') {
        const res = await adminOperationsService.getSystemHealth();
        setHealthData(res);
      } else if (tab === 'cost') {
        const res = await adminOperationsService.getAiCostOptimization(costPeriodDays);
        setCostData(res);
      } else if (tab === 'content') {
        const res = await adminOperationsService.getContentQualityAudit();
        setContentData(res);
      } else if (tab === 'consistency') {
        const res = await adminOperationsService.getDataConsistencyReport();
        setConsistencyData(res);
      } else if (tab === 'benchmark') {
        const res = await adminOperationsService.getLatestBenchmarkReport();
        setBenchmarkData(res);
      } else if (tab === 'logs') {
        const res = await adminOperationsService.getStaffAuditLogs(undefined, undefined, 1, 25);
        setAuditLogsData(res);
      }
    } catch (err) {
      console.error(`Error loading tab ${tab}:`, err);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadTabData(activeTab).finally(() => setLoading(false));
  }, [activeTab]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTabData(activeTab);
    setRefreshing(false);
  };

  const handleRunBenchmark = async () => {
    try {
      setRunningBenchmark(true);
      const res = await adminOperationsService.runBenchmarkSuite();
      setBenchmarkData(res);
    } catch (err) {
      console.error('Error running benchmark:', err);
    } finally {
      setRunningBenchmark(false);
    }
  };

  const handleRepair = async (dryRun: boolean) => {
    try {
      setRepairing(true);
      const res = await adminOperationsService.repairDataConsistency(dryRun);
      setRepairReport(res);
      if (!dryRun) {
        // Reload consistency data after real repair
        const updated = await adminOperationsService.getDataConsistencyReport();
        setConsistencyData(updated);
      }
    } catch (err) {
      console.error('Error repairing data consistency:', err);
    } finally {
      setRepairing(false);
    }
  };

  return (
    <div className="admin-page-container">
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Trung tâm Vận hành & Đảm bảo Chất lượng (AI & Ops QA)</h1>
          <p className="admin-page-subtitle">
            Giám sát thời gian thực sức khỏe hệ thống, chi phí Token AI, chất lượng học liệu và tính nhất quán dữ liệu học tập.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing || loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Làm mới dữ liệu
          </Button>
          {activeTab === 'benchmark' && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleRunBenchmark}
              disabled={runningBenchmark}
            >
              <Play className={`w-4 h-4 mr-2 ${runningBenchmark ? 'animate-spin' : ''}`} />
              {runningBenchmark ? 'Đang kiểm định...' : 'Chạy kiểm định AI Toán 12'}
            </Button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="admin-tabs-nav" style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', marginBottom: '24px', flexWrap: 'wrap' }}>
        {[
          { key: 'health', label: 'Sức khỏe hệ thống', icon: Activity },
          { key: 'cost', label: 'Chi phí & Token AI', icon: DollarSign },
          { key: 'content', label: 'Chất lượng học liệu', icon: FileCheck },
          { key: 'consistency', label: 'Nhất quán dữ liệu', icon: ShieldCheck },
          { key: 'benchmark', label: 'Kiểm định AI Toán 12', icon: Zap },
          { key: 'logs', label: 'Nhật ký kiểm toán', icon: Clock },
        ].map((t) => {
          const Icon = t.icon;
          const isSelected = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as TabKey)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                border: 'none',
                background: 'none',
                borderBottom: isSelected ? '2px solid #2563eb' : '2px solid transparent',
                color: isSelected ? '#2563eb' : '#64748b',
                fontWeight: isSelected ? 600 : 500,
                cursor: 'pointer',
              }}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-600" />
          <p>Đang tải dữ liệu phân tích vận hành...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: SYSTEM HEALTH */}
          {activeTab === 'health' && healthData && (
            <div className="space-y-6">
              {/* Overall Status Banner */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  borderRadius: '8px',
                  backgroundColor:
                    healthData.overallStatus === 'healthy'
                      ? '#ecfdf5'
                      : healthData.overallStatus === 'degraded'
                      ? '#fffbeb'
                      : '#fef2f2',
                  border: `1px solid ${
                    healthData.overallStatus === 'healthy'
                      ? '#10b981'
                      : healthData.overallStatus === 'degraded'
                      ? '#f59e0b'
                      : '#ef4444'
                  }`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {healthData.overallStatus === 'healthy' ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  ) : healthData.overallStatus === 'degraded' ? (
                    <AlertTriangle className="w-6 h-6 text-amber-600" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-600" />
                  )}
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
                      Trạng thái hệ thống: {healthData.overallStatus.toUpperCase()}
                    </h3>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#475569' }}>
                      Thời gian hoạt động liên tục (Uptime): {Math.floor(healthData.uptimeSeconds / 60)} phút • Kiểm tra lần cuối: {new Date(healthData.checkedAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <span
                  style={{
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    fontSize: '12px',
                    fontWeight: 600,
                    backgroundColor: healthData.overallStatus === 'healthy' ? '#059669' : '#d97706',
                    color: '#ffffff',
                  }}
                >
                  {healthData.overallStatus === 'healthy' ? 'Hoạt động ổn định' : 'Cần lưu ý'}
                </span>
              </div>

              {/* Components Health Grid */}
              <div className="admin-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                {healthData.components.map((c, idx) => (
                  <div key={idx} className="admin-card" style={{ padding: '16px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b' }}>{c.name}</span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: c.status === 'healthy' ? '#dcfce7' : '#fee2e2',
                          color: c.status === 'healthy' ? '#166534' : '#991b1b',
                        }}
                      >
                        {c.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>{c.details}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8' }}>
                      <span>Độ trễ: <strong>{c.latencyMs} ms</strong></span>
                      <span>{new Date(c.lastChecked).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Metrics Overview */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div className="admin-card" style={{ padding: '16px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Yêu cầu AI (24h)</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: '4px 0' }}>
                    {healthData.apiMetrics.totalRequests24h.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '12px', color: (healthData.apiMetrics.errorRatePercent ?? 0) > 5 ? '#dc2626' : '#16a34a' }}>
                    {healthData.apiMetrics.errorRatePercent !== null ? `Tỷ lệ lỗi: ${healthData.apiMetrics.errorRatePercent}%` : 'Chưa đủ dữ liệu (0 yêu cầu)'}
                  </div>
                </div>
                <div className="admin-card" style={{ padding: '16px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Độ trễ P95</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: '4px 0' }}>
                    {healthData.apiMetrics.p95LatencyMs !== null ? `${healthData.apiMetrics.p95LatencyMs} ms` : 'Chưa đủ dữ liệu'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Phản hồi 95% nhanh nhất</div>
                </div>
                <div className="admin-card" style={{ padding: '16px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Phiên đăng nhập hoạt động</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: '4px 0' }}>
                    {healthData.apiMetrics.activeSessions}
                  </div>
                  <div style={{ fontSize: '12px', color: '#16a34a' }}>Học sinh & nhân sự online</div>
                </div>
                <div className="admin-card" style={{ padding: '16px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Dữ liệu trong Database</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '4px 0' }}>
                    {healthData.databaseHealth.totalQuestions} câu hỏi • {healthData.databaseHealth.totalLessons} bài học
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    {healthData.databaseHealth.totalAssessmentAttempts} lượt làm bài
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AI COST & TOKEN */}
          {activeTab === 'cost' && costData && (
            <div className="space-y-6">
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <Button
                  variant={costPeriodDays === 7 ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setCostPeriodDays(7)}
                >
                  7 ngày gần nhất
                </Button>
                <Button
                  variant={costPeriodDays === 30 ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setCostPeriodDays(30)}
                >
                  30 ngày gần nhất
                </Button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <div className="admin-card" style={{ padding: '16px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Tổng Token tiêu thụ</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#2563eb', margin: '4px 0' }}>
                    {costData.totalTokens.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    Prompt: {costData.promptTokens.toLocaleString()} | Completion: {costData.completionTokens.toLocaleString()}
                  </div>
                </div>
                <div className="admin-card" style={{ padding: '16px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Ước tính chi phí (USD)</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#16a34a', margin: '4px 0' }}>
                    ${costData.estimatedCostUsd.toFixed(4)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#16a34a' }}>Tận dụng Free Tier Gemini 2.5</div>
                </div>
                <div className="admin-card" style={{ padding: '16px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Độ trễ trung bình</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: '4px 0' }}>
                    {costData.averageLatencyMs !== null ? `${costData.averageLatencyMs} ms` : 'Chưa đủ dữ liệu'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    {costData.successRate !== null ? `Tỷ lệ thành công: ${costData.successRate}%` : 'Chưa đủ dữ liệu (0 yêu cầu)'}
                  </div>
                </div>
              </div>

              {/* Feature Usage Breakdown */}
              <div className="admin-card" style={{ padding: '20px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Phân bổ Token theo Tính năng</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                        <th style={{ padding: '10px' }}>Tính năng (Feature)</th>
                        <th style={{ padding: '10px' }}>Lượt gọi (Requests)</th>
                        <th style={{ padding: '10px' }}>Tokens</th>
                        <th style={{ padding: '10px' }}>Chi phí ($)</th>
                        <th style={{ padding: '10px' }}>Độ trễ TB</th>
                        <th style={{ padding: '10px' }}>Tỷ trọng</th>
                      </tr>
                    </thead>
                    <tbody>
                      {costData.usageByFeature.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                            Chưa có dữ liệu gọi AI trong khoảng thời gian này.
                          </td>
                        </tr>
                      ) : (
                        costData.usageByFeature.map((f, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '10px', fontWeight: 600 }}>{f.feature}</td>
                            <td style={{ padding: '10px' }}>{f.requestCount.toLocaleString()}</td>
                            <td style={{ padding: '10px' }}>{f.tokens.toLocaleString()}</td>
                            <td style={{ padding: '10px' }}>${f.costUsd.toFixed(4)}</td>
                            <td style={{ padding: '10px' }}>{f.averageLatencyMs} ms</td>
                            <td style={{ padding: '10px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ flex: 1, height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px' }}>
                                  <div
                                    style={{
                                      width: `${Math.min(100, f.sharePercentage)}%`,
                                      height: '100%',
                                      backgroundColor: '#2563eb',
                                      borderRadius: '3px',
                                    }}
                                  />
                                </div>
                                <span>{f.sharePercentage}%</span>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Actionable Recommendations */}
              <div className="admin-card" style={{ padding: '20px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1e40af', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles className="w-5 h-5 text-blue-600" />
                  Khuyến nghị tối ưu hóa chi phí & hiệu năng AI
                </h3>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#1e3a8a', lineHeight: 1.8 }}>
                  {costData.optimizationRecommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* TAB 3: CONTENT QUALITY */}
          {activeTab === 'content' && contentData && (
            <div className="space-y-6">
              {/* Score Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Điểm Chất lượng Học liệu</h3>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
                    Đã quét {contentData.totalLessonsScanned} bài học, {contentData.totalQuestionsScanned} câu hỏi, {contentData.totalVideosScanned} video
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '28px', fontWeight: 800, color: contentData.healthScore >= 90 ? '#16a34a' : contentData.healthScore >= 75 ? '#d97706' : '#dc2626' }}>
                    {contentData.healthScore} / 100
                  </span>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{contentData.issuesFound} vấn đề phát hiện</div>
                </div>
              </div>

              {/* Filter */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Lọc mức độ:</span>
                {['all', 'critical', 'warning', 'info'].map((lvl) => (
                  <Button
                    key={lvl}
                    variant={contentSeverityFilter === lvl ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setContentSeverityFilter(lvl)}
                  >
                    {lvl.toUpperCase()}
                  </Button>
                ))}
              </div>

              {/* Issues List */}
              <div className="admin-card" style={{ padding: '0', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                      <th style={{ padding: '12px' }}>Mức độ</th>
                      <th style={{ padding: '12px' }}>Phân loại</th>
                      <th style={{ padding: '12px' }}>Nội dung</th>
                      <th style={{ padding: '12px' }}>Mô tả lỗi</th>
                      <th style={{ padding: '12px' }}>Khuyến nghị khắc phục</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contentData.issues
                      .filter((iss) => contentSeverityFilter === 'all' || iss.severity === contentSeverityFilter)
                      .map((iss, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px' }}>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '4px',
                                backgroundColor:
                                  iss.severity === 'critical' ? '#fee2e2' : iss.severity === 'warning' ? '#fef3c7' : '#e0f2fe',
                                color:
                                  iss.severity === 'critical' ? '#991b1b' : iss.severity === 'warning' ? '#92400e' : '#0369a1',
                              }}
                            >
                              {iss.severity.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ padding: '12px', color: '#475569', fontWeight: 500 }}>{iss.category}</td>
                          <td style={{ padding: '12px', fontWeight: 600 }}>{iss.contentTitle}</td>
                          <td style={{ padding: '12px', color: '#dc2626' }}>{iss.description}</td>
                          <td style={{ padding: '12px', color: '#16a34a' }}>{iss.recommendation}</td>
                        </tr>
                      ))}
                    {contentData.issues.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: '#16a34a' }}>
                          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                          Học liệu đạt chuẩn 100%! Không phát hiện lỗi cấu trúc, công thức KaTeX hay liên kết video.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: DATA CONSISTENCY */}
          {activeTab === 'consistency' && consistencyData && (
            <div className="space-y-6">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Chỉ số Toàn vẹn Dữ liệu Học tập</h3>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
                    Đã kiểm tra {consistencyData.totalStudentsScanned} học sinh, {consistencyData.totalMasteryRecordsScanned} hồ sơ năng lực, {consistencyData.totalAttemptsScanned} bài làm
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '28px', fontWeight: 800, color: consistencyData.integrityScore >= 95 ? '#16a34a' : '#d97706' }}>
                      {consistencyData.integrityScore}%
                    </span>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{consistencyData.anomaliesFound} bất thường phát hiện</div>
                  </div>
                  {consistencyData.anomaliesFound > 0 && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRepair(true)}
                        disabled={repairing}
                      >
                        {repairing ? 'Đang phân tích...' : 'Xem trước khắc phục (Dry-Run)'}
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleRepair(false)}
                        disabled={repairing}
                      >
                        {repairing ? 'Đang thực thi...' : 'Thực thi khắc phục an toàn'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Repair Impact Report Banner if executed */}
              {repairReport && (
                <div className="admin-card" style={{ padding: '16px', background: repairReport.wasDryRun ? '#eff6ff' : '#f0fdf4', borderRadius: '8px', border: `1px solid ${repairReport.wasDryRun ? '#93c5fd' : '#86efac'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '14px', color: repairReport.wasDryRun ? '#1e40af' : '#166534' }}>
                      {repairReport.wasDryRun ? 'KẾT QUẢ XEM TRƯỚC (DRY-RUN PREVIEW — CHƯA THAY ĐỔI DB)' : 'ĐÃ THỰC THI KHẮC PHỤC AN TOÀN (TRANSACTION COMMITTED)'}
                    </span>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Mã giao dịch: {repairReport.operationId}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#475569', marginBottom: '8px' }}>
                    Đã rà soát {repairReport.anomaliesScanned} bản ghi. {repairReport.impactReport.length} trường dữ liệu được chuẩn hóa.
                  </div>
                  {repairReport.impactReport.length > 0 && (
                    <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                      <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #cbd5e1', color: '#475569' }}>
                            <th style={{ padding: '6px' }}>Thực thể</th>
                            <th style={{ padding: '6px' }}>Trường sửa</th>
                            <th style={{ padding: '6px' }}>Giá trị cũ</th>
                            <th style={{ padding: '6px' }}>Giá trị mới</th>
                            <th style={{ padding: '6px' }}>Lý do</th>
                          </tr>
                        </thead>
                        <tbody>
                          {repairReport.impactReport.map((imp, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td style={{ padding: '6px', fontWeight: 600 }}>{imp.entityType} ({imp.entityId})</td>
                              <td style={{ padding: '6px' }}>{imp.fieldModified}</td>
                              <td style={{ padding: '6px', color: '#dc2626' }}>{imp.oldValue}</td>
                              <td style={{ padding: '6px', color: '#16a34a', fontWeight: 600 }}>{imp.newValue}</td>
                              <td style={{ padding: '6px', color: '#64748b' }}>{imp.explanation}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Anomalies List */}
              <div className="admin-card" style={{ padding: '0', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                      <th style={{ padding: '12px' }}>Mức độ</th>
                      <th style={{ padding: '12px' }}>Dạng bất thường</th>
                      <th style={{ padding: '12px' }}>Thực thể / Học sinh</th>
                      <th style={{ padding: '12px' }}>Mô tả chi tiết</th>
                      <th style={{ padding: '12px' }}>Tự động khắc phục</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consistencyData.anomalies.map((anom, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: anom.severity === 'high' ? '#fee2e2' : '#fef3c7',
                              color: anom.severity === 'high' ? '#991b1b' : '#92400e',
                            }}
                          >
                            {anom.severity.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '12px', fontWeight: 600 }}>{anom.anomalyType}</td>
                        <td style={{ padding: '12px', color: '#64748b' }}>{anom.studentId || anom.entityId}</td>
                        <td style={{ padding: '12px' }}>{anom.description}</td>
                        <td style={{ padding: '12px' }}>
                          {anom.autoRepairable ? (
                            <span style={{ color: '#16a34a', fontWeight: 600 }}>Khả dụng (Auto-repair)</span>
                          ) : (
                            <span style={{ color: '#64748b' }}>Cần can thiệp thủ công</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {consistencyData.anomalies.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: '#16a34a' }}>
                          <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                          Dữ liệu học tập và hồ sơ năng lực học sinh nhất quán 100%!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: AI BENCHMARK */}
          {activeTab === 'benchmark' && benchmarkData && (
            <div className="space-y-6">
              {/* Benchmark Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div className="admin-card" style={{ padding: '16px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Chế độ kiểm định</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: benchmarkData.evaluationMode === 'gemini_live' ? '#2563eb' : '#059669', margin: '4px 0' }}>
                    {benchmarkData.evaluationMode === 'gemini_live' ? '⚡ GEMINI LIVE API' : '🛡️ KIỂM ĐỊNH TỰ ĐỘNG'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    {benchmarkData.evaluationMode === 'gemini_live' ? 'Kết nối trực tiếp Gemini 2.5' : 'Bộ chuẩn hóa tự động GDPT 2018'}
                  </div>
                </div>
                <div className="admin-card" style={{ padding: '16px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Tỷ lệ đạt chuẩn (Pass Rate)</div>
                  <div style={{ fontSize: '26px', fontWeight: 800, color: '#16a34a', margin: '4px 0' }}>
                    {benchmarkData.overallPassRate}%
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    {benchmarkData.passedCases} / {benchmarkData.totalCases} ca kiểm thử đạt
                  </div>
                </div>
                <div className="admin-card" style={{ padding: '16px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Độ trễ trung bình</div>
                  <div style={{ fontSize: '26px', fontWeight: 800, color: '#2563eb', margin: '4px 0' }}>
                    {benchmarkData.averageLatencyMs} ms
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Mô hình Gemini 2.5 Flash</div>
                </div>
                <div className="admin-card" style={{ padding: '16px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Chuyên đề Toán 12 đã kiểm định</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: '6px 0', lineHeight: 1.4 }}>
                    {benchmarkData.categoriesTested.join(', ')}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Chương trình GDPT 2018</div>
                </div>
              </div>

              {/* Benchmark Test Cases Detail */}
              <div className="admin-card" style={{ padding: '0', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                      <th style={{ padding: '12px' }}>Mã & Chuyên đề</th>
                      <th style={{ padding: '12px' }}>Câu hỏi kiểm thử</th>
                      <th style={{ padding: '12px' }}>Tiêu chí kiểm định</th>
                      <th style={{ padding: '12px' }}>Trích đoạn phản hồi AI</th>
                      <th style={{ padding: '12px' }}>Độ trễ</th>
                      <th style={{ padding: '12px' }}>Kết quả</th>
                    </tr>
                  </thead>
                  <tbody>
                    {benchmarkData.items.map((item, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px' }}>
                          <div style={{ fontWeight: 700 }}>{item.testCaseId}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{item.category}</div>
                        </td>
                        <td style={{ padding: '12px', maxWidth: '240px' }}>{item.prompt}</td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11px' }}>
                            <span style={{ color: item.noExamLeak ? '#16a34a' : '#dc2626' }}>
                              • Không lộ đề thi: {item.noExamLeak ? '✓' : '✗'}
                            </span>
                            <span style={{ color: item.socraticMethod ? '#16a34a' : '#dc2626' }}>
                              • Socratic gợi mở: {item.socraticMethod ? '✓' : '✗'}
                            </span>
                            <span style={{ color: item.validKaTeX ? '#16a34a' : '#dc2626' }}>
                              • KaTeX chuẩn: {item.validKaTeX ? '✓' : '✗'}
                            </span>
                            <span style={{ color: item.math12Accuracy ? '#16a34a' : '#dc2626' }}>
                              • Độ chính xác Toán 12: {item.math12Accuracy ? '✓' : '✗'}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '12px', maxWidth: '300px', color: '#475569', fontSize: '12px' }}>
                          {item.actualSnippet}
                        </td>
                        <td style={{ padding: '12px' }}>{item.latencyMs} ms</td>
                        <td style={{ padding: '12px' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: item.passed ? '#dcfce7' : '#fee2e2',
                              color: item.passed ? '#166534' : '#991b1b',
                            }}
                          >
                            {item.passed ? 'PASSED' : 'FAILED'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: STAFF AUDIT LOGS */}
          {activeTab === 'logs' && auditLogsData && (
            <div className="space-y-6">
              <div className="admin-card" style={{ padding: '0', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                      <th style={{ padding: '12px' }}>Thời gian</th>
                      <th style={{ padding: '12px' }}>Người thực hiện</th>
                      <th style={{ padding: '12px' }}>Hành động</th>
                      <th style={{ padding: '12px' }}>Đối tượng</th>
                      <th style={{ padding: '12px' }}>Payload</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogsData.logs.map((log) => (
                      <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px', color: '#64748b' }}>
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td style={{ padding: '12px', fontWeight: 600 }}>{log.actorUserId}</td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: '#e0e7ff', color: '#3730a3', fontSize: '11px', fontWeight: 600 }}>
                            {log.action}
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          {log.targetType} #{log.targetId}
                        </td>
                        <td style={{ padding: '12px', color: '#64748b', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {log.payload || '—'}
                        </td>
                      </tr>
                    ))}
                    {auditLogsData.logs.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                          Chưa có nhật ký kiểm toán nhân sự nào.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
