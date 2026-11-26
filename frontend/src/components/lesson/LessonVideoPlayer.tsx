import { ExternalLink, Play, Tv } from 'lucide-react'
import type { LessonVideoMetadata } from '@/types/lesson'
import './LessonVideoPlayer.css'

export interface VideoItemOption {
  id: string
  title: string
  description?: string
  provider: string
  sourceUrl: string
  embedUrl?: string | null
  youTubeVideoId?: string | null
  channelName?: string | null
  isPrimary?: boolean
  attributionText?: string | null
  durationSeconds?: number | null
  thumbnailUrl?: string | null
  embedAllowed?: boolean
  verificationStatus?: string
}

export interface LessonVideoPlayerProps {
  video?: LessonVideoMetadata | VideoItemOption
  videos?: VideoItemOption[]
  lessonTitle: string
  sourceReferenceUrl?: string
  onSwitchToTheoryTab?: () => void
  onVideoCompleted?: () => void
}

export const LessonVideoPlayer: React.FC<LessonVideoPlayerProps> = ({
  video,
  videos,
  lessonTitle,
  sourceReferenceUrl,
  onSwitchToTheoryTab,
  onVideoCompleted,
}) => {
  // Select strictly one primary video (first valid video)
  let currentVideo: VideoItemOption | null = null

  if (videos && videos.length > 0) {
    currentVideo = videos[0]
  } else if (video) {
    if ('youTubeVideoId' in video || 'embedUrl' in video) {
      currentVideo = video as VideoItemOption
    } else {
      const vMeta = video as LessonVideoMetadata
      if (vMeta.hasVideo && (vMeta.youtubeId || vMeta.videoUrl)) {
        currentVideo = {
          id: 'default',
          title: vMeta.licenseNotice || lessonTitle,
          provider: vMeta.provider || 'youtube',
          sourceUrl: vMeta.sourceReferenceUrl || vMeta.videoUrl || '',
          embedUrl: vMeta.videoUrl,
          youTubeVideoId: vMeta.youtubeId,
          durationSeconds: vMeta.durationSeconds,
        }
      }
    }
  }

  const effectiveRefUrl =
    currentVideo?.sourceUrl ||
    (video && 'sourceReferenceUrl' in video ? video.sourceReferenceUrl : undefined) ||
    sourceReferenceUrl

  // Format duration into mm:ss
  const formatDuration = (seconds?: number) => {
    if (!seconds || seconds <= 0) return ''
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // CASE 1: Khan Academy or Non-Embeddable Video -> Show official external partner button
  const isKhan = currentVideo?.provider === 'khan_academy' || (effectiveRefUrl && /khanacademy\.org/i.test(effectiveRefUrl))
  if (currentVideo && (!currentVideo.embedAllowed || isKhan)) {
    const partnerUrl = currentVideo.sourceUrl || effectiveRefUrl || ''
    return (
      <section className="lesson-video-container" aria-label="Bài giảng Khan Academy">
        <div className="video-card-header">
          <div className="video-card-header-left">
            <Tv size={17} className="video-header-icon" aria-hidden />
            <h2 className="video-card-title">Bài giảng Khan Academy Vietnam</h2>
          </div>
        </div>
        <div className="video-ref-compact-card" style={{ padding: '1.5rem', margin: '0' }}>
          <div className="video-ref-left" style={{ alignItems: 'flex-start' }}>
            <div className="video-ref-icon" style={{ backgroundColor: 'rgba(20, 163, 139, 0.1)', color: '#14a38b' }}>
              <Tv size={24} aria-hidden />
            </div>
            <div>
              <h4 className="video-ref-title" style={{ fontSize: '1rem', fontWeight: 600 }}>
                {currentVideo.title || lessonTitle}
              </h4>
              <p className="video-ref-desc" style={{ marginTop: '0.25rem', color: 'var(--color-text-secondary, #64748b)' }}>
                {currentVideo.attributionText || 'Nguồn: Khan Academy Vietnam (Bản quyền giáo dục mở CC BY-NC-SA 4.0)'}
              </p>
            </div>
          </div>
          <div className="video-ref-actions" style={{ marginTop: '1rem' }}>
            {partnerUrl ? (
              <a
                href={partnerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-khan-ref"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: '#14a38b',
                  color: '#ffffff',
                  padding: '0.6rem 1.2rem',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  textDecoration: 'none',
                }}
              >
                <span>Mở bài giảng nguồn</span>
                <ExternalLink size={16} aria-hidden />
              </a>
            ) : null}
          </div>
        </div>
      </section>
    )
  }

  // CASE 2: Valid Video to play with Embed
  if (currentVideo && (currentVideo.youTubeVideoId || currentVideo.embedUrl)) {
    const isYouTube = currentVideo.provider === 'youtube' || !!currentVideo.youTubeVideoId
    const ytId = currentVideo.youTubeVideoId || (currentVideo.embedUrl?.match(/embed\/([\w-]{11})/)?.[1])
    const rawPlaybackUrl = currentVideo.embedUrl || currentVideo.sourceUrl || ''
    const isSafeHttpsUrl = /^https:\/\//i.test(rawPlaybackUrl)
    const isValidYouTube = isYouTube && !!ytId && /^[\w-]{11}$/.test(ytId)

    if (!isValidYouTube && !isSafeHttpsUrl) {
      return (
        <section className="lesson-video-container" aria-label="Video bài giảng không khả dụng">
          <div className="lesson-video-unavailable" role="status">
            <div>
              <strong>Video bài giảng không hợp lệ hoặc không được hỗ trợ</strong>
              <p>Đường dẫn video không đạt chuẩn bảo mật. Bạn vẫn có thể học toàn bộ nội dung lý thuyết bên dưới.</p>
            </div>
          </div>
        </section>
      )
    }

    const channelAttribution = currentVideo.channelName
      ? `Kênh: ${currentVideo.channelName}`
      : currentVideo.attributionText || (isYouTube ? 'YouTube GDPT 2018' : 'STUDY_AI Official')

    return (
      <section className="lesson-video-container" aria-label="Video bài giảng">
        {/* Simple & Clean Video Card Header */}
        <div className="video-card-header">
          <div className="video-card-header-left">
            <Tv size={17} className="video-header-icon" aria-hidden />
            <h2 className="video-card-title">Video bài giảng</h2>
          </div>
          <div className="video-card-header-right">
            {currentVideo.durationSeconds ? (
              <span className="video-duration-badge">
                {formatDuration(currentVideo.durationSeconds)}
              </span>
            ) : null}
          </div>
        </div>

        <div className="video-player-frame">
          {isYouTube && ytId ? (
            <iframe
              className="video-iframe"
              src={`https://www.youtube-nocookie.com/embed/${ytId}?rel=0&modestbranding=1&enablejsapi=1`}
              title={`Video bài giảng: ${currentVideo.title || lessonTitle}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <video
              className="video-element"
              src={currentVideo.embedUrl || currentVideo.sourceUrl}
              controls
              playsInline
              onEnded={onVideoCompleted}
            >
              Trình duyệt không hỗ trợ phát video HTML5.
            </video>
          )}
        </div>

        <div className="video-metadata-bar">
          <div className="video-info-left">
            <span className="video-provider-badge">
              <Play size={11} aria-hidden style={{ fill: 'currentColor' }} />
              {channelAttribution}
            </span>
            <span className="video-license-note">{currentVideo.title || lessonTitle}</span>
          </div>
          <div className="video-info-right">
            {isYouTube && ytId ? (
              <a
                href={`https://www.youtube.com/watch?v=${ytId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-yt-direct-fallback"
                title="Mở xem trực tiếp trên YouTube"
              >
                <ExternalLink size={12} aria-hidden />
                <span>Xem trên YouTube</span>
              </a>
            ) : null}
          </div>
        </div>
      </section>
    )
  }

  // CASE 2: External reference link only (e.g. Khan Academy or official web portal)
  if (effectiveRefUrl && effectiveRefUrl.startsWith('http')) {
    return (
      <div className="lesson-video-container">
        <div className="video-ref-compact-card">
          <div className="video-ref-left">
            <div className="video-ref-icon">
              <Tv size={20} aria-hidden />
            </div>
            <div>
              <h4 className="video-ref-title">Bài giảng tham khảo bên ngoài</h4>
              <p className="video-ref-desc">
                Bài học có tài liệu video tham khảo tại nền tảng đối tác. Bạn có thể mở liên kết hoặc học lý thuyết KaTeX bên dưới.
              </p>
            </div>
          </div>
          <div className="video-ref-actions">
            <a
              href={effectiveRefUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-khan-ref"
              title="Mở bài giảng tham khảo"
            >
              <ExternalLink size={14} aria-hidden />
              <span>Mở bài giảng tham khảo</span>
            </a>
            {onSwitchToTheoryTab && (
              <button
                type="button"
                className="btn-read-theory"
                onClick={onSwitchToTheoryTab}
              >
                <span>Học lý thuyết</span>
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // CASE 3: No video and no reference link -> Smart prioritization of Theory, no large empty frame!
  return null
}

export default LessonVideoPlayer
