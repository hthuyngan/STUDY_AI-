import { useState } from 'react'
import {
  BookmarkCheck,
  Check,
  ChevronRight,
  FileText,
  MessageSquare,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useSectionBookmarks } from '@/hooks/useSectionBookmarks'
import { useStudyNotes } from '@/hooks/useStudyNotes'
import './LessonNotesPanel.css'

export interface LessonNotesPanelProps {
  isOpen: boolean
  onClose: () => void
  lessonId: string
  subjectId: string
  lessonTitle: string
  subjectName: string
  sections: Array<{ id: string; title: string }>
  onScrollToSection: (sectionId: string) => void
}

export function LessonNotesPanel({
  isOpen,
  onClose,
  lessonId,
  subjectId,
  lessonTitle,
  subjectName,
  sections,
  onScrollToSection,
}: LessonNotesPanelProps) {
  const [activeTab, setActiveTab] = useState<'notes' | 'bookmarks'>('notes')
  const [selectedSectionId, setSelectedSectionId] = useState<string>('')
  const [newNoteContent, setNewNoteContent] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState<string>('')
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null)

  const {
    notes,
    addNote,
    editNote,
    removeNote,
  } = useStudyNotes(lessonId)

  const {
    bookmarks,
    removeBookmark,
  } = useSectionBookmarks(lessonId)

  if (!isOpen) return null

  // Filter notes by search query
  const filteredNotes = notes.filter((n) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      n.content.toLowerCase().includes(q) ||
      (n.sectionTitle && n.sectionTitle.toLowerCase().includes(q))
    )
  })

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault()
    const content = newNoteContent.trim()
    if (!content) return

    const section = sections.find((s) => s.id === selectedSectionId)

    addNote({
      lessonId,
      subjectId,
      lessonTitle,
      subjectName,
      sectionId: selectedSectionId || undefined,
      sectionTitle: section?.title || undefined,
      content,
    })

    setNewNoteContent('')
  }

  const handleStartEdit = (noteId: string, currentText: string) => {
    setEditingNoteId(noteId)
    setEditContent(currentText)
  }

  const handleSaveEdit = (noteId: string) => {
    const trimmed = editContent.trim()
    if (trimmed) {
      editNote(noteId, trimmed)
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
    <>
      <aside
        className={`lesson-notes-panel ${isOpen ? 'is-open' : ''}`}
        aria-label="Bảng ghi chú bài học"
      >
        <div className="notes-panel-header">
          <div className="notes-panel-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'notes'}
              className={`notes-tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
              onClick={() => setActiveTab('notes')}
            >
              <FileText size={15} aria-hidden />
              <span>Ghi chú ({notes.length})</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'bookmarks'}
              className={`notes-tab-btn ${activeTab === 'bookmarks' ? 'active' : ''}`}
              onClick={() => setActiveTab('bookmarks')}
            >
              <BookmarkCheck size={15} aria-hidden />
              <span>Đoạn lưu ({bookmarks.length})</span>
            </button>
          </div>

          <button
            type="button"
            className="notes-panel-close-btn"
            onClick={onClose}
            aria-label="Đóng bảng ghi chú"
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        {activeTab === 'notes' ? (
          <div className="notes-tab-content">
            {/* Create new note box */}
            <form className="notes-create-form" onSubmit={handleAddNote}>
              <div className="notes-form-row">
                <label htmlFor="notes-section-select" className="sr-only">
                  Gắn vào phần
                </label>
                <select
                  id="notes-section-select"
                  className="notes-section-select"
                  value={selectedSectionId}
                  onChange={(e) => setSelectedSectionId(e.target.value)}
                >
                  <option value="">Gắn vị trí: Toàn bài</option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </div>

              <textarea
                className="notes-textarea"
                rows={3}
                placeholder="Ghi chú nhanh kiến thức, mẹo nhớ hoặc câu hỏi..."
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                aria-label="Nội dung ghi chú"
              />

              <div className="notes-form-footer">
                <span className="notes-hint-text">
                  Không làm thay đổi tiến độ bài học (chuẩn 80/100%)
                </span>
                <Button
                  type="submit"
                  size="sm"
                  variant="primary"
                  icon={Plus}
                  disabled={!newNoteContent.trim()}
                >
                  Lưu
                </Button>
              </div>
            </form>

            {/* Notes Search bar */}
            {notes.length > 2 && (
              <div className="notes-search-box">
                <Search size={14} className="notes-search-icon" aria-hidden />
                <input
                  type="text"
                  placeholder="Tìm trong ghi chú bài này..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="notes-search-input"
                  aria-label="Tìm ghi chú"
                />
              </div>
            )}

            {/* Notes List */}
            <div className="notes-list" tabIndex={0} role="region" aria-label="Danh sách ghi chú">
              {filteredNotes.length === 0 ? (
                <div className="notes-empty-state">
                  <MessageSquare size={28} className="notes-empty-icon" aria-hidden />
                  <p className="notes-empty-title">
                    {searchQuery ? 'Không có ghi chú phù hợp' : 'Chưa có ghi chú nào'}
                  </p>
                  <p className="notes-empty-desc">
                    {searchQuery
                      ? 'Thử tìm với từ khóa khác'
                      : 'Viết lại công thức, ý trọng tâm hoặc thắc mắc để ôn tập sau.'}
                  </p>
                </div>
              ) : (
                filteredNotes.map((note) => (
                  <div key={note.id} className="note-card">
                    {note.sectionTitle && (
                      <div className="note-section-tag-row">
                        <button
                          type="button"
                          className="note-section-jump-tag"
                          onClick={() => {
                            if (note.sectionId) onScrollToSection(note.sectionId)
                          }}
                          title={`Cuộn đến phần: ${note.sectionTitle}`}
                        >
                          <ChevronRight size={12} aria-hidden />
                          <span>{note.sectionTitle}</span>
                        </button>
                      </div>
                    )}

                    {editingNoteId === note.id ? (
                      <div className="note-edit-area">
                        <textarea
                          className="notes-textarea"
                          rows={3}
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          aria-label="Sửa nội dung ghi chú"
                        />
                        <div className="note-edit-actions">
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
                      <>
                        <p className="note-content-text">{note.content}</p>
                        <div className="note-card-footer">
                          <span className="note-date-text">
                            {new Date(note.createdAt).toLocaleTimeString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}{' '}
                            · {new Date(note.createdAt).toLocaleDateString('vi-VN')}
                          </span>
                          <div className="note-actions">
                            <button
                              type="button"
                              className="note-action-btn"
                              onClick={() => handleStartEdit(note.id, note.content)}
                              aria-label="Chỉnh sửa ghi chú"
                            >
                              Sửa
                            </button>
                            <button
                              type="button"
                              className="note-action-btn danger"
                              onClick={() => setDeletingNoteId(note.id)}
                              aria-label="Xóa ghi chú"
                            >
                              <Trash2 size={13} aria-hidden />
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          /* Bookmarks Tab Content */
          <div className="bookmarks-tab-content">
            <div className="bookmarks-list" tabIndex={0} role="region" aria-label="Danh sách đoạn đã lưu">
              {bookmarks.length === 0 ? (
                <div className="notes-empty-state">
                  <BookmarkCheck size={28} className="notes-empty-icon" aria-hidden />
                  <p className="notes-empty-title">Chưa lưu đoạn kiến thức nào</p>
                  <p className="notes-empty-desc">
                    Bấm vào biểu tượng đánh dấu ở đầu mỗi mục kiến thức để lưu và xem lại nhanh tại đây.
                  </p>
                </div>
              ) : (
                bookmarks.map((bm) => (
                  <div key={bm.id} className="bookmark-item-card">
                    <div className="bookmark-item-info">
                      <h4 className="bookmark-item-title">{bm.sectionTitle}</h4>
                      <span className="bookmark-item-date">
                        Đã lưu: {new Date(bm.bookmarkedAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                    <div className="bookmark-item-actions">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => onScrollToSection(bm.sectionId)}
                      >
                        Xem lại
                      </Button>
                      <button
                        type="button"
                        className="bookmark-remove-btn"
                        onClick={() => removeBookmark(bm.lessonId, bm.sectionId)}
                        aria-label={`Bỏ lưu đoạn ${bm.sectionTitle}`}
                      >
                        <Trash2 size={14} aria-hidden />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </aside>

      {/* Backdrop overlay for mobile */}
      <div
        className={`lesson-notes-backdrop ${isOpen ? 'is-visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingNoteId)}
        title="Xác nhận xóa ghi chú"
        description="Bạn có chắc chắn muốn xóa ghi chú này không? Thao tác này không thể hoàn tác."
        confirmText="Xóa ghi chú"
        cancelText="Hủy"
        isDestructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingNoteId(null)}
      />
    </>
  )
}

