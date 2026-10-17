import { Skeleton } from '@/components/ui/Skeleton'

export function DashboardSkeleton() {
  return (
    <div className="learning-dashboard-skeleton" aria-label="Đang tải dữ liệu học tập...">
      {/* Top Header Skeleton */}
      <div className="skeleton-top-header">
        <div className="flex items-center gap-3">
          <Skeleton width="48px" height="48px" rounded="full" />
          <div className="flex flex-col gap-1">
            <Skeleton width="100px" height="14px" rounded="sm" />
            <Skeleton width="160px" height="24px" rounded="md" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton width="36px" height="36px" rounded="md" />
          <Skeleton width="36px" height="36px" rounded="md" />
          <Skeleton width="36px" height="36px" rounded="md" />
        </div>
      </div>

      {/* Main Content Skeleton Grid */}
      <div className="learning-dashboard-content">
        {/* Row 1: Primary Learning + Explore Subjects */}
        <div className="learning-row-top">
          <div className="skeleton-card skeleton-primary-learning">
            <Skeleton width="120px" height="16px" rounded="sm" />
            <Skeleton width="220px" height="26px" rounded="md" className="mt-2" />
            <Skeleton width="180px" height="14px" rounded="sm" className="mt-1" />
            <Skeleton width="100%" height="8px" rounded="full" className="mt-4" />
            <Skeleton width="160px" height="40px" rounded="xl" className="mt-4" />
          </div>

          <div className="skeleton-explore-section">
            <div className="flex justify-between items-center mb-3">
              <Skeleton width="160px" height="20px" rounded="sm" />
              <Skeleton width="80px" height="16px" rounded="sm" />
            </div>
            <div className="skeleton-subjects-grid">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton-card skeleton-subject-item">
                  <Skeleton width="36px" height="36px" rounded="lg" />
                  <Skeleton width="70px" height="18px" rounded="sm" className="mt-2" />
                  <Skeleton width="50px" height="12px" rounded="sm" className="mt-1" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Row 2: Progress & Weekly Goal (Left) + Recommended (Right) */}
        <div className="learning-row-bottom">
          <div className="learning-col-left flex flex-col gap-5">
            <div className="skeleton-card skeleton-progress-card">
              <Skeleton width="140px" height="18px" rounded="sm" className="mb-3" />
              <Skeleton width="100%" height="68px" rounded="xl" />
            </div>

            <div className="skeleton-card skeleton-weekly-card">
              <Skeleton width="120px" height="18px" rounded="sm" className="mb-2" />
              <Skeleton width="180px" height="14px" rounded="sm" className="mb-4" />
              <div className="flex justify-between gap-2">
                {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <Skeleton key={i} width="36px" height="48px" rounded="lg" />
                ))}
              </div>
            </div>
          </div>

          <div className="learning-col-right">
            <div className="flex justify-between items-center mb-3">
              <Skeleton width="150px" height="20px" rounded="sm" />
              <Skeleton width="70px" height="16px" rounded="sm" />
            </div>
            <div className="skeleton-recommended-grid">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton-card skeleton-rec-item">
                  <Skeleton width="100%" height="70px" rounded="lg" />
                  <Skeleton width="90%" height="18px" rounded="sm" className="mt-2" />
                  <Skeleton width="60%" height="14px" rounded="sm" className="mt-1" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
