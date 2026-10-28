import React from 'react'
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Award,
  Layers,
  FileCheck2,
  Activity,
  HelpCircle,
} from 'lucide-react'
import type { AdminUserItem } from '@/types/admin'
import { ROLE_LABELS } from '@/components/layout/workspaceNavigation'
import './AdminComponents.css'

export type DetailTabKey = 'overview' | 'progress' | 'assessments' | 'activities'

export interface AdminDetailTabsProps {
  user: AdminUserItem
  activeTab: DetailTabKey
  onTabChange: (tab: DetailTabKey) => void
}

export const AdminDetailTabs: React.FC<AdminDetailTabsProps> = ({
  user,
  activeTab,
  onTabChange,
}) => {
  const isLearner = user.role === 'learner'

  return (
    <div className="admin-detail-tabs-container">
      {/* Tab Navigation Headers */}
      <div className="admin-tabs-nav" role="tablist" aria-label="Chi tiết người dùng">
        <button
          type="button"
          role="tab"
          id="tab-overview"
          aria-selected={activeTab === 'overview'}
          aria-controls="panel-overview"
          className={`admin-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => onTabChange('overview')}
        >
          <Layers size={15} aria-hidden="true" />
          <span>Tổng quan</span>
        </button>

        <button
          type="button"
          role="tab"
          id="tab-progress"
          aria-selected={activeTab === 'progress'}
          aria-controls="panel-progress"
          className={`admin-tab-btn ${activeTab === 'progress' ? 'active' : ''}`}
          onClick={() => onTabChange('progress')}
        >
          <BookOpen size={15} aria-hidden="true" />
          <span>Tiến độ học tập</span>
        </button>

        <button
          type="button"
          role="tab"
          id="tab-assessments"
          aria-selected={activeTab === 'assessments'}
          aria-controls="panel-assessments"
          className={`admin-tab-btn ${activeTab === 'assessments' ? 'active' : ''}`}
          onClick={() => onTabChange('assessments')}
        >
          <Award size={15} aria-hidden="true" />
          <span>Bài tập thu hoạch</span>
          {user.assessments && user.assessments.length > 0 && (
            <span className="admin-tab-pill">{user.assessments.length}</span>
          )}
        </button>

        <button
          type="button"
          role="tab"
          id="tab-activities"
          aria-selected={activeTab === 'activities'}
          aria-controls="panel-activities"
          className={`admin-tab-btn ${activeTab === 'activities' ? 'active' : ''}`}
          onClick={() => onTabChange('activities')}
        >
          <Activity size={15} aria-hidden="true" />
          <span>Nhật ký hoạt động</span>
        </button>
      </div>

      {/* Tab Panel: Overview */}
      {activeTab === 'overview' && (
        <div
          id="panel-overview"
          role="tabpanel"
          aria-labelledby="tab-overview"
          className="admin-tab-panel"
        >
          {/* Card: Account Information */}
          <div className="staff-card admin-tab-card">
            <div className="staff-card-header">
              <h3 className="staff-card-title">Hồ sơ định danh & Vị trí công tác</h3>
            </div>
            <div className="staff-card-body">
              <div className="admin-detail-meta-grid">
                <div className="admin-meta-cell">
                  <span className="admin-meta-label">Mã định danh (ID)</span>
                  <span className="admin-meta-value code">{user.id}</span>
                </div>
                <div className="admin-meta-cell">
                  <span className="admin-meta-label">Email tài khoản</span>
                  <span className="admin-meta-value">{user.email}</span>
                </div>
                <div className="admin-meta-cell">
                  <span className="admin-meta-label">Vai trò hiển thị</span>
                  <span className="admin-meta-value">{ROLE_LABELS[user.role]}</span>
                </div>
                <div className="admin-meta-cell">
                  <span className="admin-meta-label">Lớp / Tổ chuyên môn</span>
                  <span className="admin-meta-value">{user.className || 'Chưa phân lớp'}</span>
                </div>
                <div className="admin-meta-cell">
                  <span className="admin-meta-label">Ngày tạo tài khoản</span>
                  <span className="admin-meta-value">
                    {new Date(user.createdAt).toLocaleString('vi-VN')}
                  </span>
                </div>
                <div className="admin-meta-cell">
                  <span className="admin-meta-label">Đăng nhập gần nhất</span>
                  <span className="admin-meta-value">
                    {user.lastLoginAt
                      ? new Date(user.lastLoginAt).toLocaleString('vi-VN')
                      : 'Chưa từng đăng nhập'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card: Security & Infrastructure */}
          <div className="staff-card admin-tab-card" style={{ marginTop: '20px' }}>
            <div className="staff-card-header">
              <h3 className="staff-card-title">Cơ chế bảo mật & Phiên làm việc</h3>
            </div>
            <div className="staff-card-body">
              <div className="admin-security-features">
                <div className="admin-sec-item">
                  <CheckCircle2 size={16} className="sec-icon-success" />
                  <div>
                    <div className="admin-sec-title">Bảo mật mật khẩu cấp độ cao</div>
                    <div className="admin-sec-desc">
                      Lưu trữ dạng hash Argon2id (mô phỏng quy chuẩn OWASP), không bao giờ hiển thị mật khẩu thô.
                    </div>
                  </div>
                </div>

                <div className="admin-sec-item">
                  <CheckCircle2 size={16} className="sec-icon-success" />
                  <div>
                    <div className="admin-sec-title">Phiên xác thực HttpOnly Cookie</div>
                    <div className="admin-sec-desc">
                      Chống tấn công XSS, tự động làm mới access token mỗi 15 phút qua refresh token an toàn.
                    </div>
                  </div>
                </div>

                <div className="admin-sec-item">
                  <Clock size={16} className="sec-icon-info" />
                  <div>
                    <div className="admin-sec-title">Phân vùng lưu trữ dữ liệu người dùng</div>
                    <div className="admin-sec-desc">
                      Không gian cách ly: <code>study_ai.{user.id}.v2</code> (IndexedDB / LocalStorage Cache)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Panel: Progress */}
      {activeTab === 'progress' && (
        <div
          id="panel-progress"
          role="tabpanel"
          aria-labelledby="tab-progress"
          className="admin-tab-panel"
        >
          {isLearner ? (
            <>
              {/* Top Stats */}
              <div className="admin-progress-stats-grid">
                <div className="admin-stat-box">
                  <div className="admin-stat-box-label">BÀI HỌC HOÀN THÀNH</div>
                  <div className="admin-stat-box-val">
                    {user.totalCompletedLessons ?? user.learningProgress?.completedLessons ?? 0}
                    <span className="admin-stat-box-total">
                      /{user.learningProgress?.totalLessons ?? 32}
                    </span>
                  </div>
                </div>

                <div className="admin-stat-box">
                  <div className="admin-stat-box-label">ĐIỂM TRUNG BÌNH THU HOẠCH</div>
                  <div className="admin-stat-box-val">
                    {user.averageScore ? `${user.averageScore}/100` : 'Chưa có'}
                  </div>
                </div>

                <div className="admin-stat-box">
                  <div className="admin-stat-box-label">CHUỖI NGÀY HỌC LIÊN TỤC</div>
                  <div className="admin-stat-box-val highlight">
                    🔥 {user.learningProgress?.streakDays ?? 0} ngày
                  </div>
                </div>
              </div>

              {/* Subject breakdowns */}
              <div className="staff-card admin-tab-card" style={{ marginTop: '20px' }}>
                <div className="staff-card-header">
                  <h3 className="staff-card-title">Tiến trình theo môn học</h3>
                </div>
                <div className="staff-card-body">
                  {user.learningProgress?.recentSubjects && user.learningProgress.recentSubjects.length > 0 ? (
                    <div className="admin-subject-progress-list">
                      {user.learningProgress.recentSubjects.map((sub) => (
                        <div key={sub.name} className="admin-sub-progress-item">
                          <div className="admin-sub-progress-header">
                            <span className="admin-sub-name">{sub.name}</span>
                            <span className="admin-sub-pct">{sub.progress}%</span>
                          </div>
                          <div className="admin-progress-bar-track">
                            <div
                              className="admin-progress-bar-fill"
                              style={{ width: `${sub.progress}%` }}
                            />
                          </div>
                          <div className="admin-sub-progress-time">
                            Học gần nhất: {new Date(sub.lastStudied).toLocaleDateString('vi-VN')}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="admin-empty-tab-state">
                      <HelpCircle size={24} />
                      <p>Học viên chưa bắt đầu môn học nào trong học kỳ này.</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="staff-card admin-tab-card">
              <div className="staff-card-body">
                <div className="admin-empty-tab-state">
                  <Award size={28} />
                  <h4>Tài khoản nhân sự ({ROLE_LABELS[user.role]})</h4>
                  <p>
                    Dữ liệu tiến độ học tập và điểm số chỉ áp dụng cho tài khoản Học viên.
                    Nhân sự quản lý hệ thống, duyệt bài học hoặc chấm bài tập.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab Panel: Assessments */}
      {activeTab === 'assessments' && (
        <div
          id="panel-assessments"
          role="tabpanel"
          aria-labelledby="tab-assessments"
          className="admin-tab-panel"
        >
          {user.assessments && user.assessments.length > 0 ? (
            <div className="staff-card admin-tab-card">
              <div className="staff-card-header">
                <h3 className="staff-card-title">Lịch sử bài thu hoạch & Đánh giá</h3>
              </div>
              <div className="staff-card-body" style={{ padding: 0 }}>
                <table className="staff-table" aria-label="Danh sách bài thu hoạch của học viên">
                  <thead>
                    <tr>
                      <th scope="col">Tên bài kiểm tra / Thu hoạch</th>
                      <th scope="col">Điểm số</th>
                      <th scope="col">Trạng thái</th>
                      <th scope="col">Thời điểm nộp</th>
                      <th scope="col">Nhận xét của giáo viên</th>
                    </tr>
                  </thead>
                  <tbody>
                    {user.assessments.map((asm) => (
                      <tr key={asm.id}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                            {asm.title}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Mã: {asm.id}
                          </div>
                        </td>
                        <td>
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: '1rem',
                              color: asm.score >= 5 ? '#047857' : '#dc2626',
                            }}
                          >
                            {asm.score} / {asm.maxScore}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`staff-status-badge ${
                              asm.status === 'passed' ? 'active' : 'suspended'
                            }`}
                          >
                            {asm.status === 'passed' ? 'Đạt' : 'Cần ôn lại'}
                          </span>
                        </td>
                        <td>{new Date(asm.submittedAt).toLocaleDateString('vi-VN')}</td>
                        <td>
                          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                            {asm.feedback || 'Chưa có nhận xét'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="staff-card admin-tab-card">
              <div className="staff-card-body">
                <div className="admin-empty-tab-state">
                  <FileCheck2 size={28} />
                  <h4>Chưa có dữ liệu bài thu hoạch</h4>
                  <p>Người dùng này chưa hoàn tất hoặc chưa nộp bài kiểm tra thu hoạch nào.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab Panel: Activities */}
      {activeTab === 'activities' && (
        <div
          id="panel-activities"
          role="tabpanel"
          aria-labelledby="tab-activities"
          className="admin-tab-panel"
        >
          <div className="staff-card admin-tab-card">
            <div className="staff-card-header">
              <h3 className="staff-card-title">Nhật ký truy vết người dùng (Audit Log)</h3>
            </div>
            <div className="staff-card-body">
              {user.activities && user.activities.length > 0 ? (
                <div className="admin-user-activities-timeline">
                  {user.activities.map((act) => (
                    <div key={act.id} className="admin-user-act-row">
                      <div className="admin-user-act-dot" aria-hidden="true" />
                      <div className="admin-user-act-content">
                        <div className="admin-user-act-action">{act.action}</div>
                        <div className="admin-user-act-meta">
                          <span className="admin-user-act-time">
                            {new Date(act.timestamp).toLocaleString('vi-VN')}
                          </span>
                          {act.ipAddress && (
                            <span className="admin-user-act-ip">IP: {act.ipAddress}</span>
                          )}
                          {act.device && (
                            <span className="admin-user-act-dev">Thiết bị: {act.device}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="admin-empty-tab-state">
                  <Activity size={28} />
                  <h4>Chưa ghi nhận hoạt động nào</h4>
                  <p>Mọi thao tác đăng nhập, học tập hoặc chỉnh sửa phân quyền sẽ xuất hiện tại đây.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
