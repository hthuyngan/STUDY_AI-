import { useState } from 'react'
import { ExternalLink, Play, Tv, Video } from 'lucide-react'
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
  video?: LessonVideoMetadata
  videos?: VideoItemOption[]
  lessonTitle: string
  sourceReferenceUrl?: string
  onSwitchToTheoryTab?: () => void
}

export const LessonVideoPlayer: React.FC<LessonVideoPlayerProps> = ({
  video,
  videos,
  lessonTitle,
  sourceReferenceUrl,
  onSwitchToTheoryTab,
}) => {
  // Combine single video and multiple videos list
  const videoList: VideoItemOption[] = []
  if (videos && videos.length > 0) {
    videoList.push(...videos)
  } else if (video?.hasVideo && (video?.youtubeId || video?.videoUrl)) {
    videoList.push({
      id: 'default',
      title: video.licenseNotice || lessonTitle,
      provider: video.provider || 'youtube',
      sourceUrl: video.sourceReferenceUrl || video.videoUrl || '',
      embedUrl: video.videoUrl,
      youTubeVideoId: video.youtubeId,
      durationSeconds: video.durationSeconds,
    })
  }

  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0)
  const currentVideo = videoList[selectedVideoIndex]

  const effectiveRefUrl =
    currentVideo?.sourceUrl ||
    video?.sourceReferenceUrl ||
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
      <div className="lesson-video-container">
        {/* Multi-video selector pills when more than 1 video exists */}
        {videoList.length > 1 && (
          <div className="video-playlist-tabs" role="tablist" aria-label="Danh sách video bài giảng">
            {videoList.map((v, idx) => (
              <button
                key={v.id || idx}
                type="button"
                className={`video-tab-pill ${selectedVideoIndex === idx ? 'active' : ''}`}
                onClick={() => setSelectedVideoIndex(idx)}
                role="tab"
                aria-selected={selectedVideoIndex === idx}
              >
                <Video size={13} aria-hidden />
                <span>Video {idx + 1}: {v.title.length > 35 ? `${v.title.substring(0, 32)}...` : v.title}</span>
                {v.durationSeconds ? <span className="video-tab-duration">({formatDuration(v.durationSeconds)})</span> : null}
              </button>
            ))}
          </div>
        )}

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
            {currentVideo.description ? (
              <span className="video-author-badge" title={currentVideo.description}>
                {currentVideo.description}
              </span>
            ) : null}
            {currentVideo.durationSeconds ? (
              <span className="video-duration-text">
                Thời lượng: {formatDuration(currentVideo.durationSeconds)}
              </span>
            ) : null}
          </div>
          <div className="video-info-right">
            <span className="video-license-note">{currentVideo.title || lessonTitle}</span>
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
      </div>
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
