import React, { useEffect, useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import { supportService } from '@/services/support.service'
import type { SupportUserProfile } from '@/types/support'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { SummaryStrip } from '@/components/ui/SummaryStrip'
import { SupportUserTable } from './components/users/SupportUserTable'
import { SupportUserCardList } from './components/users/SupportUserCardList'
import '../Admin/AdminPages.css'
import '@/components/admin/AdminComponents.css'
import './SupportPages.css'

export const SupportUsersPage: React.FC = () => {
  const [users, setUsers] = useState<SupportUserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let active = true
    supportService
      .getAllUsers()
      .then((data) => {
        if (active) {
          setUsers(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        console.error(err)
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users
    const q = search.trim().toLowerCase()
    return users.filter(
      (u) =>
        u.displayName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q)
    )
  }, [users, search])

  const totalUsers = users.length
  const syncedCount = users.filter((u) => u.syncState === 'synced').length
  const pendingSyncCount = users.filter((u) => u.syncState !== 'synced').length
  const usersWithTickets = users.filter((u) => u.recentTicketHistory && u.recentTicketHistory.length > 0).length

  const userKPIs = [
    {
      id: 'total',
      label: 'Tổng người dùng',
      value: totalUsers,
      color: 'var(--navy-primary, #102a43)',
    },
    {
      id: 'synced',
      label: 'Đã đồng bộ dữ liệu',
      value: syncedCount,
      color: '#047857',
    },
    {
      id: 'pending',
      label: 'Chờ đồng bộ',
      value: pendingSyncCount,
      color: '#d97706',
    },
    {
      id: 'tickets',
      label: 'Đang có yêu cầu hỗ trợ',
      value: usersWithTickets,
      color: '#0284c7',
    },
  ]

  return (
    <div className="admin-page-container">
      {/* Page Header */}
      <div className="staff-page-header">
        <div className="admin-header-row">
          <div>
            <h1 className="staff-page-title">Tra cứu & Kỹ thuật người dùng</h1>
            <p className="staff-page-desc">
              Kiểm tra trạng thái đồng bộ dữ liệu ngoại tuyến, thông tin tiến trình học tập và lịch sử khiếu nại của học sinh.
            </p>
          </div>
        </div>
      </div>

      {/* 4 KPIs Summary Strip */}
      <SummaryStrip items={userKPIs} ariaLabel="Thống kê nhanh người dùng hỗ trợ" />

      {/* Search & Filter Toolbar */}
      <div className="admin-filter-bar">
        <div className="admin-search-input-wrap" style={{ flex: 1, maxWidth: 480 }}>
          <Search size={16} className="admin-search-icon" />
          <input
            type="text"
            className="admin-search-input"
            placeholder="Tìm theo tên học sinh, email hoặc User ID (VD: usr-101, Minh Anh)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {search && (
          <button
            type="button"
            className="admin-filter-btn-clear"
            onClick={() => setSearch('')}
          >
            Xóa tìm kiếm
          </button>
        )}
      </div>

      {/* Table & Mobile Cards */}
      <div className="staff-table-wrapper has-mobile-cards">
        {loading ? (
          <div style={{ padding: '24px' }}>
            <Skeleton height={48} />
          </div>
        ) : filteredUsers.length === 0 ? (
          <EmptyState
            title="Không tìm thấy người dùng phù hợp"
            description="Hãy thử tìm kiếm với User ID khác hoặc kiểm tra lại chính tả."
          />
        ) : (
          <>
            <SupportUserTable users={filteredUsers} />
            <SupportUserCardList users={filteredUsers} />
          </>
        )}
      </div>
    </div>
  )
}

