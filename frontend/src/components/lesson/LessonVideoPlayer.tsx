import { ExternalLink, Play, Tv } from 'lucide-react'
import type { LessonVideoMetadata } from '@/types/lesson'
import './LessonVideoPlayer.css'

export interface VideoItemOption {
  id: string
  title: string
  description?: string
  provider: string
  sourceUrl: string
  embedUrl?: string
  youTubeVideoId?: string
  durationSeconds?: number
  thumbnailUrl?: string
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

  // CASE 1: Valid Video to play
  if (currentVideo && (currentVideo.youTubeVideoId || currentVideo.embedUrl)) {
    const isYouTube = currentVideo.provider === 'youtube' || !!currentVideo.youTubeVideoId
    const ytId = currentVideo.youTubeVideoId || (currentVideo.embedUrl?.match(/embed\/([\w-]{11})/)?.[1])

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
              {isYouTube ? 'YouTube GDPT 2018' : 'Bài giảng STUDY_AI'}
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
