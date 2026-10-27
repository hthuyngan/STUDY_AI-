import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { StatusBadge } from '@/components/ui/StatusBadge'

interface ChapterItem {
  id: string
  title: string
  order: number
  lessonsCount: number
}

interface ChapterLessonItem {
  id: string
  title: string
  order: number
  status: 'draft' | 'in-review' | 'published'
  hasAssessment: boolean
  updatedAt: string
}

const MOCK_CHAPTERS: ChapterItem[] = [
  { id: 'ch-01', title: 'Chương 1: Ứng dụng đạo hàm để khảo sát hàm số', order: 1, lessonsCount: 8 },
  { id: 'ch-02', title: 'Chương 2: Hàm số lũy thừa, hàm số mũ và logarit', order: 2, lessonsCount: 6 },
  { id: 'ch-03', title: 'Chương 3: Nguyên hàm, tích phân và ứng dụng', order: 3, lessonsCount: 5 },
  { id: 'ch-04', title: 'Chương 4: Số phức và phương trình bậc hai', order: 4, lessonsCount: 4 },
]

const MOCK_CHAPTER_LESSONS: Record<string, ChapterLessonItem[]> = {
  'ch-01': [
    {
      id: 'lesson-math-01',
      title: 'Sự đồng biến, nghịch biến của hàm số',
      order: 1,
      status: 'published',
      hasAssessment: true,
      updatedAt: '2026-10-20',
    },
    {
      id: 'lesson-math-02',
      title: 'Cực trị của hàm số',
      order: 2,
      status: 'published',
      hasAssessment: true,
      updatedAt: '2026-10-22',
    },
    {
      id: 'lesson-math-08',
      title: 'Khảo sát và vẽ đồ thị hàm phân thức',
      order: 3,
      status: 'published',
      hasAssessment: true,
      updatedAt: '2026-10-27',
    },
    {
      id: 'lesson-math-09',
      title: 'Tiệm cận đứng và tiệm cận ngang của đồ thị hàm số',
      order: 4,
      status: 'in-review',
      hasAssessment: true,
      updatedAt: '2026-10-27',
    },
  ],
}

export function ContentCurriculumPage() {
  const { id: subjectId } = useParams<{ id: string }>()
  const [selectedChapterId, setSelectedChapterId] = useState('ch-01')
  const [chapters] = useState<ChapterItem[]>(MOCK_CHAPTERS)

  const currentLessons = MOCK_CHAPTER_LESSONS[selectedChapterId] || []
  const selectedChapter = chapters.find((c) => c.id === selectedChapterId)

  return (
    <div className="staff-page">
      <div className="staff-page-header">
        <div className="staff-page-title-row">
          <div>
            <nav className="staff-breadcrumbs" aria-label="Breadcrumb">
              <Link to="/content">Nội dung</Link>
              <span>/</span>
              <Link to="/content/subjects">Môn học</Link>
              <span>/</span>
              <span aria-current="page">Quản lý giáo trình: {subjectId?.toUpperCase() || 'TOÁN 12'}</span>
            </nav>
            <h1>Cấu trúc giáo trình môn học</h1>
            <p className="staff-page-desc">
              Phân bổ chương mục, sắp xếp thứ tự giảng dạy và biên tập nội dung bài học.
            </p>
          </div>
          <div className="staff-page-actions">
            <Link to="/content/lessons" className="staff-btn staff-btn-secondary">
              Xem tất cả bài học
            </Link>
          </div>
        </div>
      </div>

      <div className="content-two-column">
        {/* LEFT COLUMN: Chapters */}
        <div className="staff-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 className="staff-card-title" style={{ margin: 0 }}>
              Các chương ({chapters.length})
            </h2>
            <button
              type="button"
              className="staff-btn staff-btn-secondary"
              style={{ fontSize: '12px', padding: '4px 8px' }}
              onClick={() => alert('Thêm chương mới (Tính năng Phase 2)')}
            >
              + Thêm chương
            </button>
          </div>

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
                <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-navy-dark)' }}>
                  {ch.title}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-ink-muted)', marginTop: '4px' }}>
                  {ch.lessonsCount} bài học • Thứ tự #{ch.order}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: Lessons in selected chapter */}
        <div className="staff-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 className="staff-card-title" style={{ margin: 0 }}>
                {selectedChapter ? selectedChapter.title : 'Bài học'}
              </h2>
              <span style={{ fontSize: '13px', color: 'var(--color-ink-muted)' }}>
                {currentLessons.length} bài học trong chương
              </span>
            </div>
            <Link
              to="/content/lessons/new"
              className="staff-btn staff-btn-primary"
              style={{ fontSize: '13px', padding: '6px 12px' }}
            >
              + Thêm bài học mới
            </Link>
          </div>

          {currentLessons.length === 0 ? (
            <p style={{ color: 'var(--color-ink-muted)', fontSize: '14px' }}>Chưa có bài học nào trong chương này.</p>
          ) : (
            <div className="staff-table-wrapper">
              <table className="staff-table">
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Tên bài học</th>
                    <th>Bài thu hoạch</th>
                    <th>Trạng thái</th>
                    <th>Cập nhật</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {currentLessons.map((l) => (
                    <tr key={l.id}>
                      <td style={{ width: '48px', fontWeight: 600 }}>{l.order}</td>
                      <td>
                        <strong style={{ color: 'var(--color-navy-dark)' }}>{l.title}</strong>
                      </td>
                      <td>
                        {l.hasAssessment ? (
                          <span style={{ fontSize: '12px', color: 'var(--color-success, #2b8a3e)' }}>✓ Đã có</span>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--color-ink-muted)' }}>Chưa có</span>
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
                      <td>{l.updatedAt}</td>
                      <td>
                        <Link
                          to={`/content/lessons/${l.id}`}
                          className="staff-btn staff-btn-secondary"
                          style={{ fontSize: '12px', padding: '4px 8px' }}
                        >
                          Chỉnh sửa
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
    </div>
  )
}
