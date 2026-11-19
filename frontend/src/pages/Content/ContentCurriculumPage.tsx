import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { BookOpen, ChevronRight, Layers, ArrowRight, AlertCircle, RefreshCw } from 'lucide-react'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Skeleton } from '@/components/ui/Skeleton'
import { educationService } from '@/services/education.service'
import type { CurriculumChapterItem, CurriculumLessonItem, CurriculumSubjectItem } from '@/types/education'

export function ContentCurriculumPage() {
  const { id: routeSubjectId } = useParams<{ id: string }>()
  const [subject, setSubject] = useState<CurriculumSubjectItem | null>(null)
  const [chapters, setChapters] = useState<CurriculumChapterItem[]>([])
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null)
  const [lessons, setLessons] = useState<CurriculumLessonItem[]>([])

  const [loading, setLoading] = useState(true)
  const [lessonsLoading, setLessonsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 1. Load Subject & Chapters
  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    async function loadSubjectAndChapters() {
      try {
        let currentSubject: CurriculumSubjectItem | undefined
        let targetSubjectId = routeSubjectId

        if (targetSubjectId) {
          currentSubject = await educationService.getSubjectById(targetSubjectId)
        }

        if (!currentSubject) {
          const allSubjects = await educationService.getSubjects()
          if (allSubjects.length > 0) {
            const queryId = targetSubjectId
            currentSubject = queryId
              ? allSubjects.find((s) => s.id === queryId || s.code.toLowerCase() === queryId.toLowerCase())
              : allSubjects[0]
            if (!currentSubject) currentSubject = allSubjects[0]
            targetSubjectId = currentSubject.id
          }
        }

        if (!active) return

        if (!currentSubject || !targetSubjectId) {
          setError('Không tìm thấy thông tin môn học.')
          setLoading(false)
          return
        }

        setSubject(currentSubject)

        const chs = await educationService.getChapters(targetSubjectId)
        if (!active) return

        setChapters(chs)
        if (chs.length > 0) {
          setSelectedChapterId(chs[0].id)
        } else {
          setSelectedChapterId(null)
          setLessons([])
        }
      } catch (err: any) {
        if (!active) return
        setError(err?.message || 'Không thể tải cấu trúc giáo trình môn học.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadSubjectAndChapters()
    return () => {
      active = false
    }
  }, [routeSubjectId])

  // 2. Load Lessons when selectedChapterId changes
  useEffect(() => {
    let active = true
    if (!selectedChapterId) {
      setLessons([])
      return
    }

    setLessonsLoading(true)
    const effectiveSubjectId = subject?.id || routeSubjectId

    educationService
      .getLessons({
        subjectId: effectiveSubjectId,
        chapterId: selectedChapterId,
      })
      .then((lList) => {
        if (active) {
          setLessons(lList)
          setLessonsLoading(false)
        }
      })
      .catch((_err: any) => {
        if (active) {
          setLessons([])
          setLessonsLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [selectedChapterId, subject?.id, routeSubjectId])

  const selectedChapter = chapters.find((c) => c.id === selectedChapterId)
  const effectiveSubjectId = subject?.id || routeSubjectId || 'math'

  return (
    <div className="staff-page" role="main" aria-label="Cấu trúc giáo trình môn học">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" style={{ marginBottom: '16px' }}>
        <ol style={{ display: 'flex', alignItems: 'center', gap: '6px', listStyle: 'none', margin: 0, padding: 0, fontSize: '13px' }}>
          <li>
            <Link to="/content/subjects" style={{ color: '#6366f1', textDecoration: 'none' }}>
              Quản lý môn học
            </Link>
          </li>
          <li>
            <ChevronRight size={14} color="#94a3b8" />
          </li>
          <li style={{ color: '#475569', fontWeight: 600 }}>
            {subject ? `${subject.name} (${subject.grade || 'Lớp 12'})` : 'Giáo trình môn học'}
          </li>
        </ol>
      </nav>

      <div className="staff-page-header">
        <div className="staff-page-title-row">
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Layers size={24} color="#6366f1" />
              <span>{subject ? `Giáo trình ${subject.name}` : 'Cấu trúc giáo trình môn học'}</span>
            </h1>
            <p className="staff-page-desc">
              {subject?.description || 'Phân bổ chương mục, sắp xếp thứ tự giảng dạy và biên tập nội dung bài học.'}
            </p>
          </div>
          <div className="staff-page-actions" style={{ display: 'flex', gap: '8px' }}>
            <Link to={`/content/chapters?subjectId=${effectiveSubjectId}`} className="staff-btn staff-btn-secondary">
              Quản lý chương học
            </Link>
            <Link to={`/content/lessons?subjectId=${effectiveSubjectId}`} className="staff-btn staff-btn-primary">
              Xem tất cả bài học
            </Link>
          </div>
        </div>
      </div>

      {error ? (
        <div className="staff-card" style={{ padding: '32px', textAlign: 'center', border: '1px solid #fee2e2', background: '#fff5f5' }}>
          <AlertCircle size={36} color="#ef4444" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ color: '#991b1b', marginBottom: '8px' }}>Lỗi tải dữ liệu giáo trình</h3>
          <p style={{ color: '#7f1d1d', fontSize: '14px', marginBottom: '16px' }}>{error}</p>
          <button
            type="button"
            className="staff-btn staff-btn-primary"
            onClick={() => window.location.reload()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} />
            <span>Thử lại</span>
          </button>
        </div>
      ) : loading ? (
        <div className="content-two-column">
          <div className="staff-card">
            <Skeleton style={{ height: '32px', marginBottom: '16px' }} />
            <Skeleton style={{ height: '56px', marginBottom: '8px' }} />
            <Skeleton style={{ height: '56px', marginBottom: '8px' }} />
            <Skeleton style={{ height: '56px' }} />
          </div>
          <div className="staff-card">
            <Skeleton style={{ height: '32px', marginBottom: '16px' }} />
            <Skeleton style={{ height: '140px' }} />
          </div>
        </div>
      ) : (
        <div className="content-two-column">
          {/* LEFT COLUMN: Chapters */}
          <div className="staff-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 className="staff-card-title" style={{ margin: 0 }}>
                Các chương ({chapters.length})
              </h2>
              <Link
                to={`/content/chapters?subjectId=${effectiveSubjectId}`}
                className="staff-btn staff-btn-secondary"
                style={{ fontSize: '12px', padding: '4px 8px' }}
              >
                + Quản lý chương
              </Link>
            </div>

            {chapters.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
                <p>Môn học này chưa có chương nào.</p>
                <Link
                  to={`/content/chapters?subjectId=${effectiveSubjectId}`}
                  className="staff-btn staff-btn-primary"
                  style={{ display: 'inline-block', marginTop: '8px', fontSize: '13px' }}
                >
                  Tạo chương đầu tiên
                </Link>
              </div>
            ) : (
              <div>
                {chapters.map((ch) => (
                  <div
                    key={ch.id}
                    className={`curriculum-chapter-item ${ch.id === selectedChapterId ? 'active' : ''}`}
                    onClick={() => setSelectedChapterId(ch.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') setSelectedChapterId(ch.id)
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-navy-dark, #1e293b)' }}>
                      {ch.title}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                      {ch.lessonsCount || 0} bài học &bull; Thứ tự #{ch.order}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Lessons in selected chapter */}
          <div className="staff-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 className="staff-card-title" style={{ margin: 0 }}>
                  {selectedChapter ? selectedChapter.title : 'Danh sách bài học'}
                </h2>
                <span style={{ fontSize: '13px', color: '#64748b' }}>
                  {lessons.length} bài học trong chương
                </span>
              </div>
              <Link
                to={`/content/lessons?subjectId=${effectiveSubjectId}&chapterId=${selectedChapterId || ''}`}
                className="staff-btn staff-btn-primary"
                style={{ fontSize: '13px', padding: '6px 12px' }}
              >
                + Thêm / Quản lý bài học
              </Link>
            </div>

            {lessonsLoading ? (
              <div>
                <Skeleton style={{ height: '40px', marginBottom: '8px' }} />
                <Skeleton style={{ height: '40px', marginBottom: '8px' }} />
                <Skeleton style={{ height: '40px' }} />
              </div>
            ) : lessons.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
                <BookOpen size={32} color="#cbd5e1" style={{ margin: '0 auto 8px' }} />
                <p>Chưa có bài học nào trong chương này.</p>
                {selectedChapter && (
                  <Link
                    to={`/content/lessons?subjectId=${effectiveSubjectId}&chapterId=${selectedChapter.id}`}
                    className="staff-btn staff-btn-secondary"
                    style={{ display: 'inline-block', marginTop: '8px', fontSize: '12px' }}
                  >
                    Soạn bài học cho chương này
                  </Link>
                )}
              </div>
            ) : (
              <div className="staff-table-wrapper">
                <table className="staff-table">
                  <thead>
                    <tr>
                      <th style={{ width: '48px' }}>STT</th>
                      <th>Tên bài học</th>
                      <th>Bài thu hoạch</th>
                      <th>Trạng thái</th>
                      <th>Cập nhật</th>
                      <th style={{ width: '100px' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lessons.map((l) => (
                      <tr key={l.id}>
                        <td style={{ width: '48px', fontWeight: 600, textAlign: 'center' }}>{l.order}</td>
                        <td>
                          <strong style={{ color: '#1e293b' }}>{l.title}</strong>
                        </td>
                        <td>
                          {l.hasAssessment ? (
                            <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600 }}>✓ Đã có</span>
                          ) : (
                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Chưa có</span>
                          )}
                        </td>
                        <td>
                          <StatusBadge
                            status={l.status}
                            label={
                              l.status === 'published'
                                ? 'Đã xuất bản'
                                : l.status === 'in-review'
                                  ? 'Chờ duyệt'
                                  : 'Bản nháp'
                            }
                          />
                        </td>
                        <td style={{ fontSize: '12px', color: '#64748b' }}>
                          {l.updatedAt ? new Date(l.updatedAt).toLocaleDateString('vi-VN') : '—'}
                        </td>
                        <td>
                          <Link
                            to={`/content/lessons?subjectId=${effectiveSubjectId}&chapterId=${l.chapterId}&search=${encodeURIComponent(l.title)}`}
                            className="staff-btn staff-btn-secondary"
                            style={{ fontSize: '12px', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <span>Quản lý</span>
                            <ArrowRight size={12} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
