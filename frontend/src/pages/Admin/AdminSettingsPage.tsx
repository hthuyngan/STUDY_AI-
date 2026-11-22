import React, { useEffect, useState, useContext } from 'react'
import {
  Save,
  RotateCcw,
  CheckCircle2,
  Trash2,
  Sliders,
  Shield,
  BookOpen,
  Bell,
  Database,
  Cpu,
  Loader2,
} from 'lucide-react'
import { aiTutorService } from '@/services/aiTutor.service'
import type { AiFeatureConfig, AiUsageStats } from '@/types/aiTutor'
import { operationsService } from '@/services/operations.service'
import { AuthContext } from '@/auth/AuthContext'
import type { OperationalSettings } from '@/types/operations'
import './AdminPages.css'
import '@/components/admin/AdminComponents.css'

declare const process: { env?: { NODE_ENV?: string } } | undefined

export const AdminSettingsPage: React.FC = () => {
  const auth = useContext(AuthContext)
  const user = auth?.user
  const [settings, setSettings] = useState<OperationalSettings>(operationsService.getSettings())
  const [settingsLoading, setSettingsLoading] = useState<boolean>(true)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const computeStorageUsage = () => {
    if (typeof window === 'undefined' || !window.localStorage) return '0 KB'
    let totalBytes = 0
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('study_ai_')) {
        totalBytes += (key.length + (localStorage.getItem(key)?.length || 0)) * 2
      }
    }
    const kb = (totalBytes / 1024).toFixed(1)
    return `${kb} KB`
  }

  const [storageUsage, setStorageUsage] = useState<string>(() => computeStorageUsage())

  // AI Operations state
  const [aiConfig, setAiConfig] = useState<AiFeatureConfig | null>(null)
  const [aiStats, setAiStats] = useState<AiUsageStats | null>(null)
  const [aiLoading, setAiLoading] = useState<boolean>(true)

  useEffect(() => {
    let isMounted = true
    operationsService
      .getSettingsAsync()
      .then((loaded) => {
        if (isMounted) {
          setSettings(loaded)
          setSettingsLoading(false)
        }
      })
      .catch((err) => {
        if (isMounted) {
          showToast(`Lỗi tải cấu hình: ${err instanceof Error ? err.message : String(err)}`)
          setSettingsLoading(false)
        }
      })
    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    const loadAiData = async () => {
      try {
        const [cfg, stats] = await Promise.all([
          aiTutorService.getAdminAiStatus().catch(() => null),
          aiTutorService.getAdminAiStats().catch(() => null),
        ])
        if (isMounted) {
          if (cfg) setAiConfig(cfg)
          if (stats) setAiStats(stats)
        }
      } finally {
        if (isMounted) setAiLoading(false)
      }
    }
    loadAiData()
    return () => {
      isMounted = false
    }
  }, [])

  const handleToggleAiFeature = async (feature: string, current: boolean) => {
    try {
      const res = await aiTutorService.toggleAdminAiFeature(feature, !current)
      setAiConfig(res.config)
      showToast(res.message)
    } catch {
      showToast(`Không thể cập nhật tính năng AI '${feature}'.`)
    }
  }

  const currentActor = user?.displayName || 'Quản trị viên'

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const saved = await operationsService.saveSettings(settings, currentActor)
      setSettings(saved)
      showToast('Đã lưu thành công các thiết lập vận hành')
      setStorageUsage(computeStorageUsage())
    } catch (err: any) {
      if (err?.status === 409 || err?.message?.includes('409') || err?.message?.includes('phiên quản trị khác')) {
        showToast('Xung đột: Cấu hình đã được quản trị viên khác cập nhật. Đang tải lại cấu hình mới nhất...')
        const refreshed = await operationsService.getSettingsAsync()
        setSettings(refreshed)
      } else {
        showToast(err instanceof Error ? err.message : 'Lỗi khi lưu thiết lập.')
      }
    }
  }

  const handleResetSettings = async () => {
    if (window.confirm('Khôi phục toàn bộ thiết lập về giá trị mặc định ban đầu?')) {
      try {
        const defaults = await operationsService.resetSettings(currentActor)
        setSettings(defaults)
        showToast('Đã khôi phục thiết lập mặc định trên máy chủ')
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Không thể khôi phục thiết lập.')
      }
    }
  }

  const handleClearCache = () => {
    if (window.confirm('Xác nhận xóa bộ nhớ đệm phía client?')) {
      if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
        operationsService._resetMockState()
      }
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem('study_ai_settings')
      }
      showToast('Đã làm sạch bộ nhớ đệm phía client')
      setStorageUsage(computeStorageUsage())
    }
  }

  return (
    <div className="admin-page-container">
      {/* Toast */}
      {toastMessage && (
        <div className="admin-toast-notification">
          <CheckCircle2 size={18} color="#047857" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="staff-page-header">
        <div className="admin-prototype-badge">
          <span className="prototype-dot"></span>
          <span>ADMIN WORKSPACE • CẤU HÌNH</span>
        </div>
        <div className="admin-header-row">
          <div>
            <h1 className="staff-page-title">Thiết lập vận hành (Operational Settings)</h1>
            <p className="staff-page-desc">
              Tùy biến các quy tắc học tập, ngưỡng cảnh báo và quy trình kiểm duyệt nội dung.
              {settingsLoading && <span style={{ marginLeft: 8, color: '#0284c7' }}>(Đang đồng bộ từ máy chủ...)</span>}
            </p>
          </div>
          <div className="admin-header-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleResetSettings}
            >
              <RotateCcw size={16} />
              <span>Khôi phục mặc định</span>
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 840 }}>
        {/* A. THÔNG TIN CHUNG */}
        <div className="admin-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 22 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#102a43', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sliders size={18} />
            <span>A. Thông tin hệ thống</span>
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label className="form-label" htmlFor="set-sysname">Tên hiển thị hệ thống</label>
              <input
                id="set-sysname"
                type="text"
                className="form-input"
                value={settings.systemName}
                onChange={(e) => setSettings({ ...settings, systemName: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="form-label" htmlFor="set-lang">Ngôn ngữ giao diện</label>
              <select
                id="set-lang"
                className="form-input"
                value={settings.language}
                onChange={(e) => setSettings({ ...settings, language: e.target.value })}
              >
                <option value="vi-VN">Tiếng Việt (vi-VN)</option>
                <option value="en-US">English (en-US)</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <label className="form-label" htmlFor="set-desc">Mô tả hệ sinh thái</label>
            <input
              id="set-desc"
              type="text"
              className="form-input"
              value={settings.systemDescription}
              onChange={(e) => setSettings({ ...settings, systemDescription: e.target.value })}
            />
          </div>
        </div>

        {/* B. QUY TẮC HỌC TẬP & CẢNH BÁO */}
        <div className="admin-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 22 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#102a43', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOpen size={18} />
            <span>B. Quy tắc học tập & Ngưỡng cảnh báo</span>
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            <div>
              <label className="form-label" htmlFor="set-pass-score">Điểm tối thiểu đạt chuẩn</label>
              <input
                id="set-pass-score"
                type="number"
                step="0.5"
                min="0"
                max="10"
                className="form-input"
                value={settings.passingScoreThreshold}
                onChange={(e) => setSettings({ ...settings, passingScoreThreshold: Number(e.target.value) })}
              />
              <span style={{ fontSize: '0.75rem', color: '#627d98', marginTop: 4, display: 'block' }}>Mặc định: 5.0</span>
            </div>

            <div>
              <label className="form-label" htmlFor="set-low-score">Ngưỡng cảnh báo điểm thấp</label>
              <input
                id="set-low-score"
                type="number"
                step="0.5"
                min="0"
                max="10"
                className="form-input"
                value={settings.lowScoreAlertThreshold}
                onChange={(e) => setSettings({ ...settings, lowScoreAlertThreshold: Number(e.target.value) })}
              />
              <span style={{ fontSize: '0.75rem', color: '#627d98', marginTop: 4, display: 'block' }}>Kích hoạt cảnh báo khi dưới mức này</span>
            </div>

            <div>
              <label className="form-label" htmlFor="set-attn-prog">Ngưỡng tiến độ cần chú ý (%)</label>
              <input
                id="set-attn-prog"
                type="number"
                min="0"
                max="100"
                className="form-input"
                value={settings.attentionProgressThreshold}
                onChange={(e) => setSettings({ ...settings, attentionProgressThreshold: Number(e.target.value) })}
              />
              <span style={{ fontSize: '0.75rem', color: '#627d98', marginTop: 4, display: 'block' }}>Lớp có tiến độ &lt; % này sẽ cần chú ý</span>
            </div>
          </div>
        </div>

        {/* C. QUY TẮC KIỂM DUYỆT NỘI DUNG */}
        <div className="admin-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 22 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#102a43', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={18} />
            <span>C. Quy tắc kiểm duyệt nội dung</span>
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={settings.requireApprovalBeforePublish}
                onChange={(e) => setSettings({ ...settings, requireApprovalBeforePublish: e.target.checked })}
              />
              <span style={{ fontSize: '0.9rem', color: '#102a43' }}>
                Bắt buộc quản trị viên hoặc ban chuyên môn phê duyệt trước khi bài học được phát hành
              </span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={settings.allowRevisionRequests}
                onChange={(e) => setSettings({ ...settings, allowRevisionRequests: e.target.checked })}
              />
              <span style={{ fontSize: '0.9rem', color: '#102a43' }}>
                Cho phép người kiểm duyệt gửi yêu cầu chỉnh sửa kèm nhận xét chi tiết cho tác giả
              </span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={settings.showArchivedContent}
                onChange={(e) => setSettings({ ...settings, showArchivedContent: e.target.checked })}
              />
              <span style={{ fontSize: '0.9rem', color: '#102a43' }}>
                Hiển thị các nội dung và phiên bản bài học đã lưu trữ trong danh sách tìm kiếm
              </span>
            </label>
          </div>
        </div>

        {/* D. QUY TẮC THÔNG BÁO */}
        <div className="admin-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 22 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#102a43', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell size={18} />
            <span>D. Quy tắc thông báo</span>
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label className="form-label" htmlFor="set-notify-days">Thời gian hiển thị thông báo mặc định (ngày)</label>
              <input
                id="set-notify-days"
                type="number"
                min="1"
                max="90"
                className="form-input"
                value={settings.notificationDisplayDays}
                onChange={(e) => setSettings({ ...settings, notificationDisplayDays: Number(e.target.value) })}
              />
            </div>

          </div>
        </div>

        {/* E. BỘ NHỚ TRÌNH DUYỆT */}
        <div className="admin-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 22 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#102a43', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Database size={18} />
            <span>E. Quản trị bộ nhớ tạm trình duyệt (Client Cache)</span>
          </h2>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderRadius: 6, marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 600, color: '#102a43', fontSize: '0.9rem' }}>Dung lượng bộ nhớ tạm client:</div>
              <div style={{ fontSize: '0.8rem', color: '#627d98' }}>Lưu trữ cấu hình giao diện và bộ nhớ tạm trình duyệt</div>
            </div>
            <strong style={{ fontSize: '1.1rem', color: '#0284c7' }}>{storageUsage}</strong>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={handleClearCache}
              aria-label="Làm sạch bộ nhớ tạm trình duyệt"
            >
              <Trash2 size={14} style={{ marginRight: 6 }} />
              <span>Làm sạch bộ nhớ tạm trình duyệt</span>
            </button>
          </div>
        </div>

        {/* F. QUẢN TRỊ TRÍ TUỆ NHÂN TẠO (AI OPERATIONS) */}
        <div className="admin-card" style={{ background: '#fff', border: '1px solid #c3dafe', borderRadius: 8, padding: 22 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e3a8a', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Cpu size={18} color="#2563eb" />
            <span>F. Quản trị & Giám sát Trí tuệ Nhân tạo (AI Operations)</span>
          </h2>

          {aiLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 16, color: '#64748b' }}>
              <Loader2 className="spinner" size={18} />
              <span>Đang tải thông số và tình trạng hệ thống AI...</span>
            </div>
          ) : (
            <div>
              {/* Provider Info Banner */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#eff6ff', borderRadius: 6, marginBottom: 16 }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#1e3a8a', fontSize: '0.9rem' }}>
                    Nhà cung cấp LLM: <strong>{aiConfig?.providerName || 'OpenAI'}</strong> ({aiConfig?.modelName || 'gpt-4o-mini'})
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    {aiConfig?.isConfigured ? '✓ Đã kết nối khóa API an toàn từ máy chủ' : 'Chế độ mô phỏng sư phạm (Fake Pedagogical Mock)'}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: 4,
                    background: aiConfig?.isConfigured ? '#dcfce7' : '#fef3c7',
                    color: aiConfig?.isConfigured ? '#15803d' : '#92400e',
                  }}
                >
                  {aiConfig?.isConfigured ? 'LIVE AI READY' : 'MOCK ENGINE'}
                </span>
              </div>

              {/* Feature Toggles */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334e68', marginBottom: 10 }}>
                  Công tắc kích hoạt tính năng AI:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={aiConfig?.enableTutor ?? true}
                      onChange={() => handleToggleAiFeature('tutor', aiConfig?.enableTutor ?? true)}
                    />
                    <span>1. AI Tutor Socratic Chat (Trợ lý bài học)</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={aiConfig?.enableHints ?? true}
                      onChange={() => handleToggleAiFeature('hints', aiConfig?.enableHints ?? true)}
                    />
                    <span>2. AI 3-Level Hints (Bậc thang gợi ý làm bài)</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={aiConfig?.enableErrorAnalysis ?? true}
                      onChange={() => handleToggleAiFeature('error_analysis', aiConfig?.enableErrorAnalysis ?? true)}
                    />
                    <span>3. AI Error Analysis (Phân tích lỗi sai)</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={aiConfig?.enableLearningPath ?? true}
                      onChange={() => handleToggleAiFeature('learning_path', aiConfig?.enableLearningPath ?? true)}
                    />
                    <span>4. AI Learning Path (Đề xuất lộ trình)</span>
                  </label>
                </div>
              </div>

              {/* Budget Warning Banner */}
              {aiStats?.budgetWarning && (
                <div style={{ marginBottom: 14, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, color: '#991b1b', fontSize: '0.85rem' }}>
                  ⚠️ Cảnh báo ngân sách: Chi phí AI hôm nay đã đạt hoặc vượt 80% hạn mức ngày ($5.00 USD). Hệ thống đang kiểm soát token chặt chẽ.
                </div>
              )}

              {/* Usage Stats Strip */}
              {aiStats && (
                <div style={{ padding: '14px', background: '#f8fafc', borderRadius: 6 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Tổng số lượt gọi:</div>
                      <strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>{aiStats.totalRequests ?? 0}</strong>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Tổng Token:</div>
                      <strong style={{ fontSize: '1.1rem', color: '#2563eb' }}>{((aiStats.totalInputTokens ?? 0) + (aiStats.totalOutputTokens ?? 0)).toLocaleString()}</strong>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Chi phí ước tính:</div>
                      <strong style={{ fontSize: '1.1rem', color: '#16a34a' }}>${(aiStats.estimatedTotalCostUsd ?? 0).toFixed(4)}</strong>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Độ trễ trung bình:</div>
                      <strong style={{ fontSize: '1.1rem', color: '#7c3aed' }}>{aiStats.averageLatencyMs ?? 0} ms</strong>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 12, paddingTop: 10, borderTop: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#64748b' }}>
                    <div>Số lượt Fallback: <strong style={{ color: '#0f172a' }}>{aiStats.fallbackCount ?? 0}</strong></div>
                    <div>Lỗi Rate Limit (429): <strong style={{ color: (aiStats.rateLimitCount ?? 0) > 0 ? '#dc2626' : '#0f172a' }}>{aiStats.rateLimitCount ?? 0}</strong></div>
                    <div>Lỗi Timeout: <strong style={{ color: (aiStats.timeoutCount ?? 0) > 0 ? '#dc2626' : '#0f172a' }}>{aiStats.timeoutCount ?? 0}</strong></div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Save button bar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ minWidth: 160 }}
          >
            <Save size={16} />
            <span>Lưu thay đổi cấu hình</span>
          </button>
        </div>
      </form>
    </div>
  )
}
