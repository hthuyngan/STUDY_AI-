import React, { useEffect, useState, useMemo } from 'react'
import {
  ArrowLeft,
  Users,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  Plus,
  Search,
  Trash2,
  MoveRight,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { classroomService } from '@/services/classroom.service'
import type {
  AdminAssignmentItem,
  AdminClassItem,
  AdminStudentItem,
  ClassActivityItem,
} from '@/types/classroom'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import './AdminPages.css'
import '@/components/admin/AdminComponents.css'

type TabType = 'overview' | 'students' | 'assignments' | 'grades' | 'activities'

export const AdminClassDetailPage: React.FC = () => {
  const { classId } = useParams<{ classId: string }>()
  const [activeTab, setActiveTab] = useState<TabType>('overview')

  const [classData, setClassData] = useState<AdminClassItem | null>(null)
  const [allClasses, setAllClasses] = useState<AdminClassItem[]>([])
  const [students, setStudents] = useState<AdminStudentItem[]>([])
  const [assignments, setAssignments] = useState<AdminAssignmentItem[]>([])
  const [activities, setActivities] = useState<ClassActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  // Modals
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false)
  const [isMoveStudentOpen, setIsMoveStudentOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<AdminStudentItem | null>(null)
  const [targetClassId, setTargetClassId] = useState('')

  // New Student Form
  const [newStudentForm, setNewStudentForm] = useState({
    name: '',
    email: '',
    phone: '',
    code: '',
  })
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const loadData = () => {
    if (!classId) return
    setLoading(true)
    Promise.all([
      classroomService.getClassById(classId),
      classroomService.getClasses(),
      classroomService.getStudentsByClass(classId),
      classroomService.getAssignmentsByClass(classId),
      classroomService.getClassActivities(classId),
    ])
      .then(([cls, classesList, stuList, asgList, actList]) => {
        setClassData(cls)
        setAllClasses(classesList)
        setStudents(stuList)
        setAssignments(asgList)
        setActivities(actList)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
      })
  }

  useEffect(() => {
    if (!classId) return
    let active = true
    Promise.all([
      classroomService.getClassById(classId),
      classroomService.getClasses(),
      classroomService.getStudentsByClass(classId),
      classroomService.getAssignmentsByClass(classId),
      classroomService.getClassActivities(classId),
    ])
      .then(([cls, classesList, stuList, asgList, actList]) => {
        if (active) {
          setClassData(cls)
          setAllClasses(classesList)
          setStudents(stuList)
          setAssignments(asgList)
          setActivities(actList)
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
  }, [classId])

  // Student Filter
  const [studentSearch, setStudentSearch] = useState('')
  const filteredStudents = useMemo(() => {
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.email.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.code.toLowerCase().includes(studentSearch.toLowerCase())
    )
  }, [students, studentSearch])

  // Grade distributions
  const gradeDistribution = useMemo(() => {
    const dist = { excellent: 0, good: 0, average: 0, weak: 0 }
    students.forEach((s) => {
      if (s.averageScore >= 8.0) dist.excellent++
      else if (s.averageScore >= 6.5) dist.good++
      else if (s.averageScore >= 5.0) dist.average++
      else dist.weak++
    })
    return dist
  }, [students])

  // Handle Add Student
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!classData) return
    if (!newStudentForm.name.trim() || !newStudentForm.email.trim()) {
      alert('Vui lòng nhập họ tên và email học viên')
      return
    }

    try {
      const generatedCode = newStudentForm.code.trim() || `HV-${Date.now().toString().slice(-5)}`
      await classroomService.addStudentToClass({
        name: newStudentForm.name.trim(),
        email: newStudentForm.email.trim(),
        phone: newStudentForm.phone.trim(),
        code: generatedCode,
        classId: classData.id,
        className: classData.name,
        grade: classData.grade,
        progress: 0,
        lessonsCompleted: 0,
        averageScore: 0,
        totalLearningMinutes: 0,
        lastActive: new Date().toISOString(),
        status: 'on-track',
      })

      await classroomService.addClassActivity(
        classData.id,
        'Thêm học viên mới',
        `Học viên ${newStudentForm.name} (${generatedCode}) đã được thêm vào lớp`
      )

      showToast(`Đã thêm thành công học viên ${newStudentForm.name} vào lớp`)
      setIsAddStudentOpen(false)
      setNewStudentForm({ name: '', email: '', phone: '', code: '' })
      loadData()
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message)
    }
  }

  // Handle Move Student
  const handleMoveStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStudent || !targetClassId) return
    const targetClass = allClasses.find((c) => c.id === targetClassId)
    if (!targetClass) return

    try {
      await classroomService.moveStudentClass(selectedStudent.id, targetClass.id, targetClass.name)
      if (classData) {
        await classroomService.addClassActivity(
          classData.id,
          'Chuyển lớp học viên',
          `Học viên ${selectedStudent.name} đã được chuyển sang lớp ${targetClass.name}`
        )
      }
      showToast(`Đã chuyển học viên ${selectedStudent.name} sang ${targetClass.name}`)
      setIsMoveStudentOpen(false)
      setSelectedStudent(null)
      loadData()
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message)
    }
  }

  // Handle Remove Student
  const handleRemoveStudent = async (stu: AdminStudentItem) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa học viên "${stu.name}" khỏi lớp này?`)) {
      try {
        await classroomService.removeStudentFromClass(stu.id)
        if (classData) {
          await classroomService.addClassActivity(
            classData.id,
            'Xóa học viên khỏi lớp',
            `Đã xóa học viên ${stu.name} khỏi danh sách lớp`
          )
        }
        showToast(`Đã xóa học viên ${stu.name} khỏi lớp`)
        loadData()
      } catch (err: unknown) {
        if (err instanceof Error) alert(err.message)
      }
    }
  }

  // Export Class Grades CSV
  const handleExportGradesCSV = () => {
    if (!classData) return
    const headers = ['Mã HV', 'Họ và tên', 'Email', 'Tiến độ (%)', 'Bài đã học', 'Điểm TB', 'Xếp loại', 'Trạng thái']
    const rows = students.map((s) => [
      s.code,
      s.name,
      s.email,
      `${s.progress}%`,
      s.lessonsCompleted,
      s.averageScore,
      s.averageScore >= 8 ? 'Giỏi' : s.averageScore >= 6.5 ? 'Khá' : s.averageScore >= 5 ? 'Trung bình' : 'Yếu',
      s.status === 'on-track' ? 'Đang học tốt' : s.status === 'needs-attention' ? 'Cần chú ý' : 'Ngừng hoạt động',
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
    link.download = `Bang_diem_${classData.code}_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showToast('Đã xuất bảng điểm lớp thành công')
  }

  if (loading) {
    return (
      <div className="admin-page-container" style={{ padding: '32px' }}>
        <Skeleton height={40} width={250} />
        <div style={{ marginTop: 24 }}>
          <Skeleton height={200} />
        </div>
      </div>
    )
  }

  if (!classData) {
    return (
      <div className="admin-page-container">
        <EmptyState
          title="Không tìm thấy lớp học"
          description="Lớp học bạn đang tìm kiếm không tồn tại hoặc đã bị xóa."
          actionLabel="Quay lại danh sách lớp học"
          onAction={() => window.history.back()}
        />
      </div>
    )
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

      {/* Header with Breadcrumb */}
      <div className="staff-page-header">
        <div style={{ marginBottom: 12 }}>
          <Link
            to="/admin/classes"
            className="flex items-center gap-1.5 text-sm font-medium text-navy-primary hover:underline"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#102a43', fontSize: '0.88rem' }}
          >
            <ArrowLeft size={16} />
            <span>Quay lại Quản lý lớp học</span>
          </Link>
        </div>

        <div className="admin-header-row">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 className="staff-page-title" style={{ margin: 0 }}>
                {classData.name}
              </h1>
              <span style={{ background: '#f1f5f9', color: '#102a43', padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontSize: '0.85rem' }}>
                MÃ: {classData.code}
              </span>
              <span className={`status-badge ${classData.status === 'active' ? 'status-success' : 'status-default'}`}>
                {classData.status === 'active' ? 'Đang hoạt động' : 'Đã kết thúc'}
              </span>
            </div>
            <p className="staff-page-desc" style={{ marginTop: 6 }}>
              {classData.grade} • Giáo viên: <strong>{classData.homeroomTeacherName}</strong> • Phòng {classData.room} • Năm học {classData.academicYear}
            </p>
          </div>

          <div className="admin-header-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setIsAddStudentOpen(true)}
            >
              <Plus size={16} />
              <span>Thêm học viên vào lớp</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5 Navigation Tabs */}
      <div className="admin-roles-tabs" style={{ marginBottom: 24, borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 8 }}>
        <button
          type="button"
          className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: '6px 6px 0 0' }}
          onClick={() => setActiveTab('overview')}
        >
          Tổng quan
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'students' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: '6px 6px 0 0' }}
          onClick={() => setActiveTab('students')}
        >
          Học viên ({students.length})
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'assignments' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: '6px 6px 0 0' }}
          onClick={() => setActiveTab('assignments')}
        >
          Bài tập ({assignments.length})
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'grades' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: '6px 6px 0 0' }}
          onClick={() => setActiveTab('grades')}
        >
          Kết quả học tập
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'activities' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: '6px 6px 0 0' }}
          onClick={() => setActiveTab('activities')}
        >
          Hoạt động ({activities.length})
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* 4 Mini KPIs */}
          <div className="admin-kpi-grid">
            <div className="admin-kpi-card">
              <div className="kpi-top-row">
                <span className="kpi-label">Sĩ số lớp</span>
                <div className="kpi-icon-wrap" style={{ background: 'rgba(16, 42, 67, 0.08)', color: '#102a43' }}>
                  <Users size={18} />
                </div>
              </div>
              <div className="kpi-value-row">
                <span className="kpi-num">{students.length} / {classData.maxStudents}</span>
                <span className="kpi-comparison">Học viên</span>
              </div>
            </div>

            <div className="admin-kpi-card">
              <div className="kpi-top-row">
                <span className="kpi-label">Tiến độ trung bình</span>
                <div className="kpi-icon-wrap" style={{ background: 'rgba(2, 132, 199, 0.08)', color: '#0284c7' }}>
                  <Award size={18} />
                </div>
              </div>
              <div className="kpi-value-row">
                <span className="kpi-num">{classData.averageProgress}%</span>
                <span className="kpi-comparison">Toàn bộ môn</span>
              </div>
            </div>

            <div className="admin-kpi-card">
              <div className="kpi-top-row">
                <span className="kpi-label">Điểm trung bình lớp</span>
                <div className="kpi-icon-wrap" style={{ background: 'rgba(4, 120, 87, 0.08)', color: '#047857' }}>
                  <Award size={18} />
                </div>
              </div>
              <div className="kpi-value-row">
                <span className="kpi-num">{classData.averageScore}</span>
                <span className="kpi-comparison">Thang điểm 10</span>
              </div>
            </div>

            <div className="admin-kpi-card">
              <div className="kpi-top-row">
                <span className="kpi-label">Bài tập hoạt động</span>
                <div className="kpi-icon-wrap" style={{ background: 'rgba(244, 185, 66, 0.15)', color: '#b45309' }}>
                  <BookOpen size={18} />
                </div>
              </div>
              <div className="kpi-value-row">
                <span className="kpi-num">{assignments.filter((a) => a.status === 'active').length}</span>
                <span className="kpi-comparison">Đang mở nộp</span>
              </div>
            </div>
          </div>

          {/* Details & Grade Distribution Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div className="admin-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 20 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#102a43', margin: '0 0 16px 0' }}>
                Thông tin lớp học
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #f1f5f9', paddingBottom: 8 }}>
                  <span style={{ color: '#627d98' }}>Khối lớp:</span>
                  <span style={{ fontWeight: 600 }}>{classData.grade}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #f1f5f9', paddingBottom: 8 }}>
                  <span style={{ color: '#627d98' }}>Giáo viên chủ nhiệm:</span>
                  <span style={{ fontWeight: 600 }}>{classData.homeroomTeacherName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #f1f5f9', paddingBottom: 8 }}>
                  <span style={{ color: '#627d98' }}>Phòng học cố định:</span>
                  <span style={{ fontWeight: 600 }}>{classData.room}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #f1f5f9', paddingBottom: 8 }}>
                  <span style={{ color: '#627d98' }}>Năm học:</span>
                  <span style={{ fontWeight: 600 }}>{classData.academicYear}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #f1f5f9', paddingBottom: 8 }}>
                  <span style={{ color: '#627d98' }}>Ngày khởi tạo:</span>
                  <span>{new Date(classData.createdAt).toLocaleDateString('vi-VN')}</span>
                </div>
                <div>
                  <span style={{ color: '#627d98', display: 'block', marginBottom: 4 }}>Mô tả định hướng:</span>
                  <p style={{ margin: 0, color: '#334e68', fontStyle: 'italic', background: '#f8fafc', padding: 8, borderRadius: 4 }}>
                    {classData.description || 'Chưa có thông tin mô tả chi tiết.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="admin-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 20 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#102a43', margin: '0 0 16px 0' }}>
                Phân bố học lực của lớp
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 4 }}>
                    <span>Giỏi (8.0 - 10.0)</span>
                    <strong style={{ color: '#047857' }}>{gradeDistribution.excellent} học viên</strong>
                  </div>
                  <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: students.length > 0 ? `${(gradeDistribution.excellent / students.length) * 100}%` : '0%',
                        height: '100%',
                        background: '#047857',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 4 }}>
                    <span>Khá (6.5 - 7.9)</span>
                    <strong style={{ color: '#0284c7' }}>{gradeDistribution.good} học viên</strong>
                  </div>
                  <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: students.length > 0 ? `${(gradeDistribution.good / students.length) * 100}%` : '0%',
                        height: '100%',
                        background: '#0284c7',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 4 }}>
                    <span>Trung bình (5.0 - 6.4)</span>
                    <strong style={{ color: '#f59e0b' }}>{gradeDistribution.average} học viên</strong>
                  </div>
                  <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: students.length > 0 ? `${(gradeDistribution.average / students.length) * 100}%` : '0%',
                        height: '100%',
                        background: '#f59e0b',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 4 }}>
                    <span>Cần cải thiện (&lt; 5.0)</span>
                    <strong style={{ color: '#dc2626' }}>{gradeDistribution.weak} học viên</strong>
                  </div>
                  <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: students.length > 0 ? `${(gradeDistribution.weak / students.length) * 100}%` : '0%',
                        height: '100%',
                        background: '#dc2626',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STUDENTS */}
      {activeTab === 'students' && (
        <div>
          <div className="admin-filter-bar" style={{ marginBottom: 16 }}>
            <div className="admin-search-input-wrap">
              <Search size={16} className="admin-search-icon" />
              <input
                type="text"
                className="admin-search-input"
                placeholder="Tìm theo tên học viên, email hoặc mã HV..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setIsAddStudentOpen(true)}
            >
              <Plus size={16} />
              <span>Thêm học viên</span>
            </button>
          </div>

          <div className="staff-table-wrapper">
            {filteredStudents.length === 0 ? (
              <EmptyState
                title="Chưa có học viên nào trong lớp"
                description="Bấm 'Thêm học viên' để ghi danh học sinh vào lớp học này."
                actionLabel="Thêm học viên mới"
                onAction={() => setIsAddStudentOpen(true)}
              />
            ) : (
              <table className="staff-table">
                <thead>
                  <tr>
                    <th>Học viên</th>
                    <th>Tiến độ</th>
                    <th>Bài đã hoàn thành</th>
                    <th>Điểm TB</th>
                    <th>Hoạt động cuối</th>
                    <th>Trạng thái</th>
                    <th style={{ textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((stu) => (
                    <tr key={stu.id}>
                      <td>
                        <div>
                          <Link
                            to={`/admin/students/${stu.id}`}
                            className="font-medium text-navy-primary hover:underline"
                            style={{ fontWeight: 600, color: '#102a43' }}
                          >
                            {stu.name}
                          </Link>
                          <div style={{ fontSize: '0.78rem', color: '#627d98' }}>
                            {stu.code} • {stu.email}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ minWidth: 90 }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{stu.progress}%</span>
                          <div style={{ height: 4, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden', marginTop: 2 }}>
                            <div style={{ width: `${stu.progress}%`, height: '100%', background: '#0284c7' }} />
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 500 }}>{stu.lessonsCompleted} bài</span>
                      </td>
                      <td>
                        <span
                          style={{
                            fontWeight: 700,
                            color: stu.averageScore >= 8 ? '#047857' : stu.averageScore >= 6.5 ? '#0284c7' : '#dc2626',
                          }}
                        >
                          {stu.averageScore > 0 ? stu.averageScore : '—'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', color: '#627d98' }}>
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
                          {stu.status === 'on-track' ? 'Đang học tốt' : stu.status === 'needs-attention' ? 'Cần hỗ trợ' : 'Nghỉ'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="table-actions" style={{ justifyContent: 'flex-end', gap: 6 }}>
                          <Link
                            to={`/admin/students/${stu.id}`}
                            className="table-action-btn"
                            title="Xem hồ sơ học tập"
                          >
                            <Eye size={16} />
                          </Link>
                          <button
                            type="button"
                            className="table-action-btn"
                            onClick={() => {
                              setSelectedStudent(stu)
                              setTargetClassId('')
                              setIsMoveStudentOpen(true)
                            }}
                            title="Chuyển lớp"
                          >
                            <MoveRight size={16} />
                          </button>
                          <button
                            type="button"
                            className="table-action-btn text-danger"
                            onClick={() => handleRemoveStudent(stu)}
                            title="Xóa khỏi lớp"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: ASSIGNMENTS */}
      {activeTab === 'assignments' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: '0.9rem', color: '#627d98' }}>
              Danh sách các bài tập đã giao cho học viên trong lớp {classData.name}.
            </span>
            <Link to="/admin/assignments" className="btn btn-primary">
              <Plus size={16} />
              <span>Giao bài tập mới</span>
            </Link>
          </div>

          <div className="staff-table-wrapper">
            {assignments.length === 0 ? (
              <EmptyState
                title="Chưa có bài tập nào cho lớp"
                description="Tạo bài tập để giao cho học sinh ôn tập kiến thức."
                actionLabel="Tạo bài tập mới"
                onAction={() => (window.location.href = '/admin/assignments')}
              />
            ) : (
              <table className="staff-table">
                <thead>
                  <tr>
                    <th>Tiêu đề bài tập</th>
                    <th>Môn học</th>
                    <th>Hạn nộp</th>
                    <th>Tỷ lệ nộp</th>
                    <th>Điểm TB</th>
                    <th>Trạng thái</th>
                    <th style={{ textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((asg) => (
                    <tr key={asg.id}>
                      <td>
                        <Link
                          to={`/admin/assignments/${asg.id}`}
                          className="font-medium text-navy-primary hover:underline"
                          style={{ fontWeight: 600, color: '#102a43' }}
                        >
                          {asg.title}
                        </Link>
                      </td>
                      <td>
                        <span className="status-badge status-default">{asg.subjectName}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                          <Calendar size={14} color="#627d98" />
                          <span>{new Date(asg.dueDate).toLocaleDateString('vi-VN')}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ minWidth: 100 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 2 }}>
                            <span>{asg.submissionsCount} / {asg.totalStudents}</span>
                            <span>{Math.round((asg.submissionsCount / asg.totalStudents) * 100)}%</span>
                          </div>
                          <div style={{ height: 4, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${Math.round((asg.submissionsCount / asg.totalStudents) * 100)}%`,
                                height: '100%',
                                background: '#047857',
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td>
                        <strong style={{ color: asg.averageScore ? '#047857' : '#627d98' }}>
                          {asg.averageScore ? asg.averageScore : '—'}
                        </strong>
                      </td>
                      <td>
                        <span className={`status-badge ${asg.status === 'active' ? 'status-success' : 'status-default'}`}>
                          {asg.status === 'active' ? 'Đang mở' : 'Đã kết thúc'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Link
                          to={`/admin/assignments/${asg.id}`}
                          className="table-action-btn"
                          title="Xem chi tiết bài nộp"
                        >
                          <Eye size={16} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: GRADES */}
      {activeTab === 'grades' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: '0.9rem', color: '#627d98' }}>
              Bảng điểm tổng hợp của lớp {classData.name} qua các bài tập và thu hoạch.
            </span>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleExportGradesCSV}
            >
              <Download size={16} />
              <span>Xuất bảng điểm (CSV)</span>
            </button>
          </div>

          <div className="staff-table-wrapper">
            <table className="staff-table">
              <thead>
                <tr>
                  <th>Mã HV</th>
                  <th>Học viên</th>
                  <th>Tiến độ (%)</th>
                  <th>Bài hoàn thành</th>
                  <th>Điểm TB</th>
                  <th>Xếp loại học lực</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {students.map((stu) => {
                  const rating =
                    stu.averageScore >= 8.0
                      ? 'Giỏi'
                      : stu.averageScore >= 6.5
                      ? 'Khá'
                      : stu.averageScore >= 5.0
                      ? 'Trung bình'
                      : 'Yếu'
                  return (
                    <tr key={stu.id}>
                      <td>
                        <code>{stu.code}</code>
                      </td>
                      <td>
                        <Link
                          to={`/admin/students/${stu.id}`}
                          className="font-medium text-navy-primary hover:underline"
                          style={{ fontWeight: 600, color: '#102a43' }}
                        >
                          {stu.name}
                        </Link>
                      </td>
                      <td>
                        <strong>{stu.progress}%</strong>
                      </td>
                      <td>{stu.lessonsCompleted} bài</td>
                      <td>
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: '0.92rem',
                            color: stu.averageScore >= 8 ? '#047857' : stu.averageScore >= 6.5 ? '#0284c7' : '#dc2626',
                          }}
                        >
                          {stu.averageScore}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`status-badge ${
                            rating === 'Giỏi'
                              ? 'status-success'
                              : rating === 'Khá'
                              ? 'status-info'
                              : rating === 'Trung bình'
                              ? 'status-warning'
                              : 'status-danger'
                          }`}
                        >
                          {rating}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${stu.status === 'on-track' ? 'status-success' : 'status-danger'}`}>
                          {stu.status === 'on-track' ? 'Đạt chuẩn' : 'Cần hỗ trợ'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: ACTIVITIES */}
      {activeTab === 'activities' && (
        <div style={{ maxWidth: 700 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#102a43', marginBottom: 16 }}>
            Dòng thời gian hoạt động của lớp
          </h3>
          {activities.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#627d98', background: '#fff', borderRadius: 8 }}>
              Chưa có hoạt động nào được ghi lại cho lớp học này.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {activities.map((act) => (
                <div
                  key={act.id}
                  style={{
                    display: 'flex',
                    gap: 14,
                    padding: '14px 18px',
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: 'rgba(16, 42, 67, 0.08)',
                      color: '#102a43',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Clock size={18} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <strong style={{ fontSize: '0.92rem', color: '#102a43' }}>{act.action}</strong>
                      <span style={{ fontSize: '0.78rem', color: '#627d98' }}>
                        {new Date(act.timestamp).toLocaleString('vi-VN')}
                      </span>
                    </div>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#334e68' }}>
                      {act.detail}
                    </p>
                    <div style={{ marginTop: 4, fontSize: '0.78rem', color: '#94a3b8' }}>
                      Thực hiện bởi: {act.actor}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: THÊM HỌC VIÊN */}
      {isAddStudentOpen && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true">
          <div className="admin-modal-card" style={{ maxWidth: 460 }}>
            <div className="admin-modal-header">
              <h3 className="modal-title">Thêm học viên vào {classData.name}</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsAddStudentOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddStudent}>
              <div className="admin-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label className="form-label" htmlFor="student-name">Họ và tên <span className="text-danger">*</span></label>
                  <input
                    id="student-name"
                    type="text"
                    className="form-input"
                    placeholder="VD: Nguyễn Văn An"
                    value={newStudentForm.name}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="form-label" htmlFor="student-email">Email <span className="text-danger">*</span></label>
                  <input
                    id="student-email"
                    type="email"
                    className="form-input"
                    placeholder="VD: an.nguyen@example.com"
                    value={newStudentForm.email}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, email: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label" htmlFor="student-phone">Số điện thoại</label>
                    <input
                      id="student-phone"
                      type="text"
                      className="form-input"
                      placeholder="09xx..."
                      value={newStudentForm.phone}
                      onChange={(e) => setNewStudentForm({ ...newStudentForm, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="form-label" htmlFor="student-code">Mã học viên (tùy chọn)</label>
                    <input
                      id="student-code"
                      type="text"
                      className="form-input"
                      placeholder="VD: HV-12009"
                      value={newStudentForm.code}
                      onChange={(e) => setNewStudentForm({ ...newStudentForm, code: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsAddStudentOpen(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Xác nhận thêm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CHUYỂN LỚP */}
      {isMoveStudentOpen && selectedStudent && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true">
          <div className="admin-modal-card" style={{ maxWidth: 440 }}>
            <div className="admin-modal-header">
              <h3 className="modal-title">Chuyển lớp học cho học viên</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsMoveStudentOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleMoveStudent}>
              <div className="admin-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#334e68' }}>
                  Bạn đang chuyển học viên <strong>{selectedStudent.name}</strong> ({selectedStudent.code}) từ lớp hiện tại:
                </p>
                <div style={{ background: '#f8fafc', padding: 10, borderRadius: 6, fontWeight: 600 }}>
                  Lớp hiện tại: {classData.name} ({classData.grade})
                </div>

                <div>
                  <label className="form-label" htmlFor="target-class">Chọn lớp chuyển đến <span className="text-danger">*</span></label>
                  <select
                    id="target-class"
                    className="form-input"
                    value={targetClassId}
                    onChange={(e) => setTargetClassId(e.target.value)}
                    required
                  >
                    <option value="">-- Chọn lớp học đích --</option>
                    {allClasses
                      .filter((c) => c.id !== classData.id)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.grade}) - Sĩ số: {c.studentCount}/{c.maxStudents}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsMoveStudentOpen(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!targetClassId}
                >
                  Xác nhận chuyển lớp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
