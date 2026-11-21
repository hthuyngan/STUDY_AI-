import { apiClient } from '@/lib/apiClient'
import { getAuthUser } from '@/auth/authSession'

export interface BookmarkRecord {
  id: string
  itemId: string
  subjectId?: string
  createdAt: string
  payload?: string
}

const GUEST_STORAGE_KEY = 'study_ai.guest_library_bookmarks'

function getGuestBookmarks(): string[] {
  try {
    const raw = localStorage.getItem(GUEST_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveGuestBookmarks(ids: string[]): void {
  try {
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(ids))
  } catch {
    // ignore storage quota issues
  }
}

export const libraryBookmarkService = {
  async getSavedBookmarkIds(): Promise<string[]> {
    const user = getAuthUser()
    if (!user) {
      return getGuestBookmarks()
    }

    try {
      const records = await apiClient.get<BookmarkRecord[]>('/api/v1/me/bookmarks')
      return (records || []).map((r) => r.itemId).filter(Boolean)
    } catch {
      // In authenticated state, if API call fails, rethrow fail-closed error
      throw new Error('Không thể tải danh sách tài liệu đã lưu từ máy chủ.')
    }
  },

  async addBookmark(
    itemId: string,
    metadata?: { title?: string; subjectId?: string }
  ): Promise<void> {
    const user = getAuthUser()
    if (!user) {
      const current = getGuestBookmarks()
      if (!current.includes(itemId)) {
        saveGuestBookmarks([...current, itemId])
      }
      return
    }

    await apiClient.post('/api/v1/me/bookmarks', {
      itemId,
      title: metadata?.title,
      subjectId: metadata?.subjectId,
    })
  },

  async removeBookmark(itemId: string): Promise<void> {
    const user = getAuthUser()
    if (!user) {
      const current = getGuestBookmarks()
      saveGuestBookmarks(current.filter((id) => id !== itemId))
      return
    }

    await apiClient.delete(`/api/v1/me/bookmarks/${encodeURIComponent(itemId)}`)
  },

  async toggleBookmark(
    itemId: string,
    willSave: boolean,
    metadata?: { title?: string; subjectId?: string }
  ): Promise<boolean> {
    if (willSave) {
      await this.addBookmark(itemId, metadata)
      return true
    } else {
      await this.removeBookmark(itemId)
      return false
    }
  },
}
