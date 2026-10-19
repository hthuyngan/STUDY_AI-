import { Skeleton } from '@/components/ui/Skeleton'

export function DashboardSkeleton() {
  return (
    <div className="dashboard-root is-loading" aria-busy="true" aria-label="Đang tải dữ liệu bảng điều khiển">
      {/* 1. Hero Skeleton */}
      <div className="skeleton-hero-card">
        <div className="skeleton-hero-left">
          <Skeleton variant="text" width={260} height={32} />
          <Skeleton variant="text" width="60%" height={18} />
          <div className="skeleton-hero-meta">
            <Skeleton variant="rect" width={140} height={24} />
            <Skeleton variant="rect" width={120} height={24} />
          </div>
          <Skeleton variant="rect" width={160} height={42} />
        </div>
        <Skeleton variant="circle" width={120} height={120} className="desktop-only" />
      </div>

      {/* 2. Suggested Learning (2/3) + Calendar/Streak (1/3) */}
      <div className="dashboard-row-grid-2-1">
        <div className="col-suggested">
          <div className="skeleton-card-surface">
            <Skeleton variant="text" width={180} height={22} />
            <Skeleton variant="text" width={220} height={14} />
            <Skeleton variant="rect" width="100%" height={90} />
            <Skeleton variant="rect" width="100%" height={10} />
            <Skeleton variant="rect" width={140} height={38} />
          </div>
        </div>

        <div className="col-calendar">
          <div className="skeleton-card-surface">
            <Skeleton variant="text" width={140} height={20} />
            <Skeleton variant="rect" width="100%" height={120} />
            <Skeleton variant="rect" width="100%" height={40} />
          </div>
        </div>
      </div>

      {/* 3. Weekly Plan (Full Width) */}
      <div className="skeleton-card-surface">
        <Skeleton variant="text" width={200} height={22} />
        <div className="skeleton-weekly-cols">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Skeleton key={i} variant="rect" width="100%" height={64} />
          ))}
        </div>
      </div>

      {/* 4. Smart Review (2/3) + AI Tutor (1/3) */}
      <div className="dashboard-row-grid-2-1">
        <div className="col-smart-review">
          <div className="skeleton-card-surface">
            <Skeleton variant="text" width={190} height={22} />
            <Skeleton variant="rect" width="100%" height={48} />
            <Skeleton variant="rect" width="100%" height={48} />
            <Skeleton variant="rect" width="100%" height={48} />
          </div>
        </div>

        <div className="col-ai-tutor">
          <div className="skeleton-card-surface">
            <Skeleton variant="text" width={120} height={20} />
            <Skeleton variant="rect" width="100%" height={70} />
            <Skeleton variant="rect" width="100%" height={38} />
          </div>
        </div>
      </div>

      {/* 5. Learning Progress (1/2) + Recent Activity (1/2) */}
      <div className="dashboard-row-grid-1-1">
        <div className="col-half">
          <div className="skeleton-card-surface">
            <Skeleton variant="text" width={170} height={22} />
            <Skeleton variant="rect" width="100%" height={44} />
            <Skeleton variant="rect" width="100%" height={44} />
            <Skeleton variant="rect" width="100%" height={44} />
            <Skeleton variant="rect" width="100%" height={44} />
          </div>
        </div>

        <div className="col-half">
          <div className="skeleton-card-surface">
            <Skeleton variant="text" width={180} height={22} />
            <Skeleton variant="rect" width="100%" height={44} />
            <Skeleton variant="rect" width="100%" height={44} />
            <Skeleton variant="rect" width="100%" height={44} />
            <Skeleton variant="rect" width="100%" height={44} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardSkeleton
