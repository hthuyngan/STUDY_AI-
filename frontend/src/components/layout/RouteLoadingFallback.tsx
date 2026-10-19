import { Skeleton } from '../ui/Skeleton'

export function RouteLoadingFallback() {
  return (
    <div
      style={{
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        maxWidth: '1200px',
        margin: '0 auto',
        width: '100%',
      }}
      aria-busy="true"
      aria-label="Đang tải trang..."
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <Skeleton width={180} height={16} rounded="sm" />
        <Skeleton width={260} height={28} rounded="md" />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
        }}
      >
        <Skeleton height={140} rounded="lg" />
        <Skeleton height={140} rounded="lg" />
        <Skeleton height={140} rounded="lg" />
      </div>

      <Skeleton height={260} rounded="lg" />
    </div>
  )
}
