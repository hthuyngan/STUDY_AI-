import { useEffect, useState } from 'react'
import { Bookmark, BookmarkCheck, Library, Search } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageErrorState } from '@/components/ui/PageErrorState'
import { Skeleton } from '@/components/ui/Skeleton'
import { useLibrary } from '@/hooks/useSupporting'
import { libraryBookmarkService } from '@/services/libraryBookmark.service'
import type { LibraryItem } from '@/types/supporting'
import './LibraryPage.css'

export function LibraryPage() {
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('all')
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [bookmarkError, setBookmarkError] = useState<string | null>(null)
  const [isBookmarksLoading, setIsBookmarksLoading] = useState(true)

  const { items, isLoading, error, reload } = useLibrary({
    category: activeCategory,
    subjectId: selectedSubject,
    search: searchQuery,
  })

  const loadBookmarks = async () => {
    setIsBookmarksLoading(true)
    setBookmarkError(null)
    try {
      const ids = await libraryBookmarkService.getSavedBookmarkIds()
      setSavedIds(new Set(ids))
    } catch (err: any) {
      setBookmarkError(err?.message || 'Không thể tải danh sách tài liệu đã lưu.')
    } finally {
      setIsBookmarksLoading(false)
    }
  }

  useEffect(() => {
    loadBookmarks()
  }, [])

  const handleToggleSave = async (item: LibraryItem) => {
    const isCurrentlySaved = savedIds.has(item.id)
    const nextSaved = !isCurrentlySaved

    // Optimistically update
    setSavedIds((prev) => {
      const next = new Set(prev)
      if (nextSaved) {
        next.add(item.id)
      } else {
        next.delete(item.id)
      }
      return next
    })

    try {
      await libraryBookmarkService.toggleBookmark(item.id, nextSaved, {
        title: item.title,
        subjectId: item.subjectId,
      })
    } catch {
      // Revert on failure
      setSavedIds((prev) => {
        const next = new Set(prev)
        if (isCurrentlySaved) {
          next.add(item.id)
        } else {
          next.delete(item.id)
        }
        return next
      })
    }
  }

  const categories = ['all', 'Tài liệu', 'Công thức', 'Ghi chú', 'Đã lưu']
  const subjects = [
    { id: 'all', label: 'Tất cả môn' },
    { id: 'math', label: 'Toán học' },
    { id: 'physics', label: 'Vật lý' },
    { id: 'english', label: 'Tiếng Anh' },
  ]

  // Filter items if "Đã lưu" category is active
  const displayedItems = activeCategory === 'Đã lưu'
    ? items.filter((item) => savedIds.has(item.id))
    : items

  if (isLoading || isBookmarksLoading) {
    return (
      <div className="library-page-root">
        <Skeleton variant="text" width={200} height={28} />
        <div className="library-grid">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} variant="rect" width="100%" height={140} />
          ))}
        </div>
      </div>
    )
  }

  if (error || bookmarkError) {
    return (
      <div className="library-page-root">
        <Breadcrumb items={[{ label: 'Thư viện tài liệu' }]} />
        <PageErrorState
          description={error || bookmarkError || 'Đã xảy ra lỗi khi tải dữ liệu.'}
          onRetry={() => {
            reload()
            loadBookmarks()
          }}
        />
      </div>
    )
  }

  return (
    <div className="library-page-root">
      <Breadcrumb items={[{ label: 'Thư viện tài liệu' }]} />

      <div className="page-header-row">
        <div>
          <h1 className="page-title">Thư viện tài liệu & Sổ tay</h1>
          <p className="page-subtitle">Sách tóm tắt công thức, ghi nhớ trọng tâm và đề cương ôn tập</p>
        </div>

        {/* Search */}
        <div className="library-search-box">
          <Search size={16} className="search-icon" aria-hidden />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm tài liệu, công thức..."
            className="library-search-input"
            aria-label="Tìm kiếm tài liệu"
          />
        </div>
      </div>

      {/* Categories Toolbar */}
      <div className="library-toolbar">
        <div className="library-tabs" role="tablist">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`tab-btn ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat === 'all' ? 'Tất cả' : cat}
            </button>
          ))}
        </div>

        <div className="subject-chips">
          {subjects.map((sub) => (
            <button
              key={sub.id}
              type="button"
              className={`chip-btn ${selectedSubject === sub.id ? 'active' : ''}`}
              onClick={() => setSelectedSubject(sub.id)}
            >
              {sub.label}
            </button>
          ))}
        </div>
      </div>

      {/* Library Grid */}
      {displayedItems.length === 0 ? (
        <EmptyState
          icon={Library}
          title="Không tìm thấy tài liệu phù hợp"
          description="Chưa có tài liệu nào trong danh mục hoặc từ khóa tìm kiếm đã chọn."
          actionLabel="Đặt lại bộ lọc"
          onAction={() => {
            setActiveCategory('all')
            setSearchQuery('')
            setSelectedSubject('all')
          }}
        />
      ) : (
        <div className="library-grid">
          {displayedItems.map((item) => {
            const isItemSaved = savedIds.has(item.id)
            return (
              <Card key={item.id} className="library-item-card">
                <div className="library-card-top">
                  <span className="library-cat-badge">{item.category}</span>
                  <span className="library-subject-text">{item.subjectName}</span>
                </div>

                <h2 className="library-item-title">{item.title}</h2>
                <p className="library-item-snippet">{item.snippet}</p>

                <div className="library-card-footer">
                  <span className="library-pages-meta">
                    {item.pagesCount} trang · Cập nhật {item.updatedAt}
                  </span>

                  <Button
                    variant={isItemSaved ? 'secondary' : 'outline'}
                    size="sm"
                    icon={isItemSaved ? BookmarkCheck : Bookmark}
                    onClick={() => handleToggleSave(item)}
                  >
                    {isItemSaved ? 'Đã lưu' : 'Lưu lại'}
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default LibraryPage
