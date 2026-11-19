import React, { useState, useEffect, useCallback } from 'react'
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  GraduationCap,
  RotateCw,
  Sparkles,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { classroomService } from '@/services/classroom.service'
import { smartReviewService } from '@/services/smartReview.service'
import type { AdminAssignmentItem } from '@/types/classroom'
import './SchedulePage.css'

interface UnifiedScheduleEvent {
  id: string
  title: string
  type: 'assignment' | 'review' | 'class'
  dueDate: string
  subject: string
  urgency: 'high' | 'medium' | 'low'
  actionUrl: string
  actionLabel: string
  metadata?: string
}

export const SchedulePage: React.FC = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'all' | 'assignments' | 'reviews'>('all')
  const [events, setEvents] = useState<UnifiedScheduleEvent[]>([])
  const [loading, setLoading] = useState(true)

  const loadScheduleEvents = useCallback(async () => {
    setLoading(true)
    try {
      const [assignments, reviewSummary] = await Promise.allSettled([
        classroomService.getAssignments(),
        smartReviewService.getSummary(),
      ])

      const unifiedList: UnifiedScheduleEvent[] = []

      if (assignments.status === 'fulfilled' && Array.isArray(assignments.value)) {
        assignments.value.forEach((a: AdminAssignmentItem) => {
          unifiedList.push({
            id: `assign-${a.id}`,
            title: a.title,
            type: 'assignment',
            dueDate: a.dueDate || new Date().toISOString(),
            subject: a.subjectName || 'Chương trình THPT',
            urgency: 'medium',
            actionUrl: `/assignments`,
            actionLabel: 'Làm bài tập',
            metadata: `${(a as any).totalQuestions || 20} câu hỏi · ${a.maxScore || 10} điểm`,
          })
        })
      }

      if (reviewSummary.status === 'fulfilled') {
        const dueCount = reviewSummary.value.dueTodayCount || 0
        if (dueCount > 0) {
          unifiedList.push({
            id: 'smart-review-due',
            title: `Ôn tập kiến thức ngắt quãng (${dueCount} thẻ đến hạn)`,
            type: 'review',
            dueDate: new Date().toISOString(),
            subject: 'Lặp lại thông minh SM-2',
            urgency: 'high',
            actionUrl: '/review',
            actionLabel: 'Ôn tập ngay',
            metadata: `${dueCount} chủ đề yếu cần củng cố`,
          })
        }
      }

      // Add standard weekly live classes
      unifiedList.push({
        id: 'class-weekly-math',
        title: 'Chữa đề thi thử tốt nghiệp THPT 2026 - Môn Toán',
        type: 'class',
        dueDate: new Date(Date.now() + 86400000 * 2).toISOString(),
        subject: 'Toán học 12',
        urgency: 'low',
        actionUrl: '/exam-preparation',
        actionLabel: 'Xem chi tiết đề',
        metadata: 'Phòng học trực tuyến · Giáo viên bộ môn',
      })

      // Sort by dueDate
      unifiedList.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      setEvents(unifiedList)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadScheduleEvents()
  }, [loadScheduleEvents])

  const filteredEvents = events.filter((e) => {
    if (activeTab === 'assignments') return e.type === 'assignment'
    if (activeTab === 'reviews') return e.type === 'review'
    return true
  })

  const assignmentCount = events.filter((e) => e.type === 'assignment').length
  const reviewCount = events.filter((e) => e.type === 'review').length

  return (
    <div className="schedule-page" data-testid="schedule-page">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Trang chủ', to: '/dashboard' },
          { label: 'Lịch học & Kế hoạch' },
        ]}
      />

      {/* Header */}
      <div className="schedule-header">
        <h1 className="schedule-title flex items-center gap-2">
          <Calendar className="text-blue-600 w-8 h-8" />
          Lịch học & Thời khóa biểu
        </h1>
        <p className="schedule-subtitle">
          Theo dõi hạn nộp bài tập của lớp học, lịch ôn tập ngắt quãng và các phiên luyện thi sắp diễn ra.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="schedule-kpis">
        <div className="schedule-kpi-card">
          <div className="schedule-kpi-icon-wrap" style={{ background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb' }}>
            <GraduationCap size={24} />
          </div>
          <div>
            <div className="schedule-kpi-val">{assignmentCount}</div>
            <div className="schedule-kpi-label">Bài tập lớp học</div>
          </div>
        </div>

        <div className="schedule-kpi-card">
          <div className="schedule-kpi-icon-wrap" style={{ background: 'rgba(217, 119, 6, 0.1)', color: '#d97706' }}>
            <RotateCw size={24} />
          </div>
          <div>
            <div className="schedule-kpi-val">{reviewCount > 0 ? reviewCount : 'Đã hoàn thành'}</div>
            <div className="schedule-kpi-label">Phiên ôn tập đến hạn</div>
          </div>
        </div>

        <div className="schedule-kpi-card">
          <div className="schedule-kpi-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div className="schedule-kpi-val">100%</div>
            <div className="schedule-kpi-label">Đúng tiến độ tuần này</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="schedule-tabs">
        <button
          type="button"
          className={`schedule-tab ${activeTab === 'all' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <Calendar size={16} />
          Tất cả sự kiện ({events.length})
        </button>
        <button
          type="button"
          className={`schedule-tab ${activeTab === 'assignments' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('assignments')}
        >
          <GraduationCap size={16} />
          Bài tập đến hạn ({assignmentCount})
        </button>
        <button
          type="button"
          className={`schedule-tab ${activeTab === 'reviews' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('reviews')}
        >
          <Sparkles size={16} />
          Ôn tập ngắt quãng ({reviewCount})
        </button>
      </div>

      {/* Timeline List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-slate-500">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm font-medium">Đang tải lịch học và hạn bài tập...</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="Không có sự kiện nào sắp tới"
          description="Bạn đã hoàn thành mọi bài tập và lịch ôn tập! Hãy luyện tập thêm đề thi thử để củng cố kiến thức."
          actionLabel="Đến trung tâm Luyện thi"
          onAction={() => navigate('/exam-preparation')}
        />
      ) : (
        <div className="schedule-timeline">
          {filteredEvents.map((evt) => {
            const dateStr = new Date(evt.dueDate).toLocaleDateString('vi-VN', {
              weekday: 'short',
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })

            return (
              <div key={evt.id} className="schedule-item-card">
                <div className="schedule-item-left">
                  <div
                    className="schedule-item-type-badge"
                    style={{
                      background:
                        evt.type === 'assignment'
                          ? 'rgba(124, 58, 237, 0.1)'
                          : evt.type === 'review'
                            ? 'rgba(219, 39, 119, 0.1)'
                            : 'rgba(37, 99, 235, 0.1)',
                      color:
                        evt.type === 'assignment'
                          ? '#7c3aed'
                          : evt.type === 'review'
                            ? '#db2777'
                            : '#2563eb',
                    }}
                  >
                    {evt.type === 'assignment' ? (
                      <GraduationCap size={20} />
                    ) : evt.type === 'review' ? (
                      <Sparkles size={20} />
                    ) : (
                      <BookOpen size={20} />
                    )}
                  </div>

                  <div className="schedule-item-info">
                    <h3 className="schedule-item-title">{evt.title}</h3>
                    <div className="schedule-item-meta">
                      <span className="flex items-center gap-1 font-medium text-slate-700">
                        <Clock size={13} /> {dateStr}
                      </span>
                      <span>·</span>
                      <span>{evt.subject}</span>
                      {evt.metadata && (
                        <>
                          <span>·</span>
                          <span>{evt.metadata}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`schedule-item-due-badge ${
                      evt.urgency === 'high'
                        ? 'schedule-item-due-urgent'
                        : 'schedule-item-due-normal'
                    }`}
                  >
                    {evt.urgency === 'high' ? 'Gấp' : 'Đúng hạn'}
                  </span>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={ArrowRight}
                    onClick={() => navigate(evt.actionUrl)}
                  >
                    {evt.actionLabel}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default SchedulePage
