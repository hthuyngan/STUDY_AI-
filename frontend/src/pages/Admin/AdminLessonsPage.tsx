import React, { useEffect, useState, useCallback } from 'react'
import {
  FileText,
  Plus,
  Search,
  CheckCircle2,
  X,
  ExternalLink,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Send,
  Globe,
  FileEdit,
  Video,
  Play,
  Eye,
  EyeOff,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { educationService } from '@/services/education.service'
import type {
  CurriculumLessonItem,
  CurriculumSubjectItem,
  CurriculumChapterItem,
  CurriculumTopicItem,
  CurriculumLessonVideoItem,
  ContentStatus,
} from '@/types/education'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import './AdminPages.css'
import '@/components/admin/AdminComponents.css'

export const AdminLessonsPage: React.FC = () => {
  const [lessons, setLessons] = useState<CurriculumLessonItem[]>([])
  const [subjects, setSubjects] = useState<CurriculumSubjectItem[]>([])
  const [chapters, setChapters] = useState<CurriculumChapterItem[]>([])
  const [loading, setLoading] = useState(true)

  // Filters & Pagination
  const [search, setSearch] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [chapterFilter, setChapterFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | ContentStatus>('all')
  const [videoFilter, setVideoFilter] = useState<'all' | 'missing_video' | 'has_video' | 'pending' | 'verified'>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Create Dialog State
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [formTitle, setFormTitle] = useState('')
  const [formSubjectId, setFormSubjectId] = useState('sub_math12')
  const [formChapterId, setFormChapterId] = useState('chp_math12_c1')
  const [formTopicId, setFormTopicId] = useState<string>('')
  const [availableTopics, setAvailableTopics] = useState<CurriculumTopicItem[]>([])
  const [formAuthor, setFormAuthor] = useState('Quản trị viên')
  const [formStatus, setFormStatus] = useState<ContentStatus>('draft')
  const [formError, setFormError] = useState<string | null>(null)

  // Video Management State
  const [videoModalLesson, setVideoModalLesson] = useState<CurriculumLessonItem | null>(null)
  const [videoList, setVideoList] = useState<CurriculumLessonVideoItem[]>([])
  const [videoLoading, setVideoLoading] = useState(false)
  const [newVideoTitle, setNewVideoTitle] = useState('')
  const [newVideoUrl, setNewVideoUrl] = useState('')
  const [newVideoDesc, setNewVideoDesc] = useState('')
  const [newVideoSortOrder, setNewVideoSortOrder] = useState(1)
  const [newVideoPublished, setNewVideoPublished] = useState(true)
  const [videoError, setVideoError] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  // Load available topics when chapter changes
  useEffect(() => {
    if (formChapterId) {
      educationService.getTopics(formChapterId).then((tops) => {
        setAvailableTopics(tops)
        setFormTopicId(tops[0]?.id || '')
      })
    } else {
      setAvailableTopics([])
      setFormTopicId('')
    }
  }, [formChapterId])

  const loadData = useCallback(() => {
    setLoading(true)
    Promise.all([
      educationService.getSubjects(),
      educationService.getChapters(),
      educationService.getLessons({
        subjectId: subjectFilter,
        chapterId: chapterFilter,
        status: statusFilter,
        search,
      }),
    ]).then(([subjList, chList, lList]) => {
      setSubjects(subjList)
      setChapters(chList)
      setLessons(lList)
      setLoading(false)
    })
  }, [subjectFilter, chapterFilter, statusFilter, search])

  useEffect(() => {
    let active = true
    Promise.all([
      educationService.getSubjects(),
      educationService.getChapters(),
      educationService.getLessons({
        subjectId: subjectFilter,
        chapterId: chapterFilter,
        status: statusFilter,
        search,
      }),
    ]).then(([subjList, chList, lList]) => {
      if (active) {
        setSubjects(subjList)
        setChapters(chList)
        setLessons(lList)
        setLoading(false)
      }
    })
    return () => {
      active = false
    }
  }, [subjectFilter, chapterFilter, statusFilter, search])

  // Filter available chapters when form subject changes
  const availableChapters = chapters.filter(
    (c) => formSubjectId === 'all' || c.subjectId === formSubjectId
  )

  const filteredLessons = lessons.filter((l) => {
    const vCount = l.videoCount ?? l.videos?.length ?? 0
    if (videoFilter === 'missing_video') return vCount === 0
    if (videoFilter === 'has_video') return vCount > 0
    if (videoFilter === 'pending') {
      return (l.videos || []).some((v) => v.verificationStatus === 'pending')
    }
    if (videoFilter === 'verified') {
      return (l.videos || []).length > 0 && (l.videos || []).every((v) => v.verificationStatus === 'verified')
    }
    return true
  })

  // Pagination calculation
  const totalCount = filteredLessons.length
  const totalPages = Math.ceil(totalCount / pageSize) || 1
  const paginatedLessons = filteredLessons.slice((page - 1) * pageSize, page * pageSize)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitle.trim()) {
      setFormError('Vui lòng nhập tên bài học.')
      return
    }

    const subj = subjects.find((s) => s.id === formSubjectId)
    const ch = chapters.find((c) => c.id === formChapterId)
    const top = availableTopics.find((t) => t.id === formTopicId)

    await educationService.createLesson({
      title: formTitle.trim(),
      subjectId: formSubjectId,
      subjectName: subj ? subj.name : 'Toán học 12',
      chapterId: formChapterId,
      chapterName: ch ? ch.title : 'Chương 1',
      topicId: formTopicId || undefined,
      topicTitle: top ? top.title : undefined,
      authorName: formAuthor.trim() || 'Quản trị viên',
      status: formStatus,
      hasAssessment: false,
    })

    showToast(`Đã tạo thành công bài học: ${formTitle}`)
    setIsCreateOpen(false)
    setFormTitle('')
    setFormError(null)
    loadData()
  }

  const handleStatusChange = async (id: string, newStatus: ContentStatus, title: string) => {
    await educationService.changeLessonStatus(id, newStatus)
    const statusLabels: Record<ContentStatus, string> = {
      draft: 'Bản nháp',
      'in-review': 'Gửi kiểm duyệt',
      published: 'Đã xuất bản',
      archived: 'Lưu trữ',
    }
    showToast(`Đã chuyển bài "${title}" sang trạng thái: ${statusLabels[newStatus]}`)
    loadData()
  }

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`Bạn có chắc muốn xóa bài học "${title}" khỏi hệ thống?`)) {
      await educationService.deleteLesson(id)
      showToast(`Đã xóa bài học: ${title}`)
      loadData()
    }
  }

  const openVideoModal = async (lesson: CurriculumLessonItem) => {
    setVideoModalLesson(lesson)
    setVideoLoading(true)
    setVideoError(null)
    setNewVideoTitle('')
    setNewVideoUrl('')
    setNewVideoDesc('')
    try {
      const vids = await educationService.getLessonVideos(lesson.id)
      setVideoList(vids)
      setNewVideoSortOrder(vids.length + 1)
    } catch (err: any) {
      setVideoError(err?.message || 'Không thể tải danh sách video.')
    } finally {
      setVideoLoading(false)
    }
  }

  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!videoModalLesson) return
    if (!newVideoTitle.trim() || !newVideoUrl.trim()) {
      setVideoError('Vui lòng nhập đầy đủ tiêu đề và URL video.')
      return
    }
    setVideoLoading(true)
    setVideoError(null)
    try {
      const created = await educationService.addLessonVideo(videoModalLesson.id, {
        title: newVideoTitle.trim(),
        sourceUrl: newVideoUrl.trim(),
        description: newVideoDesc.trim(),
        sortOrder: Number(newVideoSortOrder) || 1,
        isPublished: newVideoPublished,
        embedAllowed: true,
      })
      if (created) {
        showToast(`Đã thêm video: ${newVideoTitle}`)
        const vids = await educationService.getLessonVideos(videoModalLesson.id)
        setVideoList(vids)
        setNewVideoTitle('')
        setNewVideoUrl('')
        setNewVideoDesc('')
        setNewVideoSortOrder(vids.length + 1)
      } else {
        setVideoError('Lỗi thêm video. Vui lòng kiểm tra quyền hoặc kết nối.')
      }
    } catch (err: any) {
      setVideoError(err?.message || 'Lỗi thêm video.')
    } finally {
      setVideoLoading(false)
    }
  }

  const handleDeleteVideo = async (videoId: string, title: string) => {
    if (!videoModalLesson) return
    if (!window.confirm(`Bạn có chắc muốn xóa video "${title}"?`)) return
    try {
      await educationService.deleteLessonVideo(videoId)
      showToast(`Đã xóa video: ${title}`)
      const vids = await educationService.getLessonVideos(videoModalLesson.id)
      setVideoList(vids)
    } catch {
      showToast('Lỗi khi xóa video.')
    }
  }

  const handleToggleVideoPublish = async (v: CurriculumLessonVideoItem) => {
    if (!videoModalLesson) return
    try {
      await educationService.updateLessonVideo(v.id, { isPublished: !v.isPublished })
      showToast(`Đã ${!v.isPublished ? 'xuất bản' : 'ẩn'} video: ${v.title}`)
      const vids = await educationService.getLessonVideos(videoModalLesson.id)
      setVideoList(vids)
    } catch {
      showToast('Lỗi khi cập nhật trạng thái video.')
    }
  }

  return (
    <div className="staff-page">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="admin-toast">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="staff-page-header">
        <div className="admin-header-row">
          <div>
            <div className="admin-prototype-badge">
              <span className="prototype-dot" />
              <span>Dữ liệu mô phỏng · Lưu cục bộ</span>
            </div>
            <h1 className="staff-page-title">Quản lý bài học</h1>
            <p className="staff-page-desc">
              Kiểm soát quy trình biên soạn bài giảng, duyệt nội dung và xuất bản học liệu học tập chuẩn theo chương trình.
            </p>
          </div>
          <div className="admin-header-actions">
            <button
              type="button"
              className="admin-btn-primary"
              onClick={() => {
                setFormSubjectId(subjects[0]?.id || 'math')
                setFormChapterId(chapters[0]?.id || 'ch-01')
                setIsCreateOpen(true)
              }}
              aria-label="Tạo bài học mới"
            >
              <Plus size={16} />
              <span>Tạo bài học</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="admin-toolbar" style={{ marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div className="admin-search-wrap">
          <Search size={16} className="admin-search-icon" />
          <input
            type="search"
            placeholder="Tìm theo tiêu đề bài học hoặc tác giả..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-search-input"
            aria-label="Tìm kiếm bài học"
          />
        </div>

        <div className="admin-filter-group" style={{ flexWrap: 'wrap', gap: '8px' }}>
          {/* Subject Filter */}
          <select
            value={subjectFilter}
            onChange={(e) => {
              setSubjectFilter(e.target.value)
              setChapterFilter('all')
              setPage(1)
            }}
            className="admin-select"
            aria-label="Lọc theo môn"
          >
            <option value="all">Tất cả môn học</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Chapter Filter */}
          <select
            value={chapterFilter}
            onChange={(e) => {
              setChapterFilter(e.target.value)
              setPage(1)
            }}
            className="admin-select"
            aria-label="Lọc theo chương"
          >
            <option value="all">Tất cả chương</option>
            {chapters
              .filter((c) => subjectFilter === 'all' || c.subjectId === subjectFilter)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as 'all' | ContentStatus)
              setPage(1)
            }}
            className="admin-select"
            aria-label="Lọc theo trạng thái"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="published">Đã xuất bản</option>
            <option value="in-review">Đang kiểm duyệt</option>
            <option value="draft">Bản nháp</option>
          </select>

          {/* Video Filter */}
          <select
            value={videoFilter}
            onChange={(e) => {
              setVideoFilter(e.target.value as any)
              setPage(1)
            }}
            className="admin-select"
            aria-label="Lọc theo video"
          >
            <option value="all">Tất cả video</option>
            <option value="has_video">Đã có video</option>
            <option value="missing_video">Chưa có video</option>
            <option value="verified">Video đã xác minh</option>
            <option value="pending">Video chờ duyệt</option>
          </select>

          {/* Page Size */}
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value))
              setPage(1)
            }}
            className="admin-select"
            aria-label="Số bài mỗi trang"
          >
            <option value={10}>10 bài / trang</option>
            <option value={20}>20 bài / trang</option>
            <option value={50}>50 bài / trang</option>
          </select>
        </div>
      </div>

      {/* Lessons Table */}
      {loading ? (
        <div className="admin-table-container">
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ padding: '16px' }}>
              <Skeleton width="100%" height="40px" />
            </div>
          ))}
        </div>
      ) : paginatedLessons.length === 0 ? (
        <EmptyState
          title="Không tìm thấy bài học nào"
          description="Thử thay đổi bộ lọc hoặc tạo bài học mới cho chương trình này."
          icon={FileText}
          actionLabel="Tạo bài học"
          onAction={() => setIsCreateOpen(true)}
        />
      ) : (
        <div className="admin-table-container">
          <table className="admin-table" aria-label="Bảng danh sách bài học">
            <thead>
              <tr>
                <th>Tên bài học</th>
                <th>Môn & Chương học</th>
                <th>Tác giả</th>
                <th>Thu hoạch</th>
                <th>Video</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLessons.map((l) => (
                <tr key={l.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-main, #102a43)' }}>
                      {l.title}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #627d98)', marginTop: '2px' }}>
                      ID: {l.id} · Cập nhật: {new Date(l.updatedAt).toLocaleDateString('vi-VN')}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>{l.subjectName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #627d98)' }}>
                      {l.chapterName}
                    </div>
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>{l.authorName}</td>
                  <td>
                    {l.hasAssessment ? (
                      <span style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 600 }}>
                        ✓ Đã có bài
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #627d98)' }}>
                        Chưa gắn
                      </span>
                    )}
                  </td>
                  <td>
                    {(l.videoCount ?? l.videos?.length ?? 0) > 0 ? (
                      <span
                        className="badge-video-present"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor: '#dcfce7',
                          color: '#15803d',
                        }}
                      >
                        <Play size={10} style={{ fill: 'currentColor' }} />
                        {l.videoCount ?? l.videos?.length} video
                      </span>
                    ) : (
                      <span
                        className="badge-video-missing"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor: '#fee2e2',
                          color: '#b91c1c',
                        }}
                      >
                        ⚠ Thiếu video
                      </span>
                    )}
                  </td>
                  <td>
                    <StatusBadge status={l.status} />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                      {/* Video Management */}
                      <button
                        type="button"
                        className="admin-btn-outline"
                        style={{ color: '#2563eb', fontSize: '0.75rem', padding: '4px 8px' }}
                        onClick={() => openVideoModal(l)}
                        title="Quản lý video bài giảng"
                        aria-label={`Video ${l.title}`}
                      >
                        <Video size={13} />
                        <span>Video</span>
                      </button>

                      {/* Fast status actions */}
                      {l.status !== 'published' && (
                        <button
                          type="button"
                          className="admin-btn-outline"
                          style={{ color: '#047857', fontSize: '0.75rem', padding: '4px 8px' }}
                          onClick={() => handleStatusChange(l.id, 'published', l.title)}
                          title="Xuất bản ngay"
                          aria-label={`Xuất bản ${l.title}`}
                        >
                          <Globe size={13} />
                          <span>Xuất bản</span>
                        </button>
                      )}
                      {l.status === 'draft' && (
                        <button
                          type="button"
                          className="admin-btn-outline"
                          style={{ color: '#b45309', fontSize: '0.75rem', padding: '4px 8px' }}
                          onClick={() => handleStatusChange(l.id, 'in-review', l.title)}
                          title="Gửi kiểm duyệt"
                          aria-label={`Gửi duyệt ${l.title}`}
                        >
                          <Send size={13} />
                          <span>Gửi duyệt</span>
                        </button>
                      )}
                      {l.status === 'published' && (
                        <button
                          type="button"
                          className="admin-btn-outline"
                          style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                          onClick={() => handleStatusChange(l.id, 'draft', l.title)}
                          title="Thu về bản nháp"
                          aria-label={`Chuyển nháp ${l.title}`}
                        >
                          <FileEdit size={13} />
                          <span>Về nháp</span>
                        </button>
                      )}

                      {/* Open Editor */}
                      <Link
                        to={`/content/lessons/${l.id}`}
                        className="admin-btn-outline"
                        style={{ padding: '4px 8px' }}
                        title="Mở giao diện soạn thảo bài học"
                        aria-label={`Soạn thảo ${l.title}`}
                      >
                        <ExternalLink size={13} />
                      </Link>

                      {/* Delete */}
                      <button
                        type="button"
                        className="admin-btn-outline"
                        onClick={() => handleDelete(l.id, l.title)}
                        title="Xóa bài học"
                        aria-label={`Xóa ${l.title}`}
                        style={{ color: '#dc2626', padding: '4px 8px' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination Bar */}
          <div className="admin-pagination-bar">
            <div>
              Hiển thị <strong>{(page - 1) * pageSize + 1}</strong> -{' '}
              <strong>{Math.min(page * pageSize, totalCount)}</strong> trên tổng số{' '}
              <strong>{totalCount}</strong> bài học
            </div>
            <div className="admin-pagination-controls">
              <button
                type="button"
                className="admin-page-btn"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                aria-label="Trang trước"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`admin-page-btn ${p === page ? 'active' : ''}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                className="admin-page-btn"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                aria-label="Trang sau"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Lesson Dialog */}
      {isCreateOpen && (
        <div className="admin-dialog-backdrop" onClick={() => setIsCreateOpen(false)}>
          <div
            className="admin-dialog-card admin-form-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-lesson-title"
          >
            <div className="admin-dialog-header">
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className="admin-form-icon-wrap">
                  <FileText size={16} />
                </span>
                <h2 id="dialog-lesson-title" className="admin-dialog-title">
                  Tạo bài học mới
                </h2>
              </div>
              <button
                type="button"
                className="admin-dialog-close"
                onClick={() => setIsCreateOpen(false)}
                aria-label="Đóng"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div className="admin-dialog-body admin-form-body">
                {formError && (
                  <div
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: 'rgba(220, 38, 38, 0.1)',
                      color: '#dc2626',
                      fontSize: '0.82rem',
                    }}
                  >
                    {formError}
                  </div>
                )}

                <div className="admin-form-group">
                  <label htmlFor="form-lesson-name" className="admin-form-label">
                    Tên bài học *
                  </label>
                  <input
                    id="form-lesson-name"
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Ví dụ: Cực trị của hàm số, Định luật Ôm..."
                    className="admin-input"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="admin-form-group">
                    <label htmlFor="form-lesson-subj" className="admin-form-label">
                      Môn học *
                    </label>
                    <select
                      id="form-lesson-subj"
                      value={formSubjectId}
                      onChange={(e) => {
                        const newSubj = e.target.value
                        setFormSubjectId(newSubj)
                        const firstCh = chapters.find((c) => c.subjectId === newSubj)
                        if (firstCh) setFormChapterId(firstCh.id)
                      }}
                      className="admin-select"
                      style={{ width: '100%' }}
                    >
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="admin-form-group">
                    <label htmlFor="form-lesson-ch" className="admin-form-label">
                      Chương học *
                    </label>
                    <select
                      id="form-lesson-ch"
                      value={formChapterId}
                      onChange={(e) => setFormChapterId(e.target.value)}
                      className="admin-select"
                      style={{ width: '100%' }}
                    >
                      {availableChapters.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="admin-form-group">
                  <label htmlFor="form-lesson-topic" className="admin-form-label">
                    Chủ đề (Topics)
                  </label>
                  <select
                    id="form-lesson-topic"
                    value={formTopicId}
                    onChange={(e) => setFormTopicId(e.target.value)}
                    className="admin-select"
                    style={{ width: '100%' }}
                  >
                    <option value="">-- Không chọn / Bài học trực thuộc chương --</option>
                    {availableTopics.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="admin-form-group">
                    <label htmlFor="form-lesson-author" className="admin-form-label">
                      Tác giả / Giáo viên biên soạn
                    </label>
                    <input
                      id="form-lesson-author"
                      type="text"
                      value={formAuthor}
                      onChange={(e) => setFormAuthor(e.target.value)}
                      className="admin-input"
                    />
                  </div>

                  <div className="admin-form-group">
                    <label htmlFor="form-lesson-status" className="admin-form-label">
                      Trạng thái ban đầu
                    </label>
                    <select
                      id="form-lesson-status"
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as ContentStatus)}
                      className="admin-select"
                      style={{ width: '100%' }}
                    >
                      <option value="draft">Bản nháp (Draft)</option>
                      <option value="in-review">Gửi duyệt (In-review)</option>
                      <option value="published">Xuất bản ngay (Published)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="admin-dialog-footer">
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="admin-btn-primary">
                  Tạo bài học
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Video Management Modal */}
      {videoModalLesson && (
        <div className="admin-dialog-backdrop" onClick={() => setVideoModalLesson(null)}>
          <div
            className="admin-dialog-card admin-form-dialog"
            style={{ maxWidth: '680px', width: '92%' }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="admin-dialog-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="admin-form-icon-wrap" style={{ color: '#2563eb', background: '#eff6ff' }}>
                  <Video size={18} />
                </span>
                <div>
                  <h2 className="admin-dialog-title">Quản lý Video bài giảng</h2>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #627d98)' }}>
                    Bài học: <strong>{videoModalLesson.title}</strong>
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="admin-dialog-close"
                onClick={() => setVideoModalLesson(null)}
                aria-label="Đóng"
              >
                <X size={16} />
              </button>
            </div>

            <div className="admin-dialog-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {videoError && (
                <div style={{ padding: '8px 12px', borderRadius: '6px', background: '#fef2f2', color: '#dc2626', fontSize: '0.82rem', marginBottom: '12px' }}>
                  {videoError}
                </div>
              )}

              {/* Add New Video Form */}
              <form onSubmit={handleAddVideo} style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '18px' }}>
                <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: '10px', color: '#1e293b' }}>
                  + Thêm Video bài giảng mới (YouTube / HLS)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <div>
                    <label className="admin-form-label" style={{ fontSize: '0.78rem' }}>Tiêu đề Video *</label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Lý thuyết trọng tâm Đạo hàm"
                      value={newVideoTitle}
                      onChange={(e) => setNewVideoTitle(e.target.value)}
                      className="admin-input"
                      style={{ fontSize: '0.82rem' }}
                    />
                  </div>
                  <div>
                    <label className="admin-form-label" style={{ fontSize: '0.78rem' }}>Link YouTube / URL *</label>
                    <input
                      type="url"
                      required
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={newVideoUrl}
                      onChange={(e) => setNewVideoUrl(e.target.value)}
                      className="admin-input"
                      style={{ fontSize: '0.82rem' }}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label className="admin-form-label" style={{ fontSize: '0.78rem' }}>Mô tả ngắn (tùy chọn)</label>
                  <input
                    type="text"
                    placeholder="VD: Thầy Phạm Tuấn giảng chi tiết các dạng bài..."
                    value={newVideoDesc}
                    onChange={(e) => setNewVideoDesc(e.target.value)}
                    className="admin-input"
                    style={{ fontSize: '0.82rem' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={newVideoPublished}
                        onChange={(e) => setNewVideoPublished(e.target.checked)}
                      />
                      <span>Xuất bản ngay</span>
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem' }}>
                      <span>Thứ tự:</span>
                      <input
                        type="number"
                        min="1"
                        value={newVideoSortOrder}
                        onChange={(e) => setNewVideoSortOrder(Number(e.target.value))}
                        style={{ width: '50px', padding: '2px 6px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="admin-btn-primary"
                    disabled={videoLoading}
                    style={{ fontSize: '0.82rem', padding: '6px 12px' }}
                  >
                    {videoLoading ? 'Đang lưu...' : 'Thêm video'}
                  </button>
                </div>
              </form>

              {/* Current Videos List */}
              <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: '8px', color: '#1e293b' }}>
                Danh sách video ({videoList.length})
              </div>
              {videoLoading && videoList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>Đang tải video...</div>
              ) : videoList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', background: '#f1f5f9', borderRadius: '6px', color: '#64748b', fontSize: '0.82rem' }}>
                  Bài học này chưa có video nào. Hãy dán link YouTube ở trên để thêm video.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {videoList.map((v) => (
                    <div
                      key={v.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        gap: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '6px',
                            background: '#0284c7',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            flexShrink: 0,
                          }}
                        >
                          <Play size={18} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {v.title}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#64748b', display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span>Thứ tự: {v.sortOrder}</span>
                            <span>•</span>
                            <span style={{ color: v.isPublished ? '#059669' : '#d97706', fontWeight: 500 }}>
                              {v.isPublished ? 'Đã xuất bản' : 'Bản nháp'}
                            </span>
                            {v.youTubeVideoId && (
                              <>
                                <span>•</span>
                                <span>YT: {v.youTubeVideoId}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        <button
                          type="button"
                          className="admin-btn-outline"
                          style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                          onClick={() => handleToggleVideoPublish(v)}
                          title={v.isPublished ? 'Ẩn video' : 'Xuất bản video'}
                        >
                          {v.isPublished ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                        <a
                          href={v.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="admin-btn-outline"
                          style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                          title="Mở link ngoài"
                        >
                          <ExternalLink size={13} />
                        </a>
                        <button
                          type="button"
                          className="admin-btn-outline"
                          style={{ color: '#dc2626', padding: '4px 8px', fontSize: '0.75rem' }}
                          onClick={() => handleDeleteVideo(v.id, v.title)}
                          title="Xóa video"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="admin-dialog-footer">
              <button
                type="button"
                className="admin-btn-secondary"
                onClick={() => setVideoModalLesson(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
