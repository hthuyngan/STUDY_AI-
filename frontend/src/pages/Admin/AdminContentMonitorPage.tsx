import React, { useEffect, useState, useMemo } from 'react'
import {
  FileCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  HelpCircle,
  ExternalLink,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { operationsService } from '@/services/operations.service'
import type { ApprovalItem } from '@/types/operations'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import './AdminPages.css'
import '@/components/admin/AdminComponents.css'

export const AdminContentMonitorPage: React.FC = () => {
  const [approvals, setApprovals] = useState<ApprovalItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    operationsService
      .getApprovals()
      .then((data) => {
        if (active) {
          setApprovals(Array.isArray(data) ? data : [])
          setLoading(false)
        }
      })
      .catch(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  // Metrics
  const metrics = useMemo(() => {
    const total = approvals.length
    const pending = approvals.filter((a) => a.status === 'pending').length
    const approved = approvals.filter((a) => a.status === 'approved').length
    const rejected = approvals.filter((a) => a.status === 'rejected').length
    const published = approvals.filter((a) => a.status === 'published').length
    const rate = total > 0 ? Math.round(((approved + published) / total) * 100) : 100

    return { total, pending, approved, rejected, published, rate }
  }, [approvals])

  return (
    <div className="admin-page-container">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Giám sát & Báo cáo Nội dung Giáo dục</h1>
          <p className="admin-page-desc">
            Theo dõi tiến độ kiểm duyệt học liệu, tỷ lệ thông qua và giám sát hoạt động của Content Workspace.
          </p>
        </div>

        <Link to="/content/review" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span>Mở Content Workspace</span>
          <ExternalLink size={16} />
        </Link>
      </div>

      {/* 4 KPIs */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#FEF3C7', color: '#B45309' }}>
            <Clock size={22} />
          </div>
          <div>
            <div className="stat-label">Đang chờ kiểm duyệt</div>
            <div className="stat-value">{metrics.pending}</div>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#DCFCE7', color: '#15803D' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="stat-label">Đã xuất bản vào kho</div>
            <div className="stat-value">{metrics.published}</div>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
            <AlertTriangle size={22} />
          </div>
          <div>
            <div className="stat-label">Cần sửa đổi / Từ chối</div>
            <div className="stat-value">{metrics.rejected}</div>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#E0F2FE', color: '#0369A1' }}>
            <FileCheck size={22} />
          </div>
          <div>
            <div className="stat-label">Tỷ lệ duyệt thành công</div>
            <div className="stat-value">{metrics.rate}%</div>
          </div>
        </div>
      </div>

      {/* Info Callout Banner */}
      <div
        style={{
          backgroundColor: '#FFF9EA',
          border: '1px solid #F4B942',
          borderRadius: 8,
          padding: '16px 20px',
          marginBottom: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <strong style={{ color: '#102A43', fontSize: '1rem' }}>
            Phân quyền nghiệp vụ V6: Trách nhiệm quản lý học liệu
          </strong>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: '#627D98' }}>
            Nghiệp vụ soạn thảo, biên tập, xếp chương và duyệt bài thuộc quyền sở hữu của <strong>Content Workspace</strong>. 
            Quản trị viên theo dõi tổng quan tại đây và chuyển tiếp trực tiếp khi cần thực hiện kiểm duyệt.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/content/subjects" className="btn btn-secondary btn-sm">
            Kho môn học
          </Link>
          <Link to="/content/review" className="btn btn-primary btn-sm">
            Hàng đợi kiểm duyệt &rarr;
          </Link>
        </div>
      </div>

      {/* Backlog Table */}
      <div className="admin-card">
        <div className="admin-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="admin-card-title">Học liệu trong hàng đợi kiểm duyệt gần đây</h2>
          <Link to="/content/review" style={{ fontSize: '0.85rem', color: '#102A43', textDecoration: 'none', fontWeight: 600 }}>
            Xem toàn bộ hàng đợi &rarr;
          </Link>
        </div>

        <div className="admin-table-container">
          {loading ? (
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Skeleton height={44} />
              <Skeleton height={44} />
            </div>
          ) : approvals.length === 0 ? (
            <EmptyState
              title="Không có yêu cầu kiểm duyệt"
              description="Hiện tại chưa có bài học hoặc đề thi nào đang chờ xử lý."
            />
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nội dung học liệu</th>
                  <th>Phân loại</th>
                  <th>Môn học</th>
                  <th>Tác giả biên soạn</th>
                  <th>Ngày gửi</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'center' }}>Xem chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {approvals.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#102A43' }}>{item.title}</div>
                      <div style={{ fontSize: '0.75rem', color: '#627D98' }}>Mã: {item.id}</div>
                    </td>
                    <td>
                      <span className="badge badge-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {item.contentType === 'lesson' ? <BookOpen size={12} /> : <HelpCircle size={12} />}
                        {item.contentType === 'lesson' ? 'Bài học' : 'Bài kiểm tra'}
                      </span>
                    </td>
                    <td style={{ color: '#334E68' }}>{item.subjectName}</td>
                    <td>
                      <div style={{ fontWeight: 500, color: '#102A43' }}>{item.authorName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#627D98' }}>{item.authorRole}</div>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: '#627D98' }}>{item.submittedAt}</td>
                    <td>
                      <span
                        className={`badge ${
                          item.status === 'published'
                            ? 'badge-success'
                            : item.status === 'approved'
                            ? 'badge-success'
                            : item.status === 'pending'
                            ? 'badge-warning'
                            : 'badge-danger'
                        }`}
                      >
                        {item.status === 'published' && 'Đã xuất bản'}
                        {item.status === 'approved' && 'Đã duyệt'}
                        {item.status === 'pending' && 'Chờ duyệt'}
                        {item.status === 'rejected' && 'Cần sửa đổi'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <Link
                        to={`/content/review/${item.id}`}
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        <span>Duyệt</span>
                        <ArrowRight size={13} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
