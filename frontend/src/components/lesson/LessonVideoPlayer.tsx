import React from 'react'
import { ExternalLink, Tv } from 'lucide-react'
import type { LessonVideoMetadata } from '@/types/lesson'
import './LessonVideoPlayer.css'

export interface LessonVideoPlayerProps {
  video?: LessonVideoMetadata
  lessonTitle: string
  sourceReferenceUrl?: string
  onSwitchToTheoryTab?: () => void
}

export const LessonVideoPlayer: React.FC<LessonVideoPlayerProps> = ({
  video,
  lessonTitle,
  sourceReferenceUrl,
  onSwitchToTheoryTab,
}) => {
  const effectiveRefUrl =
    video?.sourceReferenceUrl ||
    sourceReferenceUrl ||
    'https://vi.khanacademy.org/math/toan-lop-12-viet-nam'

  // Format duration into mm:ss
  const formatDuration = (seconds?: number) => {
    if (!seconds || seconds <= 0) return '00:00'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // 1. YouTube Embed Mode
  if (video?.hasVideo && video?.youtubeId) {
    return (
      <div className="lesson-video-container">
        <div className="video-player-frame">
          <iframe
            className="video-iframe"
            src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?rel=0&modestbranding=1&enablejsapi=1`}
            title={`Video bài giảng: ${lessonTitle}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
        <div className="video-metadata-bar">
          <div className="video-info-left">
            <span className="video-provider-badge">YouTube · Giấy phép mở</span>
            {video.durationSeconds && (
              <span className="video-duration-text">
                Thời lượng: {formatDuration(video.durationSeconds)}
              </span>
            )}
          </div>
          {video.licenseNotice && (
            <span className="video-license-note">{video.licenseNotice}</span>
          )}
        </div>
      </div>
    )
  }

  // 2. Direct HTML5 Video Player Mode (for local/custom licensed videos)
  if (video?.hasVideo && video?.videoUrl) {
    return (
      <div className="lesson-video-container">
        <div className="video-player-frame html5-player">
          <video
            className="video-element"
            src={video.videoUrl}
            controls
            playsInline
          >
            Trình duyệt của bạn không hỗ trợ phát video HTML5.
          </video>
        </div>
        <div className="video-metadata-bar">
          <div className="video-info-left">
            <span className="video-provider-badge">Bài giảng trực tiếp STUDY_AI</span>
            {video.durationSeconds && (
              <span className="video-duration-text">
                Thời lượng: {formatDuration(video.durationSeconds)}
              </span>
            )}
          </div>
          {video.licenseNotice && (
            <span className="video-license-note">{video.licenseNotice}</span>
          )}
        </div>
      </div>
    )
  }

  // 3. Fallback Mode: Video is not licensed for direct embedding / requires Khan Academy link
  return (
    <div className="lesson-video-container">
      <div className="video-player-frame video-fallback-frame">
        <div className="fallback-backdrop-grid" aria-hidden="true" />
        <div className="fallback-content">
          <div className="fallback-badge">
            <Tv size={15} aria-hidden />
            <span>VIDEO THAM KHẢO THEO KHÓA HỌC KHAN ACADEMY</span>
          </div>

          <h3 className="fallback-title">{lessonTitle}</h3>

          <p className="fallback-description">
            Bài giảng này được thiết kế theo cấu trúc khóa học <strong>Toán lớp 12 (Việt Nam)</strong> trên nền tảng Khan Academy. Nhằm tôn trọng bản quyền sở hữu trí tuệ của đơn vị phát hành, video không tải về máy chủ nội bộ.
          </p>

          <div className="fallback-actions">
            <a
              href={effectiveRefUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-khan-ref"
              title="Mở bài giảng chính thức trên Khan Academy"
            >
              <ExternalLink size={16} aria-hidden />
              <span>Xem bài giảng tại Khan Academy</span>
            </a>

            {onSwitchToTheoryTab && (
              <button
                type="button"
                className="btn-read-theory"
                onClick={onSwitchToTheoryTab}
              >
                <span>Đọc lý thuyết & Công thức KaTeX</span>
              </button>
            )}
          </div>

          <div className="fallback-footer-notice">
            <span>
              Lưu ý: Học liệu lý thuyết, công thức KaTeX và bài tập trắc nghiệm bên dưới do STUDY_AI tự biên soạn theo chuẩn GDPT 2018.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
export default LessonVideoPlayer
