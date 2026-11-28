import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowUpRight,
  Bot,
  BookmarkCheck,
  Check,
  Edit2,
  FileText,
  Layers,
  MessageSquare,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useSectionBookmarks } from '@/hooks/useSectionBookmarks'
import { useStudyNotes } from '@/hooks/useStudyNotes'
import type { SectionBookmark, StudyNote } from '@/types/studyNotes'
import { learningContextService } from '@/services/learningContext.service'
import { studentWorkspaceService, type StudentMistakeItem } from '@/services/studentWorkspace.service'
import './MyNotesPage.css'

export function MyNotesPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'mistakes' | 'bookmarks' | 'notes'>('mistakes')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [mistakes, setMistakes] = useState<StudentMistakeItem[]>([])
  const [mistakesError, setMistakesError] = useState<string | null>(null)
  const [resolvedIds, setResolvedIds] = useState<Record<string, boolean>>({})

  const loadMistakes = useCallback(() => {
    let active = true
    setMistakesError(null)
    Promise.resolve(studentWorkspaceService.getMistakes()).then((list) => {
      if (active) setMistakes(Array.isArray(list) ? list : [])
    }).catch((err) => {
      if (active) {
        setMistakesError(err instanceof Error ? err.message : 'Không thể tải danh sách bài tập sai.')
      }
    })
    return () => { active = false }
  }, [])

  useEffect(() => loadMistakes(), [loadMistakes])

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState<string>('')
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null)

  const { notes, editNote, removeNote } = useStudyNotes()
  const { bookmarks, removeBookmark } = useSectionBookmarks()

  // Filter notes
  const filteredNotes = useMemo(() => {
    return notes.filter((n: StudyNote) => {
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return (
        n.content.toLowerCase().includes(q) ||
        n.lessonTitle.toLowerCase().includes(q) ||
        (n.sectionTitle && n.sectionTitle.toLowerCase().includes(q)) ||
        n.subjectName.toLowerCase().includes(q)
      )
    })
  }, [notes, searchQuery])

  // Filter bookmarks
  const filteredBookmarks = useMemo(() => {
    return bookmarks.filter((bm: SectionBookmark) => {
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return (
        bm.lessonTitle.toLowerCase().includes(q) ||
        bm.sectionTitle.toLowerCase().includes(q) ||
        bm.subjectName.toLowerCase().includes(q)
      )
    })
  }, [bookmarks, searchQuery])

  const handleOpenLesson = (
    subjectId: string,
    lessonId: string,
    sectionId?: string
  ) => {
    const hash = sectionId ? `#${sectionId}` : ''
    navigate(`/subjects/${subjectId}/lessons/${lessonId}${hash}`)
  }

  
  const handleAskAINote = (note: StudyNote) => {
    learningContextService.setContext({
      source: 'study-note',
      studyNoteId: note.id,
      subjectId: note.subjectId,
      subjectName: note.subjectName,
      lessonId: note.lessonId,
      lessonTitle: note.lessonTitle,
      sectionId: note.sectionId,
      sectionTitle: note.sectionTitle,
      title: note.sectionTitle ? `Ghi chú: ${note.sectionTitle}` : `Ghi chú bài ${note.lessonTitle}`,
      excerpt: note.content,
      returnUrl: '/notes',
    })
    navigate('/ai-tutor')
  }

  const handleStartEdit = (note: StudyNote) => {
    setEditingNoteId(note.id)
    setEditContent(note.content)
  }

  const handleSaveEdit = (noteId: string) => {
    if (editContent.trim()) {
      editNote(noteId, editContent.trim())
    }
    setEditingNoteId(null)
    setEditContent('')
  }

  const handleConfirmDelete = () => {
    if (deletingNoteId) {
      removeNote(deletingNoteId)
      setDeletingNoteId(null)
    }
  }

  return (
    <div className="my-notes-root">
      {/* Breadcrumb */}
      <Breadcrumb items={[{ label: 'Sổ tay học tập' }]} />

      {/* Header Banner */}
      <header className="notes-page-header">
        <div className="notes-header-info">
          <div className="notes-header-tag">
            <Layers size={14} aria-hidden /> SỔ TAY CÁ NHÂN
          </div>
          <h1 className="notes-page-title">Ghi chú & Đoạn kiến thức đã lưu</h1>
          <p className="notes-page-desc">
            Toàn bộ ghi chú bài học, mẹo nhớ công thức và các đoạn kiến thức trọng tâm bạn đã đánh dấu.
          </p>
        </div>

        {/* Stats summary */}
        <div className="notes-stats-cards">
          <div className="stat-pill-card">
            <span className="stat-pill-num">{notes.length}</span>
            <span className="stat-pill-label">Ghi chú bài học</span>
          </div>
          <div className="stat-pill-card">
            <span className="stat-pill-num">{bookmarks.length}</span>
            <span className="stat-pill-label">Đoạn đã lưu</span>
          </div>
        </div>
      </header>

      {/* Toolbar: Tabs & Search & Subject Pills */}
      <div className="notes-filter-toolbar">
        <div className="notes-main-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'mistakes'}
            className={`main-tab-pill ${activeTab === 'mistakes' ? 'active' : ''}`}
            onClick={() => setActiveTab('mistakes')}
          >
            <AlertTriangle size={15} aria-hidden />
            <span>Bài tập sai ({mistakes.length})</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'bookmarks'}
            className={`main-tab-pill ${activeTab === 'bookmarks' ? 'active' : ''}`}
            onClick={() => setActiveTab('bookmarks')}
          >
            <BookmarkCheck size={15} aria-hidden />
            <span>Nội dung đã lưu ({bookmarks.length})</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'notes'}
            className={`main-tab-pill ${activeTab === 'notes' ? 'active' : ''}`}
            onClick={() => setActiveTab('notes')}
          >
            <FileText size={15} aria-hidden />
            <span>Ghi chú cá nhân ({notes.length})</span>
          </button>
        </div>

        {/* Search */}
        <div className="notes-search-wrapper">
          <Search size={15} className="notes-search-ico" aria-hidden />
          <input
            type="text"
            className="notes-search-field"
            placeholder="Tìm theo nội dung, câu sai hoặc bài học Toán 12..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Tìm kiếm trong sổ tay"
          />
        </div>
      </div>

      {/* Content Area */}
      <main className="notes-grid-container">
        {activeTab === 'mistakes' ? (
          mistakesError ? (
            <div className="notes-empty-panel" role="alert">
              <AlertTriangle size={36} className="empty-icon" aria-hidden />
              <h3>Không thể tải danh sách bài tập sai</h3>
              <p>{mistakesError}</p>
              <Button variant="primary" size="sm" onClick={loadMistakes}>
                Thử lại
              </Button>
            </div>
          ) : mistakes.length === 0 ? (
            <div className="notes-empty-panel">
              <AlertTriangle size={36} className="empty-icon" aria-hidden />
              <h3>Chưa có bài tập sai nào</h3>
              <p>Các câu hỏi bạn trả lời sai khi luyện tập hoặc kiểm tra Toán 12 sẽ được tự động lưu tại đây để ôn lại.</p>
              <Button variant="primary" size="sm" onClick={() => navigate('/practice')}>
                Luyện tập Toán 12
              </Button>
            </div>
          ) : (
            <div className="notes-cards-grid">
              {mistakes.filter((m) => !searchQuery.trim() || m.prompt.toLowerCase().includes(searchQuery.toLowerCase())).map((m) => (
                <article key={m.responseId} className="note-notebook-card">
                  <div className="note-card-header">
                    <span className="note-subject-tag">Sai {m.wrongCount} lần</span>
                    {resolvedIds[m.responseId] && <span className="note-subject-tag">Đã khắc phục</span>}
                  </div>
                  <p className="note-card-body"><strong>{m.prompt}</strong></p>
                  <div style={{ fontSize: 13, marginBottom: 8 }}>
                    <div>Đáp án của bạn: <code>{m.studentAnswer || '—'}</code></div>
                    <div>Đáp án đúng: <code>{m.correctAnswer || '—'}</code></div>
                    {m.explanation && <div style={{ marginTop: 4, color: '#475569' }}>{m.explanation}</div>}
                  </div>
                  <div className="note-card-footer">
                    <Button variant="outline" size="sm" onClick={() => navigate('/practice')}>
                      <RotateCcw size={13} /> Làm lại
                    </Button>
                    {!resolvedIds[m.responseId] && (
                      <Button variant="primary" size="sm" onClick={() => setResolvedIds((prev) => ({ ...prev, [m.responseId]: true }))}>
                        <Check size={13} /> Đánh dấu đã khắc phục
                      </Button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )
        ) : activeTab === 'notes' ? (
          filteredNotes.length === 0 ? (
            <div className="notes-empty-panel">
              <MessageSquare size={36} className="empty-icon" aria-hidden />
              <h3 className="empty-title">
                {searchQuery
                  ? 'Không tìm thấy ghi chú phù hợp'
                  : 'Bạn chưa có ghi chú nào'}
              </h3>
              <p className="empty-desc">
                {searchQuery
                  ? 'Thử xóa bộ lọc hoặc tìm kiếm với từ khóa khác.'
                  : 'Trong quá trình đọc bài giảng, hãy bấm "Ghi chú" để lưu lại những điểm quan trọng.'}
              </p>
              <Button
                variant="primary"
                onClick={() => navigate('/subjects/math')}
              >
                Khám phá bài học
              </Button>
            </div>
          ) : (
            <div className="notebook-cards-grid">
              {filteredNotes.map((note) => (
                <div key={note.id} className="notebook-note-card">
                  <div className="note-card-top">
                    <span className="note-subject-badge">{note.subjectName}</span>
                    {note.sectionTitle && (
                      <span className="note-section-badge">
                        Phần: {note.sectionTitle}
                      </span>
                    )}
                  </div>

                  <h3 className="note-lesson-title">{note.lessonTitle}</h3>

                  {editingNoteId === note.id ? (
                    <div className="notebook-edit-box">
                      <textarea
                        className="notebook-edit-textarea"
                        rows={3}
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        aria-label="Sửa ghi chú"
                      />
                      <div className="notebook-edit-actions">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingNoteId(null)}
                        >
                          Hủy
                        </Button>
                        <Button
                          size="sm"
                          variant="primary"
                          icon={Check}
                          onClick={() => handleSaveEdit(note.id)}
                          disabled={!editContent.trim()}
                        >
                          Lưu
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="notebook-note-text">{note.content}</p>
                  )}

                  <div className="notebook-card-footer">
                    <span className="notebook-date">
                      {new Date(note.updatedAt || note.createdAt).toLocaleDateString('vi-VN')}
                    </span>

                    <div className="notebook-actions">
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={ArrowUpRight}
                        onClick={() =>
                          handleOpenLesson(note.subjectId, note.lessonId, note.sectionId)
                        }
                      >
                        Mở bài học
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Bot}
                        onClick={() => handleAskAINote(note)}
                      >
                        Hỏi AI
                      </Button>
                      <button
                        type="button"
                        className="icon-action-btn"
                        onClick={() => handleStartEdit(note)}
                        aria-label="Sửa ghi chú"
                      >
                        <Edit2 size={14} aria-hidden />
                      </button>
                      <button
                        type="button"
                        className="icon-action-btn danger"
                        onClick={() => setDeletingNoteId(note.id)}
                        aria-label="Xóa ghi chú"
                      >
                        <Trash2 size={14} aria-hidden />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* Bookmarks Tab Content */
          filteredBookmarks.length === 0 ? (
            <div className="notes-empty-panel">
              <BookmarkCheck size={36} className="empty-icon" aria-hidden />
              <h3 className="empty-title">
                {searchQuery
                  ? 'Không tìm thấy đoạn kiến thức phù hợp'
                  : 'Bạn chưa lưu đoạn kiến thức nào'}
              </h3>
              <p className="empty-desc">
                {searchQuery
                  ? 'Thử xóa bộ lọc để xem lại tất cả các đoạn đã lưu.'
                  : 'Bấm biểu tượng "Lưu đoạn" bên cạnh các tiêu đề kiến thức trong bài để lưu lại tại đây.'}
              </p>
              <Button
                variant="primary"
                onClick={() => navigate('/subjects/math')}
              >
                Khám phá bài học
              </Button>
            </div>
          ) : (
            <div className="notebook-cards-grid">
              {filteredBookmarks.map((bm) => (
                <div key={bm.id} className="notebook-bookmark-card">
                  <div className="bookmark-top-row">
                    <span className="note-subject-badge">{bm.subjectName}</span>
                    <span className="bookmark-date">
                      Lưu ngày {new Date(bm.bookmarkedAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>

                  <h3 className="bookmark-section-title">{bm.sectionTitle}</h3>
                  <p className="bookmark-lesson-sub">
                    Thuộc bài: <strong>{bm.lessonTitle}</strong>
                  </p>

                  <div className="bookmark-card-footer">
                    <Button
                      size="sm"
                      variant="primary"
                      icon={ArrowUpRight}
                      onClick={() =>
                        handleOpenLesson(bm.subjectId, bm.lessonId, bm.sectionId)
                      }
                    >
                      Xem lại đoạn này
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeBookmark(bm.lessonId, bm.sectionId)}
                    >
                      Bỏ lưu
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </main>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingNoteId)}
        title="Xác nhận xóa ghi chú"
        description="Bạn có chắc chắn muốn xóa vĩnh viễn ghi chú này? Thao tác này sẽ xóa khỏi mọi thiết bị và không thể khôi phục."
        confirmText="Xóa ghi chú"
        cancelText="Hủy"
        isDestructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingNoteId(null)}
      />
    </div>
  )
}

export default MyNotesPage

