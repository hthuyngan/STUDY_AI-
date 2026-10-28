import React, { useEffect, useState, useMemo } from 'react'
import {
  Users,
  Search,
  Download,
  Eye,
  MoveRight,
  Award,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { classroomService } from '@/services/classroom.service'
import type { AdminClassItem, AdminStudentItem, StudentStatus } from '@/types/classroom'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import '../Admin/AdminPages.css'
import '@/components/admin/AdminComponents.css'

export const TeacherStudentsPage: React.FC = () => {
  const [students, setStudents] = useState<AdminStudentItem[]>([])
  const [classes, setClasses] = useState<AdminClassItem[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('all')
  const [gradeFilter, setGradeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | StudentStatus>('all')

  // Move Modal
  const [isMoveOpen, setIsMoveOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<AdminStudentItem | null>(null)
  const [targetClassId, setTargetClassId] = useState('')

  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const loadData = () => {
    setLoading(true)
    Promise.all([classroomService.getStudents(), classroomService.getClasses()])
      .then(([stuList, clsList]) => {
        setStudents(stuList)
        setClasses(clsList)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
      })
  }

  useEffect(() => {
    let active = true
    Promise.all([classroomService.getStudents(), classroomService.getClasses()])
      .then(([stuList, clsList]) => {
        if (active) {
          setStudents(stuList)
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
  const totalStudents = students.length
  const onTrackCount = students.filter((s) => s.status === 'on-track').length
  const needsAttentionCount = students.filter((s) => s.status === 'needs-attention').length
  const systemAvgScore =
    totalStudents > 0
      ? Number((students.reduce((acc, s) => acc + s.averageScore, 0) / totalStudents).toFixed(1))
      : 0

  // Filtered List
  const filteredStudents = useMemo(() => {
    return students.filter((stu) => {
      const matchSearch =
        stu.name.toLowerCase().includes(search.toLowerCase()) ||
        stu.email.toLowerCase().includes(search.toLowerCase()) ||
        stu.code.toLowerCase().includes(search.toLowerCase())
      const matchClass = classFilter === 'all' || stu.classId === classFilter
      const matchGrade = gradeFilter === 'all' || stu.grade === gradeFilter
      const matchStatus = statusFilter === 'all' || stu.status === statusFilter
      return matchSearch && matchClass && matchGrade && matchStatus
    })
  }, [students, search, classFilter, gradeFilter, statusFilter])

  // Handle Move
  const handleMoveSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStudent || !targetClassId) return
    const targetClass = classes.find((c) => c.id === targetClassId)
    if (!targetClass) return

    try {
      await classroomService.moveStudentClass(selectedStudent.id, targetClass.id, targetClass.name)
      await classroomService.addClassActivity(
        targetClass.id,
        'Tiáº¿p nháº­n há»c viÃªn chuyá»ƒn lá»›p',
        `Há»c viÃªn ${selectedStudent.name} (${selectedStudent.code}) Ä‘Ã£ Ä‘Æ°á»£c chuyá»ƒn vÃ o lá»›p`
      )
      showToast(`ÄÃ£ chuyá»ƒn há»c viÃªn ${selectedStudent.name} sang lá»›p ${targetClass.name}`)
      setIsMoveOpen(false)
      setSelectedStudent(null)
      loadData()
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message)
    }
  }

  // Handle Export CSV
  const handleExportCSV = () => {
    const headers = [
      'MÃ£ HV',
      'Há» vÃ  tÃªn',
      'Email',
      'Sá»‘ Ä‘iá»‡n thoáº¡i',
      'Lá»›p',
      'Khá»‘i',
      'Tiáº¿n Ä‘á»™ (%)',
      'Sá»‘ bÃ i hoÃ n thÃ nh',
      'Äiá»ƒm TB',
      'Thá»i gian há»c (phÃºt)',
      'Láº§n hoáº¡t Ä‘á»™ng cuá»‘i',
      'Tráº¡ng thÃ¡i',
    ]

    const rows = filteredStudents.map((s) => [
      s.code,
      s.name,
      s.email,
      s.phone || '',
      s.className,
      s.grade,
      `${s.progress}%`,
      s.lessonsCompleted,
      s.averageScore,
      s.totalLearningMinutes,
      new Date(s.lastActive).toLocaleDateString('vi-VN'),
      s.status === 'on-track' ? 'Äang há»c tá»‘t' : s.status === 'needs-attention' ? 'Cáº§n há»— trá»£' : 'Ngá»«ng hoáº¡t Ä‘á»™ng',
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
    link.download = `Danh_sach_hoc_vien_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showToast('ÄÃ£ xuáº¥t danh sÃ¡ch há»c viÃªn (CSV) thÃ nh cÃ´ng')
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
          <span>ADMIN WORKSPACE â€¢ QUáº¢N LÃ GIáº¢NG Dáº Y</span>
        </div>
        <div className="admin-header-row">
          <div>
            <h1 className="staff-page-title">Quáº£n lÃ½ há»c viÃªn</h1>
            <p className="staff-page-desc">
              Theo dÃµi há»“ sÆ¡, tiáº¿n Ä‘á»™ vÃ  káº¿t quáº£ há»c táº­p cá»§a toÃ n bá»™ há»c viÃªn trÃªn ná»n táº£ng STUDY_AI.
            </p>
          </div>
          <div className="admin-header-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleExportCSV}
              title="Xuáº¥t danh sÃ¡ch há»c viÃªn ra file CSV"
            >
              <Download size={16} />
              <span>Xuáº¥t dá»¯ liá»‡u há»c viÃªn (CSV)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 KPIs */}
      <div className="admin-kpi-grid">
        <div className="admin-kpi-card">
          <div className="kpi-top-row">
            <span className="kpi-label">Tá»•ng há»c viÃªn</span>
            <div className="kpi-icon-wrap" style={{ background: 'rgba(16, 42, 67, 0.08)', color: '#102a43' }}>
              <Users size={20} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-num">{totalStudents}</span>
            <span className="kpi-comparison">ÄÃ£ ghi danh</span>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="kpi-top-row">
            <span className="kpi-label">Äang há»c tÃ­ch cá»±c</span>
            <div className="kpi-icon-wrap" style={{ background: 'rgba(4, 120, 87, 0.08)', color: '#047857' }}>
              <Award size={20} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-num">{onTrackCount}</span>
            <span className="kpi-comparison">Tiáº¿n Ä‘á»™ & Ä‘iá»ƒm Ä‘áº¡t chuáº©n</span>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="kpi-top-row">
            <span className="kpi-label">Cáº§n há»— trá»£</span>
            <div className="kpi-icon-wrap" style={{ background: 'rgba(220, 38, 38, 0.08)', color: '#dc2626' }}>
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-num">{needsAttentionCount}</span>
            <span className="kpi-comparison" style={{ color: needsAttentionCount > 0 ? '#b91c1c' : '#047857' }}>
              {needsAttentionCount > 0 ? 'CÃ³ nguy cÆ¡ tá»¥t láº¡i' : 'Táº¥t cáº£ Ä‘áº¡t chuáº©n'}
            </span>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="kpi-top-row">
            <span className="kpi-label">Äiá»ƒm trung bÃ¬nh toÃ n há»‡</span>
            <div className="kpi-icon-wrap" style={{ background: 'rgba(2, 132, 199, 0.08)', color: '#0284c7' }}>
              <Award size={20} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-num">{systemAvgScore}</span>
            <span className="kpi-comparison">Thang Ä‘iá»ƒm 10</span>
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
            placeholder="TÃ¬m theo tÃªn há»c viÃªn, email hoáº·c mÃ£ HV..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="admin-filter-select"
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          aria-label="Lá»c theo lá»›p há»c"
        >
          <option value="all">Táº¥t cáº£ lá»›p há»c</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.grade})
            </option>
          ))}
        </select>

        <select
          className="admin-filter-select"
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value)}
          aria-label="Lá»c theo khá»‘i lá»›p"
        >
          <option value="all">Táº¥t cáº£ khá»‘i lá»›p</option>
          <option value="Lá»›p 10">Lá»›p 10</option>
          <option value="Lá»›p 11">Lá»›p 11</option>
          <option value="Lá»›p 12">Lá»›p 12</option>
        </select>

        <select
          className="admin-filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | StudentStatus)}
          aria-label="Lá»c theo tráº¡ng thÃ¡i"
        >
          <option value="all">Táº¥t cáº£ tráº¡ng thÃ¡i</option>
          <option value="on-track">Äang há»c tá»‘t</option>
          <option value="needs-attention">Cáº§n chÃº Ã½</option>
          <option value="idle">Ngá»«ng hoáº¡t Ä‘á»™ng</option>
        </select>

        {(search || classFilter !== 'all' || gradeFilter !== 'all' || statusFilter !== 'all') && (
          <button
            type="button"
            className="admin-filter-btn-clear"
            onClick={() => {
              setSearch('')
              setClassFilter('all')
              setGradeFilter('all')
              setStatusFilter('all')
            }}
          >
            XÃ³a bá»™ lá»c
          </button>
        )}
      </div>

      {/* Data Table */}
      <div className="staff-table-wrapper">
        {loading ? (
          <div style={{ padding: '24px' }}>
            <Skeleton height={48} />
          </div>
        ) : filteredStudents.length === 0 ? (
          <EmptyState
            title="KhÃ´ng tÃ¬m tháº¥y há»c viÃªn nÃ o"
            description="Thá»­ thay Ä‘á»•i bá»™ lá»c hoáº·c tá»« khÃ³a tÃ¬m kiáº¿m."
          />
        ) : (
          <table className="staff-table">
            <thead>
              <tr>
                <th>Há»c viÃªn</th>
                <th>Lá»›p há»c</th>
                <th>Tiáº¿n Ä‘á»™ tá»•ng thá»ƒ</th>
                <th>BÃ i Ä‘Ã£ hoÃ n thÃ nh</th>
                <th>Äiá»ƒm TB</th>
                <th>Thá»i gian há»c</th>
                <th>Hoáº¡t Ä‘á»™ng gáº§n nháº¥t</th>
                <th>Tráº¡ng thÃ¡i</th>
                <th style={{ textAlign: 'right' }}>Thao tÃ¡c</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((stu) => {
                const initials = stu.name
                  .split(' ')
                  .map((w) => w[0])
                  .slice(-2)
                  .join('')
                  .toUpperCase()

                return (
                  <tr key={stu.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: '50%',
                            background: '#102a43',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            flexShrink: 0,
                          }}
                        >
                          {initials}
                        </div>
                        <div>
                          <Link
                            to={`/teacher/students/${stu.id}`}
                            className="font-medium text-navy-primary hover:underline"
                            style={{ fontWeight: 600, color: '#102a43' }}
                          >
                            {stu.name}
                          </Link>
                          <div style={{ fontSize: '0.78rem', color: '#627d98' }}>
                            <code>{stu.code}</code> â€¢ {stu.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>
                        <strong style={{ color: '#102a43', fontSize: '0.88rem' }}>{stu.className}</strong>
                        <div style={{ fontSize: '0.78rem', color: '#627d98' }}>{stu.grade}</div>
                      </div>
                    </td>
                    <td>
                      <div style={{ minWidth: 100 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 2 }}>
                          <span style={{ fontWeight: 600 }}>{stu.progress}%</span>
                        </div>
                        <div style={{ height: 5, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${stu.progress}%`,
                              height: '100%',
                              background: stu.progress >= 70 ? '#047857' : stu.progress >= 50 ? '#0284c7' : '#dc2626',
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 500 }}>{stu.lessonsCompleted} bÃ i</span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '0.92rem',
                          color: stu.averageScore >= 8 ? '#047857' : stu.averageScore >= 6.5 ? '#0284c7' : '#dc2626',
                        }}
                      >
                        {stu.averageScore > 0 ? stu.averageScore : 'â€”'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.82rem', color: '#486581' }}>
                        <Clock size={13} />
                        <span>{Math.round(stu.totalLearningMinutes / 60)}h {stu.totalLearningMinutes % 60}p</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.82rem', color: '#627d98' }}>
                        {new Date(stu.lastActive).toLocaleDateString('vi-VN')}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`status-badge ${
                          stu.status === 'on-track'
                            ? 'status-success'
                            : stu.status === 'needs-attention'
                            ? 'status-danger'
                            : 'status-default'
                        }`}
                      >
                        {stu.status === 'on-track' ? 'Äang há»c tá»‘t' : stu.status === 'needs-attention' ? 'Cáº§n chÃº Ã½' : 'Nghá»‰'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="table-actions" style={{ justifyContent: 'flex-end', gap: 6 }}>
                        <Link
                          to={`/teacher/students/${stu.id}`}
                          className="table-action-btn"
                          title="Há»“ sÆ¡ há»c táº­p"
                        >
                          <Eye size={16} />
                        </Link>
                        <button
                          type="button"
                          className="table-action-btn"
                          onClick={() => {
                            setSelectedStudent(stu)
                            setTargetClassId('')
                            setIsMoveOpen(true)
                          }}
                          title="Chuyá»ƒn lá»›p"
                        >
                          <MoveRight size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Chuyá»ƒn Lá»›p */}
      {isMoveOpen && selectedStudent && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true">
          <div className="admin-modal-card" style={{ maxWidth: 440 }}>
            <div className="admin-modal-header">
              <h3 className="modal-title">Chuyá»ƒn lá»›p cho há»c viÃªn</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsMoveOpen(false)}
              >
                âœ•
              </button>
            </div>

            <form onSubmit={handleMoveSubmit}>
              <div className="admin-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#334e68' }}>
                  Chuyá»ƒn há»c viÃªn: <strong>{selectedStudent.name}</strong> ({selectedStudent.code})
                </p>
                <div style={{ background: '#f8fafc', padding: 10, borderRadius: 6 }}>
                  Lá»›p hiá»‡n táº¡i: <strong>{selectedStudent.className}</strong> ({selectedStudent.grade})
                </div>

                <div>
                  <label className="form-label" htmlFor="select-target-class">Chá»n lá»›p má»›i <span className="text-danger">*</span></label>
                  <select
                    id="select-target-class"
                    className="form-input"
                    value={targetClassId}
                    onChange={(e) => setTargetClassId(e.target.value)}
                    required
                  >
                    <option value="">-- Chá»n lá»›p há»c --</option>
                    {classes
                      .filter((c) => c.id !== selectedStudent.classId)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.grade}) - SÄ© sá»‘ hiá»‡n táº¡i: {c.studentCount}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsMoveOpen(false)}
                >
                  Há»§y
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!targetClassId}
                >
                  XÃ¡c nháº­n chuyá»ƒn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
