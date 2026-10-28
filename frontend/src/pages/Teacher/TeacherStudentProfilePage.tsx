import React, { useEffect, useState, useMemo } from 'react'
import {
  ArrowLeft,
  Users,
  Award,
  CheckCircle2,
  Clock,
  Mail,
  Phone,
  Shield,
  MoveRight,
  AlertTriangle,
  FileText,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { classroomService } from '@/services/classroom.service'
import type {
  AdminClassItem,
  AdminGradeRecord,
  AdminStudentItem,
  AdminSubmissionItem,
} from '@/types/classroom'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import '../Admin/AdminPages.css'
import '@/components/admin/AdminComponents.css'

type ProfileTab = 'overview' | 'subjects' | 'assignments' | 'grades' | 'activities'

export const TeacherStudentProfilePage: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>()
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview')

  const [student, setStudent] = useState<AdminStudentItem | null>(null)
  const [classes, setClasses] = useState<AdminClassItem[]>([])
  const [submissions, setSubmissions] = useState<AdminSubmissionItem[]>([])
  const [grades, setGrades] = useState<AdminGradeRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Move Modal
  const [isMoveOpen, setIsMoveOpen] = useState(false)
  const [targetClassId, setTargetClassId] = useState('')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const loadData = () => {
    if (!studentId) return
    setLoading(true)
    Promise.all([
      classroomService.getStudentById(studentId),
      classroomService.getClasses(),
      classroomService.getSubmissions(),
      classroomService.getAllGrades(),
    ])
      .then(([stu, clsList, subList, grdList]) => {
        setStudent(stu)
        setClasses(clsList)
        setSubmissions(subList.filter((s) => s.studentId === studentId))
        setGrades(grdList.filter((g) => g.studentId === studentId))
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
      })
  }

  useEffect(() => {
    if (!studentId) return
    let active = true
    Promise.all([
      classroomService.getStudentById(studentId),
      classroomService.getClasses(),
      classroomService.getSubmissions(),
      classroomService.getAllGrades(),
    ])
      .then(([stu, clsList, subList, grdList]) => {
        if (active) {
          setStudent(stu)
          setClasses(clsList)
          setSubmissions(subList.filter((s) => s.studentId === studentId))
          setGrades(grdList.filter((g) => g.studentId === studentId))
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
  }, [studentId])

  // Handle Move Student
  const handleMoveClass = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!student || !targetClassId) return
    const targetClass = classes.find((c) => c.id === targetClassId)
    if (!targetClass) return

    try {
      await classroomService.moveStudentClass(student.id, targetClass.id, targetClass.name)
      showToast(`ÄÃ£ chuyá»ƒn há»c viÃªn ${student.name} sang lá»›p ${targetClass.name}`)
      setIsMoveOpen(false)
      loadData()
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message)
    }
  }

  // Mock subjects progress for the student
  const studentSubjects = useMemo(() => {
    if (!student) return []
    return [
      {
        id: 'sub-math-12',
        name: 'ToÃ¡n há»c 12',
        lessonsCompleted: student.lessonsCompleted,
        totalLessons: 24,
        progress: student.progress,
        score: student.averageScore,
        status: student.progress >= 70 ? 'Tá»‘t' : 'Cáº§n cá»‘ gáº¯ng',
      },
      {
        id: 'sub-phys-12',
        name: 'Váº­t lÃ½ 12',
        lessonsCompleted: Math.max(2, student.lessonsCompleted - 4),
        totalLessons: 20,
        progress: Math.max(20, student.progress - 15),
        score: Number((student.averageScore * 0.95).toFixed(1)),
        status: 'Äáº¡t chuáº©n',
      },
      {
        id: 'sub-chem-12',
        name: 'HÃ³a há»c 12',
        lessonsCompleted: Math.max(3, student.lessonsCompleted - 5),
        totalLessons: 22,
        progress: Math.max(15, student.progress - 20),
        score: Number((student.averageScore * 0.9).toFixed(1)),
        status: 'Äáº¡t chuáº©n',
      },
    ]
  }, [student])

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

  if (!student) {
    return (
      <div className="admin-page-container">
        <EmptyState
          title="KhÃ´ng tÃ¬m tháº¥y há»c viÃªn"
          description="Há»“ sÆ¡ há»c viÃªn khÃ´ng tá»“n táº¡i trong há»‡ thá»‘ng."
          actionLabel="Quay láº¡i danh sÃ¡ch há»c viÃªn"
          onAction={() => window.history.back()}
        />
      </div>
    )
  }

  const initials = student.name
    .split(' ')
    .map((w) => w[0])
    .slice(-2)
    .join('')
    .toUpperCase()

  return (
    <div className="admin-page-container">
      {/* Toast */}
      {toastMessage && (
        <div className="admin-toast-notification">
          <CheckCircle2 size={18} color="#047857" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Breadcrumb */}
      <div style={{ marginBottom: 16 }}>
        <Link
          to="/teacher/students"
          className="flex items-center gap-1.5 text-sm font-medium text-navy-primary hover:underline"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#102a43', fontSize: '0.88rem' }}
        >
          <ArrowLeft size={16} />
          <span>Quay láº¡i Quáº£n lÃ½ há»c viÃªn</span>
        </Link>
      </div>

      {/* Profile Header Card */}
      <div
        className="admin-card"
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          padding: '24px',
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: '#102a43',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '1.4rem',
                border: '3px solid #FFF9EA',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
            >
              {initials}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#102a43', margin: 0 }}>
                  {student.name}
                </h1>
                <code style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                  {student.code}
                </code>
                <span
                  className={`status-badge ${
                    student.status === 'on-track'
                      ? 'status-success'
                      : student.status === 'needs-attention'
                      ? 'status-danger'
                      : 'status-default'
                  }`}
                >
                  {student.status === 'on-track' ? 'Äang há»c tá»‘t' : student.status === 'needs-attention' ? 'Cáº§n há»— trá»£' : 'Nghá»‰'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8, fontSize: '0.88rem', color: '#627d98', flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Mail size={14} />
                  {student.email}
                </span>
                {student.phone && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Phone size={14} />
                    {student.phone}
                  </span>
                )}
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Users size={14} />
                  Lá»›p: <strong>{student.className}</strong> ({student.grade})
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setTargetClassId('')
                setIsMoveOpen(true)
              }}
            >
              <MoveRight size={16} />
              <span>Äá»•i lá»›p há»c</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5 Tabs Nav */}
      <div className="admin-roles-tabs" style={{ marginBottom: 24, borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 8 }}>
        <button
          type="button"
          className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: '6px 6px 0 0' }}
          onClick={() => setActiveTab('overview')}
        >
          Tá»•ng quan há»“ sÆ¡
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'subjects' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: '6px 6px 0 0' }}
          onClick={() => setActiveTab('subjects')}
        >
          Tiáº¿n Ä‘á»™ mÃ´n há»c
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'assignments' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: '6px 6px 0 0' }}
          onClick={() => setActiveTab('assignments')}
        >
          BÃ i táº­p & BÃ i ná»™p
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'grades' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: '6px 6px 0 0' }}
          onClick={() => setActiveTab('grades')}
        >
          Báº£ng Ä‘iá»ƒm chi tiáº¿t
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'activities' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: '6px 6px 0 0' }}
          onClick={() => setActiveTab('activities')}
        >
          Nháº­t kÃ½ há»c táº­p
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* 4 KPIs */}
          <div className="admin-kpi-grid">
            <div className="admin-kpi-card">
              <div className="kpi-top-row">
                <span className="kpi-label">Thá»i gian tá»± há»c</span>
                <div className="kpi-icon-wrap" style={{ background: 'rgba(16, 42, 67, 0.08)', color: '#102a43' }}>
                  <Clock size={18} />
                </div>
              </div>
              <div className="kpi-value-row">
                <span className="kpi-num">{Math.round(student.totalLearningMinutes / 60)} giá»</span>
                <span className="kpi-comparison">{student.totalLearningMinutes % 60} phÃºt tÆ°Æ¡ng tÃ¡c</span>
              </div>
            </div>

            <div className="admin-kpi-card">
              <div className="kpi-top-row">
                <span className="kpi-label">Tiáº¿n Ä‘á»™ tá»•ng thá»ƒ</span>
                <div className="kpi-icon-wrap" style={{ background: 'rgba(2, 132, 199, 0.08)', color: '#0284c7' }}>
                  <Award size={18} />
                </div>
              </div>
              <div className="kpi-value-row">
                <span className="kpi-num">{student.progress}%</span>
                <span className="kpi-comparison">{student.lessonsCompleted} bÃ i hoÃ n thÃ nh</span>
              </div>
            </div>

            <div className="admin-kpi-card">
              <div className="kpi-top-row">
                <span className="kpi-label">Äiá»ƒm TB há»c táº­p</span>
                <div className="kpi-icon-wrap" style={{ background: 'rgba(4, 120, 87, 0.08)', color: '#047857' }}>
                  <Award size={18} />
                </div>
              </div>
              <div className="kpi-value-row">
                <span className="kpi-num">{student.averageScore}</span>
                <span className="kpi-comparison">Thang Ä‘iá»ƒm 10</span>
              </div>
            </div>

            <div className="admin-kpi-card">
              <div className="kpi-top-row">
                <span className="kpi-label">Xáº¿p loáº¡i hiá»‡n táº¡i</span>
                <div className="kpi-icon-wrap" style={{ background: 'rgba(244, 185, 66, 0.15)', color: '#b45309' }}>
                  <Shield size={18} />
                </div>
              </div>
              <div className="kpi-value-row">
                <span className="kpi-num" style={{ fontSize: '1.25rem' }}>
                  {student.averageScore >= 8 ? 'Há»c sinh Giá»i' : student.averageScore >= 6.5 ? 'Há»c sinh KhÃ¡' : 'Cáº§n cá»‘ gáº¯ng'}
                </span>
                <span className="kpi-comparison">{student.status === 'on-track' ? 'Duy trÃ¬ phong Ä‘á»™' : 'Cáº§n kÃ¨m cáº·p'}</span>
              </div>
            </div>
          </div>

          {/* Strengths & Weak Areas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div className="admin-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 20 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#047857', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={18} />
                <span>Äiá»ƒm máº¡nh & Æ¯u tháº¿ há»c táº­p</span>
              </h3>
              {student.strengths && student.strengths.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.9rem', color: '#334e68' }}>
                  {student.strengths.map((st, i) => (
                    <li key={i}>{st}</li>
                  ))}
                </ul>
              ) : (
                <p style={{ margin: 0, color: '#627d98', fontSize: '0.88rem' }}>
                  Há»c viÃªn Ä‘ang duy trÃ¬ tiáº¿n Ä‘á»™ cÆ¡ báº£n trÃªn táº¥t cáº£ cÃ¡c há»c pháº§n.
                </p>
              )}
            </div>

            <div className="admin-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 20 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#b91c1c', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={18} />
                <span>Kiáº¿n thá»©c yáº¿u & Cáº§n há»— trá»£ can thiá»‡p</span>
              </h3>
              {student.weakAreas && student.weakAreas.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.9rem', color: '#b91c1c' }}>
                  {student.weakAreas.map((wk, i) => (
                    <li key={i}>{wk}</li>
                  ))}
                </ul>
              ) : (
                <p style={{ margin: 0, color: '#047857', fontSize: '0.88rem' }}>
                  KhÃ´ng phÃ¡t hiá»‡n lá»— há»•ng kiáº¿n thá»©c nghiÃªm trá»ng trong ká»³ há»c nÃ y.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SUBJECTS */}
      {activeTab === 'subjects' && (
        <div className="staff-table-wrapper">
          <table className="staff-table">
            <thead>
              <tr>
                <th>MÃ´n há»c</th>
                <th>Tiáº¿n Ä‘á»™ hoÃ n thÃ nh</th>
                <th>Sá»‘ bÃ i Ä‘Ã£ há»c</th>
                <th>Äiá»ƒm Ä‘Ã¡nh giÃ¡</th>
                <th>ÄÃ¡nh giÃ¡ tráº¡ng thÃ¡i</th>
              </tr>
            </thead>
            <tbody>
              {studentSubjects.map((sub) => (
                <tr key={sub.id}>
                  <td>
                    <strong style={{ color: '#102a43' }}>{sub.name}</strong>
                  </td>
                  <td>
                    <div style={{ minWidth: 140 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 2 }}>
                        <span>{sub.progress}%</span>
                      </div>
                      <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${sub.progress}%`, height: '100%', background: '#0284c7' }} />
                      </div>
                    </div>
                  </td>
                  <td>
                    {sub.lessonsCompleted} / {sub.totalLessons} bÃ i há»c
                  </td>
                  <td>
                    <strong style={{ color: sub.score >= 8 ? '#047857' : sub.score >= 6.5 ? '#0284c7' : '#dc2626' }}>
                      {sub.score}
                    </strong>
                  </td>
                  <td>
                    <span className="status-badge status-success">{sub.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: ASSIGNMENTS */}
      {activeTab === 'assignments' && (
        <div className="staff-table-wrapper">
          {submissions.length === 0 ? (
            <EmptyState
              title="ChÆ°a cÃ³ bÃ i táº­p nÃ o Ä‘Ã£ ná»™p"
              description="Há»c viÃªn chÆ°a cÃ³ bÃ i táº­p ná»™p trong danh má»¥c bÃ i táº­p cá»§a lá»›p."
            />
          ) : (
            <table className="staff-table">
              <thead>
                <tr>
                  <th>TiÃªu Ä‘á» bÃ i táº­p</th>
                  <th>Thá»i gian ná»™p</th>
                  <th>Äiá»ƒm sá»‘</th>
                  <th>Nháº­n xÃ©t cá»§a giÃ¡o viÃªn</th>
                  <th>Tráº¡ng thÃ¡i</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub) => (
                  <tr key={sub.id}>
                    <td>
                      <strong style={{ color: '#102a43' }}>{sub.assignmentTitle}</strong>
                    </td>
                    <td>
                      {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString('vi-VN') : 'ChÆ°a ná»™p'}
                    </td>
                    <td>
                      <strong style={{ color: sub.score && sub.score >= 8 ? '#047857' : '#0284c7' }}>
                        {sub.score !== undefined ? `${sub.score} / ${sub.maxScore}` : 'ChÆ°a cháº¥m'}
                      </strong>
                    </td>
                    <td style={{ maxWidth: 280 }}>
                      <span style={{ fontSize: '0.85rem', color: '#334e68' }}>
                        {sub.feedback || 'ChÆ°a cÃ³ nháº­n xÃ©t'}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`status-badge ${
                          sub.status === 'graded'
                            ? 'status-success'
                            : sub.status === 'pending'
                            ? 'status-warning'
                            : 'status-danger'
                        }`}
                      >
                        {sub.status === 'graded' ? 'ÄÃ£ cháº¥m' : sub.status === 'pending' ? 'Chá» cháº¥m' : 'ChÆ°a ná»™p'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TAB 4: GRADES */}
      {activeTab === 'grades' && (
        <div className="staff-table-wrapper">
          {grades.length === 0 ? (
            <EmptyState
              title="ChÆ°a cÃ³ báº£ng Ä‘iá»ƒm"
              description="ChÆ°a cÃ³ káº¿t quáº£ kiá»ƒm tra hoáº·c bÃ i thu hoáº¡ch cho há»c viÃªn nÃ y."
            />
          ) : (
            <table className="staff-table">
              <thead>
                <tr>
                  <th>BÃ i kiá»ƒm tra / Thu hoáº¡ch</th>
                  <th>MÃ´n há»c</th>
                  <th>Loáº¡i bÃ i</th>
                  <th>Äiá»ƒm sá»‘</th>
                  <th>Káº¿t quáº£</th>
                  <th>NgÃ y lÃ m bÃ i</th>
                </tr>
              </thead>
              <tbody>
                {grades.map((grd) => (
                  <tr key={grd.id}>
                    <td>
                      <strong style={{ color: '#102a43' }}>{grd.activityTitle}</strong>
                    </td>
                    <td>{grd.subjectName}</td>
                    <td>
                      <span className="status-badge status-default">
                        {grd.activityType === 'assignment' ? 'BÃ i táº­p' : 'Thu hoáº¡ch'}
                      </span>
                    </td>
                    <td>
                      <strong
                        style={{
                          fontSize: '0.95rem',
                          color: grd.score >= 8 ? '#047857' : grd.score >= 6.5 ? '#0284c7' : '#dc2626',
                        }}
                      >
                        {grd.score} / {grd.maxScore}
                      </strong>
                    </td>
                    <td>
                      <span className={`status-badge ${grd.passed ? 'status-success' : 'status-danger'}`}>
                        {grd.passed ? 'Äáº¡t' : 'ChÆ°a Ä‘áº¡t'}
                      </span>
                    </td>
                    <td>{new Date(grd.date).toLocaleDateString('vi-VN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TAB 5: ACTIVITIES */}
      {activeTab === 'activities' && (
        <div style={{ maxWidth: 640 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#102a43', marginBottom: 16 }}>
            Nháº­t kÃ½ truy cáº­p vÃ  tÆ°Æ¡ng tÃ¡c há»c táº­p
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ padding: '14px 18px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, display: 'flex', gap: 12 }}>
              <Clock size={16} color="#047857" style={{ marginTop: 2 }} />
              <div>
                <strong style={{ fontSize: '0.9rem', color: '#102a43' }}>ÄÄƒng nháº­p vÃ  hoÃ n thÃ nh bÃ i há»c ToÃ¡n 12</strong>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#627d98' }}>
                  {new Date(student.lastActive).toLocaleString('vi-VN')} â€¢ BÃ i: Kháº£o sÃ¡t vÃ  váº½ Ä‘á»“ thá»‹ hÃ m sá»‘
                </p>
              </div>
            </div>
            <div style={{ padding: '14px 18px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, display: 'flex', gap: 12 }}>
              <FileText size={16} color="#0284c7" style={{ marginTop: 2 }} />
              <div>
                <strong style={{ fontSize: '0.9rem', color: '#102a43' }}>Ná»™p bÃ i táº­p trá»±c tuyáº¿n</strong>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#627d98' }}>
                  BÃ i táº­p phÆ°Æ¡ng trÃ¬nh phÃ¢n thá»©c â€¢ Äiá»ƒm sá»‘ ghi nháº­n: {student.averageScore}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Äá»”I Lá»šP */}
      {isMoveOpen && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true">
          <div className="admin-modal-card" style={{ maxWidth: 440 }}>
            <div className="admin-modal-header">
              <h3 className="modal-title">Äá»•i lá»›p há»c cho {student.name}</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsMoveOpen(false)}
              >
                âœ•
              </button>
            </div>

            <form onSubmit={handleMoveClass}>
              <div className="admin-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#334e68' }}>
                  Há»c viÃªn hiá»‡n Ä‘ang thuá»™c lá»›p <strong>{student.className}</strong>.
                </p>

                <div>
                  <label className="form-label" htmlFor="new-class-select">Chá»n lá»›p há»c má»›i <span className="text-danger">*</span></label>
                  <select
                    id="new-class-select"
                    className="form-input"
                    value={targetClassId}
                    onChange={(e) => setTargetClassId(e.target.value)}
                    required
                  >
                    <option value="">-- Chá»n lá»›p há»c --</option>
                    {classes
                      .filter((c) => c.id !== student.classId)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.grade}) - SÄ© sá»‘: {c.studentCount}
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
                  XÃ¡c nháº­n Ä‘á»•i lá»›p
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
