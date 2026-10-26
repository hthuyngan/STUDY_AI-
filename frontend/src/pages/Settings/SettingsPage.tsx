import { useState } from 'react'
import { Check, Moon, RefreshCw, Sun } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Card } from '@/components/ui/Card'
import { PageErrorState } from '@/components/ui/PageErrorState'
import { Skeleton } from '@/components/ui/Skeleton'
import { getApiBaseUrl, isRemoteApiConfigured } from '@/config/learner'
import { useUserSettings } from '@/hooks/useSupporting'
import { syncQueue } from '@/repositories'
import './SettingsPage.css'

export function SettingsPage() {
  const { settings, isLoading, error, saveSettings, reload } = useUserSettings()
  const [isSavedBanner, setIsSavedBanner] = useState(false)

  if (isLoading) {
    return (
      <div className="settings-page-root">
        <Skeleton variant="text" width={200} height={28} />
        <Skeleton variant="rect" width="100%" height={320} />
      </div>
    )
  }

  if (error || !settings) {
    return (
      <div className="settings-page-root">
        <Breadcrumb items={[{ label: 'Cài đặt' }]} />
        <PageErrorState description={error || 'Không tải được cài đặt'} onRetry={reload} />
      </div>
    )
  }

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    saveSettings({ theme: newTheme })
    showSaved()
  }

  const handleStyleChange = (style: 'concise' | 'balanced' | 'detailed') => {
    saveSettings({ aiResponseStyle: style })
    showSaved()
  }

  const handleToggle = (key: 'studyReminder' | 'streakAlert' | 'courseAlert') => {
    saveSettings({ [key]: !settings[key] })
    showSaved()
  }

  const handleGoalChange = (minutes: number) => {
    saveSettings({ dailyGoalMinutes: minutes })
    showSaved()
  }

  const showSaved = () => {
    setIsSavedBanner(true)
    setTimeout(() => setIsSavedBanner(false), 2000)
  }

  return (
    <div className="settings-page-root">
      <Breadcrumb items={[{ label: 'Cài đặt hệ thống' }]} />

      <div className="page-header-row">
        <div>
          <h1 className="page-title">Cài đặt học tập & Giao diện</h1>
          <p className="page-subtitle">Tùy biến không gian học và trợ lý AI theo thói quen học tập của bạn</p>
        </div>

        {isSavedBanner && (
          <div className="saved-indicator" role="status">
            <Check size={14} /> Đã lưu thay đổi
          </div>
        )}
      </div>

      <div className="settings-sections-list">
        {/* Section 1: Giao diện */}
        <Card title="Giao diện hiển thị" subtitle="Chế độ màu sáng/tối tối ưu cho mắt khi học đêm">
          <div className="setting-control-row">
            <span className="control-label">Chế độ giao diện</span>
            <div className="theme-toggle-group">
              <button
                type="button"
                className={`theme-opt-btn ${settings.theme === 'light' ? 'active' : ''}`}
                onClick={() => handleThemeChange('light')}
              >
                <Sun size={15} aria-hidden /> Sáng
              </button>
              <button
                type="button"
                className={`theme-opt-btn ${settings.theme === 'dark' ? 'active' : ''}`}
                onClick={() => handleThemeChange('dark')}
              >
                <Moon size={15} aria-hidden /> Tối
              </button>
            </div>
          </div>
        </Card>

        {/* Section 2: Học tập */}
        <Card title="Mục tiêu học tập hàng ngày" subtitle="Đặt thời gian tự học mục tiêu mỗi ngày">
          <div className="setting-control-row">
            <span className="control-label">Thời lượng mục tiêu hàng ngày</span>
            <div className="goal-options-group">
              {[30, 45, 60, 90].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  className={`goal-opt-btn ${settings.dailyGoalMinutes === mins ? 'active' : ''}`}
                  onClick={() => handleGoalChange(mins)}
                >
                  {mins} phút
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Section 3: Thông báo */}
        <Card title="Nhắc nhở học tập" subtitle="Quản lý các thông báo để duy trì chuỗi học tập đều đặn">
          <div className="settings-toggles-list">
            <div className="toggle-item-row">
              <div className="toggle-item-info">
                <span className="toggle-item-title">Nhắc nhở chuỗi học (Streak)</span>
                <span className="toggle-item-desc">Thông báo vào 20:00 nếu bạn chưa hoàn thành bài học trong ngày</span>
              </div>
              <input
                type="checkbox"
                checked={settings.streakAlert}
                onChange={() => handleToggle('streakAlert')}
                className="setting-checkbox"
                aria-label="Nhắc nhở chuỗi học streak"
              />
            </div>

            <div className="toggle-item-row">
              <div className="toggle-item-info">
                <span className="toggle-item-title">Thông báo bài giảng mới</span>
                <span className="toggle-item-desc">Nhận thông báo khi khóa học của bạn cập nhật bài học hoặc đề thi mới</span>
              </div>
              <input
                type="checkbox"
                checked={settings.courseAlert}
                onChange={() => handleToggle('courseAlert')}
                className="setting-checkbox"
                aria-label="Thông báo bài giảng mới"
              />
            </div>
          </div>
        </Card>

        {/* Section 4: AI Tutor */}
        <Card title="Trợ lý AI Tutor" subtitle="Định hướng phong cách trả lời và giải bài của trợ lý">
          <div className="setting-control-row">
            <span className="control-label">Phong cách phản hồi của AI</span>
            <div className="ai-style-group">
              <button
                type="button"
                className={`style-opt-btn ${settings.aiResponseStyle === 'concise' ? 'active' : ''}`}
                onClick={() => handleStyleChange('concise')}
              >
                Ngắn gọn & Trực tiếp
              </button>
              <button
                type="button"
                className={`style-opt-btn ${settings.aiResponseStyle === 'balanced' ? 'active' : ''}`}
                onClick={() => handleStyleChange('balanced')}
              >
                Cân bằng & Chuẩn học thuật
              </button>
              <button
                type="button"
                className={`style-opt-btn ${settings.aiResponseStyle === 'detailed' ? 'active' : ''}`}
                onClick={() => handleStyleChange('detailed')}
              >
                Chi tiết từng bước
              </button>
            </div>
          </div>
        </Card>

        {/* Section 5: Đồng bộ & Lưu trữ */}
        <Card
          title="Lưu trữ & Đồng bộ dữ liệu"
          subtitle="Quản lý đồng bộ tiến độ học tập giữa trình duyệt và máy chủ backend"
        >
          <div className="setting-control-row">
            <div>
              <span className="control-label">Chế độ lưu trữ</span>
              <p className="control-desc">
                {isRemoteApiConfigured()
                  ? `Hybrid (Ngoại tuyến tức thì + Máy chủ API: ${getApiBaseUrl()})`
                  : 'Ngoại tuyến (Lưu trữ cục bộ an toàn, không phụ thuộc mạng)'}
              </p>
            </div>
            <div className="sync-actions-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontSize: '12px',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  background: isRemoteApiConfigured() ? 'var(--color-bg-secondary, #f1f5f9)' : 'var(--color-bg-secondary, #f1f5f9)',
                  color: 'var(--color-text-secondary, #64748b)',
                }}
              >
                {syncQueue.getPendingCount()} tác vụ chờ đồng bộ
              </span>
              {isRemoteApiConfigured() && (
                <button
                  type="button"
                  className="theme-opt-btn"
                  onClick={async () => {
                    await syncQueue.flush()
                    showSaved()
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <RefreshCw size={13} /> Đồng bộ ngay
                </button>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default SettingsPage
