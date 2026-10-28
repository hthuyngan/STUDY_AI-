import React, { useState } from 'react'
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
} from 'lucide-react'
import { operationsService } from '@/services/operations.service'
import type { OperationalSettings } from '@/types/operations'
import './AdminPages.css'
import '@/components/admin/AdminComponents.css'

export const AdminSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<OperationalSettings>(operationsService.getSettings())
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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    operationsService.saveSettings(settings, 'Demo Admin')
    showToast('Đã lưu thành công các thiết lập vận hành')
    setStorageUsage(computeStorageUsage())
  }

  const handleResetSettings = () => {
    if (window.confirm('Khôi phục toàn bộ thiết lập về giá trị mặc định ban đầu?')) {
      const defaults = operationsService.resetSettings('Demo Admin')
      setSettings(defaults)
      showToast('Đã khôi phục thiết lập mặc định')
      setStorageUsage(computeStorageUsage())
    }
  }

  const handleResetAllData = () => {
    if (
      window.confirm(
        'CẢNH BÁO: Thao tác này sẽ xóa toàn bộ dữ liệu demo (phê duyệt, bài nộp, ticket, thông báo) đã lưu trong localStorage và đưa hệ thống về trạng thái ban đầu. Bạn có chắc chắn?'
      )
    ) {
      operationsService.resetAllDemoData()
      setSettings(operationsService.getSettings())
      showToast('Đã đặt lại dữ liệu demo hệ thống')
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
              Tùy biến các quy tắc học tập, ngưỡng cảnh báo, quy trình kiểm duyệt nội dung và quản trị bộ nhớ demo.
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
              <label className="form-label" htmlFor="set-lang">Ngôn ngữ giao diện demo</label>
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

            <div style={{ display: 'flex', alignItems: 'center', marginTop: 24 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.enableDemoAlerts}
                  onChange={(e) => setSettings({ ...settings, enableDemoAlerts: e.target.checked })}
                />
                <span style={{ fontSize: '0.9rem', color: '#102a43' }}>
                  Kích hoạt thông báo cảnh báo demo trong thanh Topbar
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* E. BỘ NHỚ LOCALSTORAGE & RESET */}
        <div className="admin-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 22 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#102a43', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Database size={18} />
            <span>E. Quản trị bộ nhớ trình duyệt & Dữ liệu Demo</span>
          </h2>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderRadius: 6, marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 600, color: '#102a43', fontSize: '0.9rem' }}>Dung lượng dữ liệu demo hiện tại:</div>
              <div style={{ fontSize: '0.8rem', color: '#627d98' }}>Lưu trữ các lớp học, học viên, bài tập, ticket và phê duyệt</div>
            </div>
            <strong style={{ fontSize: '1.1rem', color: '#0284c7' }}>{storageUsage}</strong>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={handleResetAllData}
            >
              <Trash2 size={14} style={{ marginRight: 6 }} />
              <span>Xóa toàn bộ dữ liệu demo & Reset trạng thái</span>
            </button>
          </div>
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
