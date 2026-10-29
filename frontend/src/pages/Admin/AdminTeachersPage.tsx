import React, { useEffect, useState, useCallback, useMemo } from 'react'
import {
  GraduationCap,
  Plus,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { educationService } from '@/services/education.service'
import type { AdminTeacherItem } from '@/types/education'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { StaffPagination } from '@/components/staff/StaffPagination'
import {
  TeacherSummaryStrip,
  TeacherToolbar,
  TeacherTable,
  TeacherCardList,
  TeacherDetailDrawer,
  CreateTeacherModal,
  ChangeTeachingStatusModal,
  type TeacherFilterValues,
  type TeacherSort,
  type TeacherSortField,
  type TeacherSummaryKPIs,
} from './components/teachers'
import './components/teachers/teacher-management.css'
import './AdminPages.css'
import '@/components/admin/AdminComponents.css'

export const AdminTeachersPage: React.FC = () => {
  const [teachers, setTeachers] = useState<AdminTeacherItem[]>([])
  const [loading, setLoading] = useState(true)
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null)

  // 1. Filter state
  const [filters, setFilters] = useState<TeacherFilterValues>({
    search: '',
    subject: 'all',
    status: 'all',
    accountStatus: 'all',
  })

  // 2. Pagination state (default: 10 per page)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  // 3. Sorting state (default: name asc)
  const [sort, setSort] = useState<TeacherSort>({
    field: 'name',
    direction: 'asc',
  })

  // 4. Multi-select state
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // 5. Drawer & Modals state
  const [selectedTeacher, setSelectedTeacher] = useState<AdminTeacherItem | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [statusTargetTeacher, setStatusTargetTeacher] = useState<AdminTeacherItem | null>(null)
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
  const [lockTargetTeacher, setLockTargetTeacher] = useState<AdminTeacherItem | null>(null)
  const [isConfirmLockOpen, setIsConfirmLockOpen] = useState(false)

  // 6. KPIs state
  const [kpis, setKpis] = useState<TeacherSummaryKPIs>({
    totalTeachers: 0,
    activeTeaching: 0,
    pendingOrLeave: 0,
    newTeachers: 0,
  })

  const showToast = (msg: string) => {
    setFeedbackToast(msg)
    setTimeout(() => setFeedbackToast(null), 3500)
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [allTeachers, summaryKPIs] = await Promise.all([
        educationService.getTeachers(),
        educationService.getTeacherKPIs(),
      ])
      setTeachers(allTeachers)
      setKpis(summaryKPIs)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    const init = async () => {
      try {
        const [allTeachers, summaryKPIs] = await Promise.all([
          educationService.getTeachers(),
          educationService.getTeacherKPIs(),
        ])
        if (mounted) {
          setTeachers(allTeachers)
          setKpis(summaryKPIs)
          setLoading(false)
        }
      } catch {
        if (mounted) setLoading(false)
      }
    }
    init()
    return () => {
      mounted = false
    }
  }, [])

  // Filtered & Sorted teachers
  const filteredTeachers = useMemo(() => {
    let result = [...teachers]

    // Search filter
    if (filters.search.trim()) {
      const q = filters.search.trim().toLowerCase()
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.email.toLowerCase().includes(q) ||
          (t.classes && t.classes.some((c) => c.toLowerCase().includes(q)))
      )
    }

    // Subject filter
    if (filters.subject !== 'all') {
      result = result.filter((t) =>
        t.subject.toLowerCase().includes(filters.subject.toLowerCase())
      )
    }

    // Status filter
    if (filters.status !== 'all') {
      result = result.filter((t) => t.status === filters.status)
    }

    // Account status filter
    if (filters.accountStatus !== 'all') {
      result = result.filter((t) => (t.accountStatus || 'ACTIVE') === filters.accountStatus)
    }

    // Sort
    result.sort((a, b) => {
      let valA: string | number = a[sort.field] ?? ''
      let valB: string | number = b[sort.field] ?? ''

      if (typeof valA === 'string') valA = valA.toLowerCase()
      if (typeof valB === 'string') valB = valB.toLowerCase()

      if (valA < valB) return sort.direction === 'asc' ? -1 : 1
      if (valA > valB) return sort.direction === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [teachers, filters, sort])

  // Pagination slice
  const totalItems = filteredTeachers.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const paginatedTeachers = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredTeachers.slice(start, start + pageSize)
  }, [filteredTeachers, currentPage, pageSize])

  // Reset page when filters change
  const handleFilterChange = (newFilters: TeacherFilterValues) => {
    setFilters(newFilters)
    setCurrentPage(1)
  }

  const handleResetFilters = () => {
    setFilters({
      search: '',
      subject: 'all',
      status: 'all',
      accountStatus: 'all',
    })
    setCurrentPage(1)
  }

  // Sorting
  const handleSortChange = (field: TeacherSortField) => {
    setSort((prev) => {
      if (prev.field === field) {
        return { field, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      }
      return { field, direction: 'asc' }
    })
  }

  // Multi-select
  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(paginatedTeachers.map((t) => t.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleToggleSelectTeacher = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id])
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id))
    }
  }

  // Drawer interactions
  const handleSelectTeacher = (teacher: AdminTeacherItem) => {
    setSelectedTeacher(teacher)
    setIsDrawerOpen(true)
  }

  const handleEditTeacher = (teacher: AdminTeacherItem) => {
    setSelectedTeacher(teacher)
    setIsDrawerOpen(true)
  }

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false)
  }

  const handleSaveEdit = async (id: string, updates: Partial<AdminTeacherItem>) => {
    const updated = await educationService.updateTeacher(id, updates)
    setTeachers((prev) => prev.map((t) => (t.id === id ? updated : t)))
    setSelectedTeacher(updated)
    showToast(`Đã cập nhật hồ sơ giáo viên "${updated.name}" thành công`)
    loadData()
  }

  // Create Modal
  const handleCreateTeacher = async (data: {
    name: string
    email: string
    phone: string
    subject: string
    classes: string[]
    qualifications: string
    experienceYears: number
    status: 'active' | 'pending' | 'inactive'
    bio: string
  }) => {
    const created = await educationService.saveTeacher(data)
    setTeachers((prev) => [created, ...prev])
    showToast(`Đã thêm thành công giáo viên mới "${created.name}"`)
    loadData()
  }

  // Change Teaching Status
  const handleOpenTeachingStatusModal = (teacher: AdminTeacherItem) => {
    setStatusTargetTeacher(teacher)
    setIsStatusModalOpen(true)
  }

  const handleConfirmTeachingStatus = async (
    teacherId: string,
    newStatus: 'active' | 'pending' | 'inactive'
  ) => {
    const updated = await educationService.setTeacherStatus(teacherId, newStatus)
    setTeachers((prev) => prev.map((t) => (t.id === teacherId ? updated : t)))
    if (selectedTeacher?.id === teacherId) {
      setSelectedTeacher(updated)
    }
    showToast(`Đã cập nhật trạng thái giảng dạy cho giáo viên "${updated.name}"`)
    loadData()
  }

  // Lock / Unlock Account
  const handleOpenLockConfirm = (teacher: AdminTeacherItem) => {
    setLockTargetTeacher(teacher)
    setIsConfirmLockOpen(true)
  }

  const handleConfirmLockToggle = async () => {
    if (!lockTargetTeacher) return
    const updated = await educationService.toggleTeacherLock(lockTargetTeacher.id)
    setTeachers((prev) => prev.map((t) => (t.id === lockTargetTeacher.id ? updated : t)))
    if (selectedTeacher?.id === lockTargetTeacher.id) {
      setSelectedTeacher(updated)
    }
    const isNowLocked = updated.accountStatus === 'LOCKED'
    showToast(
      isNowLocked
        ? `Đã khóa tài khoản giáo viên "${updated.name}"`
        : `Đã mở khóa tài khoản cho giáo viên "${updated.name}"`
    )
    setIsConfirmLockOpen(false)
    setLockTargetTeacher(null)
    loadData()
  }

  return (
    <div className="teacher-management-container">
      {/* Toast Banner */}
      {feedbackToast && (
        <div className="admin-toast-banner" role="status">
          <CheckCircle2 size={16} />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* 1. Page Header */}
      <div className="staff-page-header">
        <div className="admin-header-row">
          <div>
            <h1 className="staff-page-title">Quản lý giáo viên</h1>
            <p className="staff-page-desc">
              Quản trị đội ngũ giáo viên, bộ môn chuyên môn, phân công lớp giảng dạy và kết nối nhanh sang Teacher Workspace.
            </p>
          </div>
          <div className="admin-header-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={loadData}
              aria-label="Làm mới danh sách giáo viên"
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              <span>Làm mới</span>
            </button>
            <Link
              to="/teacher"
              className="btn btn-secondary btn-sm"
              title="Truy cập không gian làm việc của giáo viên"
              aria-label="Đến Teacher Workspace"
            >
              <span>Teacher Workspace</span>
              <ExternalLink size={14} />
            </Link>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setIsCreateModalOpen(true)}
              aria-label="Thêm giáo viên mới"
            >
              <Plus size={15} />
              <span>Thêm giáo viên</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Compact Teacher Summary Strip */}
      <TeacherSummaryStrip kpis={kpis} />

      {/* 3. Search and Multi-filter Toolbar */}
      <TeacherToolbar
        filters={filters}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
      />

      {/* 4. Main Teacher Table / Mobile Cards / Empty State */}
      {loading ? (
        <div className="teacher-table-wrapper" style={{ padding: '16px' }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ marginBottom: '10px' }}>
              <Skeleton width="100%" height="38px" />
            </div>
          ))}
        </div>
      ) : paginatedTeachers.length === 0 ? (
        <EmptyState
          title="Không tìm thấy giáo viên nào"
          description="Không có giáo viên phù hợp với bộ lọc hoặc từ khóa tìm kiếm hiện tại."
          icon={GraduationCap}
          actionLabel="Đặt lại bộ lọc"
          onAction={handleResetFilters}
        />
      ) : (
        <>
          {/* Desktop Table View (>= 768px) */}
          <TeacherTable
            teachers={paginatedTeachers}
            selectedIds={selectedIds}
            onToggleSelectAll={handleToggleSelectAll}
            onToggleSelectTeacher={handleToggleSelectTeacher}
            selectedTeacherId={isDrawerOpen && selectedTeacher ? selectedTeacher.id : null}
            onSelectTeacher={handleSelectTeacher}
            onEditTeacher={handleEditTeacher}
            onChangeTeachingStatus={handleOpenTeachingStatusModal}
            onToggleLockAccount={handleOpenLockConfirm}
            sort={sort}
            onSortChange={handleSortChange}
          />

          {/* Mobile Card List View (< 768px) */}
          <TeacherCardList
            teachers={paginatedTeachers}
            onSelectTeacher={handleSelectTeacher}
            onEditTeacher={handleEditTeacher}
            onChangeTeachingStatus={handleOpenTeachingStatusModal}
            onToggleLockAccount={handleOpenLockConfirm}
          />

          {/* 5. Pagination */}
          <StaffPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={pageSize}
            onPageChange={(p) => setCurrentPage(p)}
          />
        </>
      )}

      {/* 6. Teacher Detail Drawer (520px sliding) */}
      <TeacherDetailDrawer
        isOpen={isDrawerOpen}
        teacher={selectedTeacher}
        onClose={handleCloseDrawer}
        onSaveEdit={handleSaveEdit}
        onChangeTeachingStatus={handleOpenTeachingStatusModal}
        onToggleLockAccount={handleOpenLockConfirm}
      />

      {/* 7. Create Teacher Modal */}
      <CreateTeacherModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateTeacher}
      />

      {/* 8. Change Teaching Status Modal */}
      <ChangeTeachingStatusModal
        isOpen={isStatusModalOpen}
        teacher={statusTargetTeacher}
        onClose={() => {
          setIsStatusModalOpen(false)
          setStatusTargetTeacher(null)
        }}
        onConfirm={handleConfirmTeachingStatus}
      />

      {/* 9. Confirm Lock / Unlock Account Dialog */}
      <ConfirmDialog
        isOpen={isConfirmLockOpen}
        title={
          lockTargetTeacher?.accountStatus === 'LOCKED'
            ? 'Mở khóa tài khoản giáo viên'
            : 'Khóa tài khoản giáo viên'
        }
        description={
          lockTargetTeacher?.accountStatus === 'LOCKED'
            ? `Bạn có chắc chắn muốn mở khóa tài khoản cho giáo viên "${lockTargetTeacher?.name}"? Giáo viên sẽ được phép đăng nhập lại vào hệ thống.`
            : `Giáo viên "${lockTargetTeacher?.name}" sẽ tạm thời không thể đăng nhập vào hệ thống. Trạng thái phân công giảng dạy hiện tại sẽ được giữ nguyên cho đến khi có thay đổi.`
        }
        confirmText={
          lockTargetTeacher?.accountStatus === 'LOCKED' ? 'Mở khóa' : 'Khóa tài khoản'
        }
        cancelText="Hủy bỏ"
        isDestructive={lockTargetTeacher?.accountStatus !== 'LOCKED'}
        onConfirm={handleConfirmLockToggle}
        onCancel={() => {
          setIsConfirmLockOpen(false)
          setLockTargetTeacher(null)
        }}
      />
    </div>
  )
}
