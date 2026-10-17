import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'

export function DashboardSkeleton() {
  return (
    <div className="dashboard-skeleton-container" aria-label="Đang tải dữ liệu...">
      {/* Header Skeleton */}
      <div className="dashboard-header-skeleton">
        <div className="header-skeleton-left">
          <Skeleton width="280px" height="32px" rounded="lg" />
          <Skeleton width="420px" height="18px" rounded="md" className="mt-2" />
        </div>
        <Skeleton width="120px" height="40px" rounded="xl" />
      </div>

      {/* Stats Strip Skeleton */}
      <div className="stats-strip-container">
        <div className="stats-strip-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="stats-strip-item">
              <Skeleton width="40px" height="40px" rounded="xl" />
              <div className="stats-strip-content">
                <Skeleton width="80px" height="24px" rounded="md" />
                <Skeleton width="110px" height="14px" rounded="sm" className="mt-1" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Grid 1: Activity + Daily Goals */}
      <div className="dashboard-row-grid">
        <div className="col-span-8">
          <Card title={<Skeleton width="160px" height="20px" />} subtitle={<Skeleton width="220px" height="14px" />}>
            <Skeleton width="100%" height="220px" rounded="lg" />
          </Card>
        </div>
        <div className="col-span-4">
          <Card title={<Skeleton width="140px" height="20px" />} subtitle={<Skeleton width="180px" height="14px" />}>
            <div className="flex flex-col gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex flex-col gap-2">
                  <div className="flex justify-between">
                    <Skeleton width="140px" height="16px" rounded="sm" />
                    <Skeleton width="50px" height="16px" rounded="sm" />
                  </div>
                  <Skeleton width="100%" height="6px" rounded="full" />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Grid 2: Continue Learning + AI Tutor */}
      <div className="dashboard-row-grid">
        <div className="col-span-8">
          <Card title={<Skeleton width="150px" height="20px" />} subtitle={<Skeleton width="200px" height="14px" />}>
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 py-2">
                  <Skeleton width="40px" height="40px" rounded="lg" />
                  <div className="flex-1 flex flex-col gap-2">
                    <Skeleton width="70%" height="16px" rounded="sm" />
                    <Skeleton width="100%" height="6px" rounded="full" />
                  </div>
                  <Skeleton width="80px" height="36px" rounded="xl" />
                </div>
              ))}
            </div>
          </Card>
        </div>
        <div className="col-span-4">
          <Card>
            <div className="flex flex-col gap-3">
              <Skeleton width="120px" height="24px" rounded="md" />
              <Skeleton width="100%" height="40px" rounded="md" />
              <Skeleton width="100%" height="40px" rounded="xl" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
