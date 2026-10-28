import React, { useEffect, useState, useMemo } from 'react'
import {
  Award,
  Search,
  Download,
  Calendar,
  CheckCircle2,
  TrendingUp,
  Percent,
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
    link.download = `Bang_diem_he_thong_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showToast('Đã xuất bảng điểm học tập (CSV) thành công')
  }

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
        <div className="admin-prototype-badge">
          <span className="prototype-dot"></span>
          <span>ADMIN WORKSPACE • KẾT QUẢ HỌC TẬP</span>
        </div>
        <div className="admin-header-row">
          <div>
            <h1 className="staff-page-title">Bảng điểm học tập</h1>
            <p className="staff-page-desc">
              Tổng hợp và phân tích điểm số các bài kiểm tra, bài tập và thu hoạch của học sinh trên toàn hệ thống.
            </p>
          </div>
          <div className="admin-header-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleExportCSV}
            >
              <Download size={16} />
              <span>Xuất bảng điểm (CSV)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 KPIs */}
      <div className="admin-kpi-grid">
        <div className="admin-kpi-card">
          <div className="kpi-top-row">
            <span className="kpi-label">Điểm TB toàn hệ thống</span>
            <div className="kpi-icon-wrap" style={{ background: 'rgba(16, 42, 67, 0.08)', color: '#102a43' }}>
              <Award size={20} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-num">{avgScore}</span>
            <span className="kpi-comparison">Thang điểm 10</span>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="kpi-top-row">
            <span className="kpi-label">Tỷ lệ đạt chuẩn (&gt;= 5.0)</span>
            <div className="kpi-icon-wrap" style={{ background: 'rgba(4, 120, 87, 0.08)', color: '#047857' }}>
              <Percent size={20} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-num">{passRate}%</span>
            <span className="kpi-comparison">{passedCount} / {totalRecords} lượt kiểm tra</span>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="kpi-top-row">
            <span className="kpi-label">Tỷ lệ xuất sắc (&gt;= 8.0)</span>
            <div className="kpi-icon-wrap" style={{ background: 'rgba(2, 132, 199, 0.08)', color: '#0284c7' }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-num">{excellentRate}%</span>
            <span className="kpi-comparison">{excellentCount} lượt đạt giỏi</span>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="kpi-top-row">
            <span className="kpi-label">Tổng lượt đánh giá</span>
            <div className="kpi-icon-wrap" style={{ background: 'rgba(244, 185, 66, 0.15)', color: '#b45309' }}>
              <Award size={20} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-num">{totalRecords}</span>
            <span className="kpi-comparison">Bài nộp & Thu hoạch</span>
          </div>
        </div>
      </div>

      {/* Phổ điểm phân bố */}
      <div
        className="admin-card"
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          padding: 20,
          marginBottom: 24,
        }}
      >
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#102a43', margin: '0 0 16px 0' }}>
          Phổ điểm phân bố hệ thống
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <div style={{ background: '#f8fafc', padding: 12, borderRadius: 6, borderLeft: '4px solid #dc2626' }}>
            <div style={{ fontSize: '0.82rem', color: '#627d98' }}>Dưới 5.0 (Cần chú ý)</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#dc2626', marginTop: 4 }}>
              {scoreDist.under5} <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>lượt</span>
            </div>
            <div style={{ height: 4, background: '#e2e8f0', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
              <div style={{ width: totalRecords > 0 ? `${(scoreDist.under5 / totalRecords) * 100}%` : '0%', height: '100%', background: '#dc2626' }} />
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: 12, borderRadius: 6, borderLeft: '4px solid #f59e0b' }}>
            <div style={{ fontSize: '0.82rem', color: '#627d98' }}>5.0 - 6.4 (Trung bình)</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#d97706', marginTop: 4 }}>
              {scoreDist.from5to65} <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>lượt</span>
            </div>
            <div style={{ height: 4, background: '#e2e8f0', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
              <div style={{ width: totalRecords > 0 ? `${(scoreDist.from5to65 / totalRecords) * 100}%` : '0%', height: '100%', background: '#f59e0b' }} />
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: 12, borderRadius: 6, borderLeft: '4px solid #0284c7' }}>
            <div style={{ fontSize: '0.82rem', color: '#627d98' }}>6.5 - 7.9 (Khá)</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0284c7', marginTop: 4 }}>
              {scoreDist.from65to8} <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>lượt</span>
            </div>
            <div style={{ height: 4, background: '#e2e8f0', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
              <div style={{ width: totalRecords > 0 ? `${(scoreDist.from65to8 / totalRecords) * 100}%` : '0%', height: '100%', background: '#0284c7' }} />
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: 12, borderRadius: 6, borderLeft: '4px solid #047857' }}>
            <div style={{ fontSize: '0.82rem', color: '#627d98' }}>8.0 - 10.0 (Giỏi)</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#047857', marginTop: 4 }}>
              {scoreDist.from8to10} <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>lượt</span>
            </div>
            <div style={{ height: 4, background: '#e2e8f0', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
              <div style={{ width: totalRecords > 0 ? `${(scoreDist.from8to10 / totalRecords) * 100}%` : '0%', height: '100%', background: '#047857' }} />
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
            placeholder="Tìm theo tên học viên, mã HV hoặc bài kiểm tra..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="admin-filter-select"
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          aria-label="Lọc theo lớp học"
        >
          <option value="all">Tất cả lớp học</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.grade})
            </option>
          ))}
        </select>

        <select
          className="admin-filter-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as 'all' | GradeActivityType)}
          aria-label="Lọc theo loại bài"
        >
          <option value="all">Tất cả loại bài</option>
          <option value="assignment">Bài tập</option>
          <option value="assessment">Bài thu hoạch</option>
        </select>

        <select
          className="admin-filter-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'latest' | 'score_desc' | 'score_asc')}
          aria-label="Sắp xếp điểm"
        >
          <option value="latest">Mới nhất trước</option>
          <option value="score_desc">Điểm cao nhất</option>
          <option value="score_asc">Điểm thấp nhất</option>
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

      {/* Table */}
      <div className="staff-table-wrapper">
        {loading ? (
          <div style={{ padding: '24px' }}>
            <Skeleton height={48} />
          </div>
        ) : filteredGrades.length === 0 ? (
          <EmptyState
            title="Không tìm thấy bản ghi điểm nào"
            description="Thử thay đổi bộ lọc tìm kiếm."
          />
        ) : (
          <table className="staff-table">
            <thead>
              <tr>
                <th>Học viên</th>
                <th>Lớp</th>
                <th>Môn học</th>
                <th>Bài kiểm tra / Bài tập</th>
                <th>Loại bài</th>
                <th>Điểm số</th>
                <th>Kết quả</th>
                <th>Ngày làm bài</th>
              </tr>
            </thead>
            <tbody>
              {filteredGrades.map((g) => (
                <tr key={g.id}>
                  <td>
                    <div>
                      <Link
                        to={`/teacher/students/${g.studentId}`}
                        className="font-medium text-navy-primary hover:underline"
                        style={{ fontWeight: 600, color: '#102a43' }}
                      >
                        {g.studentName}
                      </Link>
                      <div style={{ fontSize: '0.78rem', color: '#627d98' }}>
                        <code>{g.studentCode}</code>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 500, color: '#334e68' }}>{g.className}</span>
                  </td>
                  <td>{g.subjectName}</td>
                  <td>
                    <strong style={{ color: '#102a43' }}>{g.activityTitle}</strong>
                  </td>
                  <td>
                    <span className="status-badge status-default">
                      {g.activityType === 'assignment' ? 'Bài tập' : 'Thu hoạch'}
                    </span>
                  </td>
                  <td>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: '1rem',
                        color: g.score >= 8 ? '#047857' : g.score >= 6.5 ? '#0284c7' : '#dc2626',
                      }}
                    >
                      {g.score} / {g.maxScore}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${g.passed ? 'status-success' : 'status-danger'}`}>
                      {g.passed ? 'Đạt' : 'Chưa đạt'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                      <Calendar size={13} color="#627d98" />
                      <span>{new Date(g.date).toLocaleDateString('vi-VN')}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
