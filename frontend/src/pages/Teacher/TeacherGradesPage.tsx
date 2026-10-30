import React, { useEffect, useState, useMemo } from 'react'
import {
  Search,
  Download,
  CheckCircle2,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { classroomService } from '@/services/classroom.service'
import type {
  AdminClassItem,
  AdminGradeRecord,
  GradeActivityType,
} from '@/types/classroom'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { SummaryStrip } from '@/components/ui/SummaryStrip'
import './TeacherPages.css'
import '../Admin/AdminPages.css'
import '@/components/admin/AdminComponents.css'

export const TeacherGradesPage: React.FC = () => {
  const [grades, setGrades] = useState<AdminGradeRecord[]>([])
  const [classes, setClasses] = useState<AdminClassItem[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState<'all' | GradeActivityType>('all')
  const [sortBy, setSortBy] = useState<'latest' | 'score_desc' | 'score_asc'>('latest')

  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  useEffect(() => {
    let active = true
    Promise.all([classroomService.getAllGrades(), classroomService.getClasses()])
      .then(([grdList, clsList]) => {
        if (active) {
          setGrades(grdList)
          setClasses(clsList)
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

  // KPI Calculations
  const totalRecords = grades.length
  const avgScore =
    totalRecords > 0
      ? Number((grades.reduce((acc, g) => acc + g.score, 0) / totalRecords).toFixed(1))
      : 0
  const passedCount = grades.filter((g) => g.passed).length
  const passRate = totalRecords > 0 ? Math.round((passedCount / totalRecords) * 100) : 0
  const excellentCount = grades.filter((g) => g.score >= 8.0).length
  const excellentRate = totalRecords > 0 ? Math.round((excellentCount / totalRecords) * 100) : 0

  // Score Distribution
  const scoreDist = useMemo(() => {
    const dist = { under5: 0, from5to65: 0, from65to8: 0, from8to10: 0 }
    grades.forEach((g) => {
      if (g.score < 5.0) dist.under5++
      else if (g.score < 6.5) dist.from5to65++
      else if (g.score < 8.0) dist.from65to8++
      else dist.from8to10++
    })
    return dist
  }, [grades])

  // Filtered & Sorted List
  const filteredGrades = useMemo(() => {
    const result = grades.filter((g) => {
      const matchSearch =
        g.studentName.toLowerCase().includes(search.toLowerCase()) ||
        g.studentCode.toLowerCase().includes(search.toLowerCase()) ||
        g.activityTitle.toLowerCase().includes(search.toLowerCase())
      const matchClass = classFilter === 'all' || g.classId === classFilter
      const matchType = typeFilter === 'all' || g.activityType === typeFilter
      return matchSearch && matchClass && matchType
    })

    return result.sort((a, b) => {
      if (sortBy === 'score_desc') return b.score - a.score
      if (sortBy === 'score_asc') return a.score - b.score
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    })
  }, [grades, search, classFilter, typeFilter, sortBy])

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Mã HV', 'Họ và tên', 'Lớp', 'Môn học', 'Bài kiểm tra / Bài tập', 'Loại bài', 'Điểm số', 'Thang điểm', 'Kết quả', 'Ngày hoàn thành']
    const rows = filteredGrades.map((g) => [
      g.studentCode,
      g.studentName,
      g.className,
      g.subjectName,
      g.activityTitle,
      g.activityType === 'assignment' ? 'Bài tập' : 'Thu hoạch',
      g.score,
      g.maxScore,
      g.passed ? 'Đạt' : 'Chưa đạt',
      new Date(g.date).toLocaleDateString('vi-VN'),
    ])

    const csvContent =
      '\uFEFF' +
      [
        headers.join(','),
        ...rows.map((row) =>
          row
            .map((val) => {
              const str = String(val ?? '')
              if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`
              }
              return str
            })
            .join(',')
        ),
      ].join('\r\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Bang_diem_lop_hoc_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showToast('Đã xuất bảng điểm học tập (CSV) thành công')
  }

  const gradeKPIs = useMemo(() => [
    { id: 'avg', label: 'Điểm TB toàn khóa', value: avgScore, color: 'var(--navy-primary, #102a43)' },
    { id: 'pass', label: 'Tỷ lệ đạt chuẩn (>= 5.0)', value: `${passRate}%`, color: '#16a34a' },
    { id: 'excellent', label: 'Tỷ lệ xuất sắc (>= 8.0)', value: `${excellentRate}%`, color: '#0284c7' },
    { id: 'total', label: 'Tổng lượt đánh giá', value: totalRecords, color: '#d97706' },
  ], [avgScore, passRate, excellentRate, totalRecords])

  return (
    <div className="admin-page-container">
      {/* Toast */}
      {toastMessage && (
        <div className="admin-toast-notification">
          <CheckCircle2 size={18} color="#047857" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="staff-page-header">
        <div className="admin-header-row">
          <div>
            <h1 className="staff-page-title">Sổ điểm học tập</h1>
            <p className="staff-page-desc">
              Tổng hợp và phân tích điểm số các bài kiểm tra, bài tập và thu hoạch của học sinh theo lớp học.
            </p>
          </div>
          <div className="admin-header-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleExportCSV}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Download size={16} />
              <span>Xuất bảng điểm (CSV)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 KPIs Summary Strip */}
      <SummaryStrip items={gradeKPIs} ariaLabel="Thống kê nhanh sổ điểm" />

      {/* Phổ điểm phân bố */}
      <div className="admin-card" style={{ padding: 16, marginBottom: 16 }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#102a43', margin: '0 0 16px 0' }}>
          Phổ điểm phân bố các lớp
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div style={{ background: '#f8fafc', padding: 12, borderRadius: 6, border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.8rem', color: '#627d98' }}>Dưới 5.0 (Chưa đạt)</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#dc2626', marginTop: 4 }}>
              {scoreDist.under5} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#627d98' }}>lượt</span>
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: 12, borderRadius: 6, border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.8rem', color: '#627d98' }}>5.0 – 6.4 (Trung bình)</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#d97706', marginTop: 4 }}>
              {scoreDist.from5to65} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#627d98' }}>lượt</span>
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: 12, borderRadius: 6, border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.8rem', color: '#627d98' }}>6.5 – 7.9 (Khá)</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0284c7', marginTop: 4 }}>
              {scoreDist.from65to8} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#627d98' }}>lượt</span>
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: 12, borderRadius: 6, border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.8rem', color: '#627d98' }}>8.0 – 10.0 (Giỏi)</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#047857', marginTop: 4 }}>
              {scoreDist.from8to10} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#627d98' }}>lượt</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="admin-filter-bar">
        <div className="admin-search-input-wrap">
          <Search size={16} className="admin-search-icon" />
          <input
            type="text"
            className="admin-search-input"
            placeholder="Tìm theo tên học sinh, mã số hoặc bài tập..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          aria-label="Lọc theo lớp học"
          className="admin-filter-select"
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
        >
          <option value="all">Tất cả lớp học</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          aria-label="Lọc theo loại bài tập"
          className="admin-filter-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as 'all' | GradeActivityType)}
        >
          <option value="all">Tất cả hình thức</option>
          <option value="assignment">Bài tập về nhà</option>
          <option value="assessment">Bài thu hoạch</option>
        </select>

        <select
          aria-label="Sắp xếp kết quả"
          className="admin-filter-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'latest' | 'score_desc' | 'score_asc')}
        >
          <option value="latest">Mới nhất trước</option>
          <option value="score_desc">Điểm cao xuống thấp</option>
          <option value="score_asc">Điểm thấp lên cao</option>
        </select>

        {(search || classFilter !== 'all' || typeFilter !== 'all' || sortBy !== 'latest') && (
          <button
            type="button"
            className="admin-filter-btn-clear"
            onClick={() => {
              setSearch('')
              setClassFilter('all')
              setTypeFilter('all')
              setSortBy('latest')
            }}
          >
            Xóa bộ lọc
          </button>
        )}
      </div>

      {/* Gradebook View: Controlled Horizontal Scroll on Desktop + Responsive Cards on Mobile */}
      <div className="teacher-classes-wrapper">
        {loading ? (
          <div style={{ padding: '24px' }}>
            <Skeleton height={48} />
          </div>
        ) : filteredGrades.length === 0 ? (
          <EmptyState
            title="Chưa có dữ liệu điểm"
            description="Không tìm thấy kết quả đánh giá nào phù hợp với bộ lọc."
          />
        ) : (
          <>
            {/* Desktop Gradebook Table */}
            <div className="staff-table-wrapper teacher-desktop-table" style={{ overflowX: 'auto' }}>
              <table className="staff-table">
                <thead>
                  <tr>
                    <th style={{ position: 'sticky', left: 0, backgroundColor: 'var(--staff-bg-app, #f8fafc)', zIndex: 2 }}>Mã HV</th>
                    <th style={{ position: 'sticky', left: 80, backgroundColor: 'var(--staff-bg-app, #f8fafc)', zIndex: 2 }}>Học sinh</th>
                    <th>Lớp học</th>
                    <th>Môn học</th>
                    <th>Nội dung đánh giá</th>
                    <th>Hình thức</th>
                    <th>Điểm số</th>
                    <th>Kết quả</th>
                    <th>Ngày nộp</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGrades.map((g) => (
                    <tr key={g.id}>
                      <td style={{ position: 'sticky', left: 0, backgroundColor: 'var(--staff-surface, #ffffff)', zIndex: 1 }}>
                        <code>{g.studentCode}</code>
                      </td>
                      <td style={{ position: 'sticky', left: 80, backgroundColor: 'var(--staff-surface, #ffffff)', zIndex: 1 }}>
                        <Link
                          to={`/teacher/students/${g.studentId}`}
                          className="font-medium text-navy-primary hover:underline"
                          style={{ fontWeight: 600, color: '#102a43' }}
                        >
                          {g.studentName}
                        </Link>
                      </td>
                      <td>
                        <span style={{ fontWeight: 500 }}>{g.className}</span>
                      </td>
                      <td>{g.subjectName}</td>
                      <td>
                        <span style={{ fontWeight: 500, color: '#102a43' }}>{g.activityTitle}</span>
                      </td>
                      <td>
                        <span className="subject-badge-pill">
                          {g.activityType === 'assignment' ? 'Bài tập' : 'Thu hoạch'}
                        </span>
                      </td>
                      <td>
                        <strong
                          style={{
                            color: g.score >= 8.0 ? '#047857' : g.score >= 5.0 ? '#d97706' : '#dc2626',
                            fontSize: '0.95rem',
                          }}
                        >
                          {g.score.toFixed(1)} / {g.maxScore}
                        </strong>
                      </td>
                      <td>
                        <span className={`status-badge ${g.passed ? 'status-success' : 'status-danger'}`}>
                          {g.passed ? 'Đạt' : 'Chưa đạt'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.82rem', color: '#627d98' }}>
                          {new Date(g.date).toLocaleDateString('vi-VN')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Gradebook Cards (<768px) */}
            <div className="teacher-mobile-cards-list">
              {filteredGrades.map((g) => (
                <div key={g.id} className="teacher-card-item">
                  <div className="teacher-card-item-header">
                    <div>
                      <Link to={`/teacher/students/${g.studentId}`} className="teacher-card-title">
                        {g.studentName}
                      </Link>
                      <div className="teacher-card-meta-line">
                        <span>{g.className}</span>
                        <span>•</span>
                        <span>Mã: <code>{g.studentCode}</code></span>
                      </div>
                    </div>
                    <span className={`status-badge ${g.passed ? 'status-success' : 'status-danger'}`}>
                      {g.passed ? 'Đạt' : 'Chưa đạt'}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#102a43', marginTop: 8 }}>
                    {g.activityTitle}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#627d98', marginTop: 2 }}>
                    Môn: {g.subjectName} • {g.activityType === 'assignment' ? 'Bài tập' : 'Thu hoạch'}
                  </div>

                  <div className="teacher-card-item-body" style={{ marginTop: 10 }}>
                    <div className="teacher-card-stat">
                      <span className="teacher-stat-label">Điểm số</span>
                      <strong
                        className="teacher-stat-val"
                        style={{ color: g.score >= 8 ? '#047857' : g.score >= 5 ? '#d97706' : '#dc2626' }}
                      >
                        {g.score.toFixed(1)} / {g.maxScore}
                      </strong>
                    </div>
                    <div className="teacher-card-stat">
                      <span className="teacher-stat-label">Ngày đánh giá</span>
                      <strong className="teacher-stat-val" style={{ fontSize: '0.82rem' }}>
                        {new Date(g.date).toLocaleDateString('vi-VN')}
                      </strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
