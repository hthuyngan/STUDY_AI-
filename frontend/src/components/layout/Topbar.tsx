import { useEffect, useRef, useState } from 'react'
import {
  Bell,
  BookOpen,
  Bot,
  FileText,
  Layers,
  Menu,
  Moon,
  Search,
  Sun,
  X,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { IconButton } from '@/components/ui/IconButton'

export interface TopbarProps {
  onOpenMobileMenu?: () => void
}

interface SearchResult {
  category: 'Bài học' | 'Khóa học' | 'Tài liệu' | 'AI Tutor'
  icon: typeof BookOpen
  title: string
  subtitle: string
  url: string
}

const MOCK_SEARCH_ITEMS: SearchResult[] = [
  {
    category: 'Bài học',
    icon: BookOpen,
    title: 'Khảo sát sự biến thiên và vẽ đồ thị hàm số',
    subtitle: 'Giải tích 12 · Bài 08',
    url: '/learn/math-12/lesson-math-08',
  },
  {
    category: 'Bài học',
    icon: BookOpen,
    title: 'Cực trị của hàm số',
    subtitle: 'Giải tích 12 · Bài 02',
    url: '/learn/math-12/lesson-math-02',
  },
  {
    category: 'Khóa học',
    icon: Layers,
    title: 'Ứng dụng đạo hàm để khảo sát hàm số',
    subtitle: 'Toán 12 · 12 bài học',
    url: '/courses/math-12',
  },
  {
    category: 'Tài liệu',
    icon: FileText,
    title: 'Sổ tay Công thức Đạo hàm & Bảng biến thiên',
    subtitle: 'Thư viện tài liệu 12',
    url: '/library',
  },
  {
    category: 'AI Tutor',
    icon: Bot,
    title: 'Hỏi AI về phương pháp giải tiệm cận đứng',
    subtitle: 'Trợ lý AI giải thích từng bước',
    url: '/ai-tutor?prompt=giai-thich-tiem-can',
  },
]

export function Topbar({ onOpenMobileMenu }: TopbarProps) {
  const navigate = useNavigate()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchDropdownRef = useRef<HTMLDivElement>(null)

  const [query, setQuery] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('study_ai_theme') as 'light' | 'dark') || 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('study_ai_theme', theme)
  }, [theme])

  // Global Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
        setIsSearchOpen(true)
      } else if (e.key === 'Escape') {
        setIsSearchOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchDropdownRef.current &&
        !searchDropdownRef.current.contains(e.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(e.target as Node)
      ) {
        setIsSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  const filteredResults = query.trim()
    ? MOCK_SEARCH_ITEMS.filter(
        (item) =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.subtitle.toLowerCase().includes(query.toLowerCase())
      )
    : MOCK_SEARCH_ITEMS.slice(0, 4)

  const handleSelectResult = (url: string) => {
    setIsSearchOpen(false)
    setQuery('')
    navigate(url)
  }

  return (
    <header className="topbar">
      {/* Left: Mobile hamburger & search */}
      <div className="topbar-left">
        {onOpenMobileMenu && (
          <button
            type="button"
            className="topbar-mobile-btn mobile-only"
            onClick={onOpenMobileMenu}
            aria-label="Mở danh mục menu"
          >
            <Menu size={20} />
          </button>
        )}

        <div className="topbar-search desktop-only" style={{ position: 'relative' }}>
          <Search size={16} className="topbar-search-icon" aria-hidden />
          <input
            ref={searchInputRef}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setIsSearchOpen(true)
            }}
            onFocus={() => setIsSearchOpen(true)}
            className="topbar-search-input"
            placeholder="Tìm bài học, môn học, dạng bài... (⌘K)"
            aria-label="Tìm kiếm nội dung"
          />
          <kbd className="topbar-search-kbd">⌘K</kbd>

          {/* Search dropdown results */}
          {isSearchOpen && (
            <div
              ref={searchDropdownRef}
              className="topbar-search-dropdown scrollbar-clean"
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                right: 0,
                width: '420px',
                background: 'var(--surface-card)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-xl)',
                boxShadow: 'var(--shadow-lg)',
                padding: 'var(--space-2)',
                zIndex: 'var(--z-dropdown)',
                maxHeight: '360px',
                overflowY: 'auto',
              }}
              role="listbox"
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '4px 8px',
                  borderBottom: '1px solid var(--border-subtle)',
                  marginBottom: '4px',
                }}
              >
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                  {query ? 'KẾT QUẢ TÌM KIẾM' : 'GỢI Ý TÌM NHANH'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(false)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text-tertiary)',
                    cursor: 'pointer',
                  }}
                  aria-label="Đóng tìm kiếm"
                >
                  <X size={14} />
                </button>
              </div>

              {filteredResults.length === 0 ? (
                <div
                  style={{
                    padding: 'var(--space-4)',
                    textAlign: 'center',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--text-tertiary)',
                  }}
                >
                  Không tìm thấy kết quả phù hợp.
                </div>
              ) : (
                filteredResults.map((item, idx) => {
                  const ItemIcon = item.icon
                  return (
                    <button
                      key={idx}
                      type="button"
                      className="search-item-btn"
                      onClick={() => handleSelectResult(item.url)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-3)',
                        width: '100%',
                        padding: 'var(--space-2) var(--space-3)',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background-color var(--duration-fast)',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface-sunken)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: 'var(--radius-md)',
                          background: 'var(--surface-sunken)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--color-primary)',
                          flexShrink: 0,
                        }}
                      >
                        <ItemIcon size={14} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0 }}>
                        <span
                          style={{
                            fontSize: 'var(--text-xs)',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {item.title}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                          {item.subtitle}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: '10px',
                          color: 'var(--text-tertiary)',
                          background: 'var(--surface-sunken)',
                          padding: '2px 6px',
                          borderRadius: 'var(--radius-xs)',
                          flexShrink: 0,
                        }}
                      >
                        {item.category}
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="topbar-right">
        {/* Theme toggle */}
        <IconButton
          icon={theme === 'light' ? Moon : Sun}
          label={theme === 'light' ? 'Chuyển sang nền tối' : 'Chuyển sang nền sáng'}
          onClick={toggleTheme}
        />

        {/* Notifications */}
        <IconButton
          icon={Bell}
          label="Thông báo học tập"
          badgeCount={2}
          onClick={() => alert('Thông báo: Bạn có 1 bài tập cần hoàn thành hôm nay để duy trì streak!')}
        />

        {/* User avatar item */}
        <Link to="/profile" className="topbar-user" title="Hồ sơ của bạn">
          <Avatar
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
            alt="Hoàng Thúy Ngân"
            size="sm"
          />
        </Link>
      </div>
    </header>
  )
}
