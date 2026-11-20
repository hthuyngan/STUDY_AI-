import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Award,
  BookOpen,
  Brain,
  CheckCircle2,
  Layers,
  Send,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import { teacherManagementService } from '@/services/teacherManagement.service';
import type {
  TeacherClassroomSummary,
  ClassroomAnalytics,
  TeachingRecommendation,
  RemedialInterventionOutcome,
  AtRiskStudentItem,
} from '@/types/teacherManagement';
import './TeacherPages.css';
import '../Admin/AdminPages.css';

export const TeacherAnalyticsDashboard: React.FC = () => {
  const [classrooms, setClassrooms] = useState<TeacherClassroomSummary[]>([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>('');
  const [analytics, setAnalytics] = useState<ClassroomAnalytics | null>(null);
  const [recommendations, setRecommendations] = useState<TeachingRecommendation[]>([]);
  const [interventions, setInterventions] = useState<RemedialInterventionOutcome[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Intervention Modal State
  const [targetStudent, setTargetStudent] = useState<AtRiskStudentItem | null>(null);
  const [interventionTopic, setInterventionTopic] = useState<string>('');
  const [interventionNotes, setInterventionNotes] = useState<string>('');
  const [isSubmittingIntervention, setIsSubmittingIntervention] = useState<boolean>(false);
  const [interventionSuccessMsg, setInterventionSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    teacherManagementService
      .getTeacherClassrooms()
      .then((cls) => {
        if (!active) return;
        setClassrooms(cls);
        if (cls.length > 0) {
          setSelectedClassroomId(cls[0].classroomId);
        } else {
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'Không thể tải danh sách lớp học');
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedClassroomId) return;
    setLoading(true);
    setError(null);
    let active = true;

    Promise.all([
      teacherManagementService.getClassroomAnalytics(selectedClassroomId),
      teacherManagementService.getCohortRecommendations(selectedClassroomId),
      teacherManagementService.getClassroomInterventions(selectedClassroomId),
    ])
      .then(([analyticData, recData, intData]) => {
        if (!active) return;
        setAnalytics(analyticData);
        setRecommendations(recData);
        setInterventions(intData);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'Lỗi khi tải dữ liệu phân tích lớp học');
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedClassroomId]);

  const handleOpenInterventionModal = (student: AtRiskStudentItem) => {
    setTargetStudent(student);
    setInterventionTopic(student.primaryWeakTopic || 'Toán 12');
    setInterventionNotes('Yêu cầu ôn luyện các bài tập cốt lõi để nâng cao chỉ số thành thạo.');
    setInterventionSuccessMsg(null);
  };

  const handleCloseModal = () => {
    setTargetStudent(null);
    setInterventionSuccessMsg(null);
  };

  const handleSendIntervention = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStudent || !selectedClassroomId) return;

    setIsSubmittingIntervention(true);
    try {
      const outcome = await teacherManagementService.assignRemedialIntervention({
        classroomId: selectedClassroomId,
        targetStudentIds: [targetStudent.studentId],
        title: `Gói can thiệp bổ trợ: ${interventionTopic}`,
        targetTopic: interventionTopic,
        instructions: interventionNotes,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        questionCount: 10,
      });

      setInterventions((prev) => [outcome, ...prev]);
      setInterventionSuccessMsg('Đã giao bài tập can thiệp thành công cho học sinh!');
      setTimeout(() => {
        handleCloseModal();
      }, 1500);
    } catch (err: unknown) {
      alert((err as Error).message || 'Không thể giao bài can thiệp');
    } finally {
      setIsSubmittingIntervention(false);
    }
  };

  return (
    <div className="admin-page-container" style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
            Bảng điều khiển Sư phạm & Phân tích Lớp học
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>
            Theo dõi năng lực học sinh, phát hiện chuyên đề yếu và giao nhiệm vụ can thiệp cá nhân hóa
          </p>
        </div>

        {/* Classroom selector */}
        {classrooms.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 500, color: '#475569' }}>Lớp:</span>
            <select
              value={selectedClassroomId}
              onChange={(e) => setSelectedClassroomId(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                fontWeight: 600,
                color: '#0f172a',
                backgroundColor: '#ffffff',
                cursor: 'pointer',
              }}
            >
              {classrooms.map((c) => (
                <option key={c.classroomId} value={c.classroomId}>
                  {c.name} ({c.studentCount} học sinh)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
          <Brain className="animate-spin" style={{ width: '32px', height: '32px', margin: '0 auto 12px' }} />
          <div>Đang tải dữ liệu năng lực lớp học...</div>
        </div>
      ) : (
        <>
          {/* Top KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13px' }}>
                <Users size={16} /> Sĩ số học sinh
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', marginTop: '6px' }}>
                {analytics?.totalStudents ?? 0}
              </div>
            </div>

            <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13px' }}>
                <TrendingUp size={16} /> Điểm thành thạo trung bình
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#2563eb', marginTop: '6px' }}>
                {analytics?.cohortAverageMasteryPercent ?? 0}%
              </div>
            </div>

            <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13px' }}>
                <BookOpen size={16} /> Tiến độ hoàn thành bài học
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#16a34a', marginTop: '6px' }}>
                {analytics?.curriculumCompletionRatePercent ?? 0}%
              </div>
            </div>

            <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13px' }}>
                <AlertTriangle size={16} /> Học sinh cần can thiệp
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#dc2626', marginTop: '6px' }}>
                {analytics?.atRiskStudents?.length ?? 0}
              </div>
            </div>
          </div>

          {/* AI Teaching Recommendations Banner */}
          {recommendations.length > 0 && (
            <div style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%)', border: '1px solid #bae6fd', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Sparkles size={20} color="#0284c7" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0369a1' }}>
                  Khuyến nghị Sư phạm Thông minh từ AI
                </h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '12px' }}>
                {recommendations.map((rec) => (
                  <div key={rec.recommendationId} style={{ background: '#ffffff', borderRadius: '8px', padding: '14px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>{rec.title}</span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          textTransform: 'uppercase',
                          background: rec.priority === 'high' ? '#fee2e2' : '#fef3c7',
                          color: rec.priority === 'high' ? '#b91c1c' : '#b45309',
                        }}
                      >
                        {rec.priority === 'high' ? 'Ưu tiên cao' : 'Tiêu chuẩn'}
                      </span>
                    </div>
                    <p style={{ margin: '4px 0 8px', fontSize: '13px', color: '#475569' }}>
                      {rec.detectionNarrative}
                    </p>
                    <div style={{ fontSize: '12px', color: '#64748b', background: '#f8fafc', padding: '6px 10px', borderRadius: '6px' }}>
                      <strong>Bằng chứng dữ liệu:</strong> {rec.dataEvidence}
                    </div>
                    <div style={{ marginTop: '8px', fontSize: '12px', color: '#0369a1', fontWeight: 500 }}>
                      👉 {rec.actionableDescription}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Difficult Topics & Mastery Distribution */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px', marginBottom: '24px' }}>
            {/* Difficult Topics Cohort */}
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Layers size={18} color="#2563eb" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                  Chuyên đề Thách thức của Lớp
                </h3>
              </div>
              {analytics?.difficultTopics && analytics.difficultTopics.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {analytics.difficultTopics.map((topic, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>{topic.topicName}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          Số học sinh gặp khó: <strong>{topic.affectedStudentsCount}</strong> | Tổng lượt làm:{' '}
                          <strong>{topic.totalAttemptsCount}</strong>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: topic.cohortAccuracyPercent < 50 ? '#dc2626' : '#d97706' }}>
                          {topic.cohortAccuracyPercent}%
                        </span>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>Độ chính xác</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', padding: '30px 0' }}>
                  Lớp học đang có phong độ tốt trên tất cả các chuyên đề!
                </div>
              )}
            </div>

            {/* At-Risk Students */}
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <AlertTriangle size={18} color="#dc2626" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                  Học sinh Cần Can thiệp Bổ trợ ({analytics?.atRiskStudents?.length ?? 0})
                </h3>
              </div>

              {analytics?.atRiskStudents && analytics.atRiskStudents.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '380px', overflowY: 'auto' }}>
                  {analytics.atRiskStudents.map((st) => (
                    <div
                      key={st.studentId}
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#991b1b' }}>{st.fullName}</div>
                        <div style={{ fontSize: '12px', color: '#b91c1c' }}>
                          Yếu ở: <strong>{st.primaryWeakTopic}</strong> (Thành thạo: {st.overallMasteryPercent}%)
                        </div>
                      </div>
                      <button
                        onClick={() => handleOpenInterventionModal(st)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: 'none',
                          background: '#dc2626',
                          color: '#ffffff',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Send size={12} /> Giao bài can thiệp
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#16a34a', fontSize: '13px', textAlign: 'center', padding: '30px 0' }}>
                  <CheckCircle2 size={24} style={{ margin: '0 auto 8px' }} />
                  Không có học sinh nào trong diện báo động nguy cơ hổng kiến thức.
                </div>
              )}
            </div>
          </div>

          {/* Remedial Interventions History & Outcome Tracking */}
          <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Award size={18} color="#2563eb" />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                Lịch sử Can thiệp & Đo lường Hiệu quả ($\Delta$ Mastery)
              </h3>
            </div>

            {interventions.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                      <th style={{ padding: '10px 14px' }}>Học sinh</th>
                      <th style={{ padding: '10px 14px' }}>Chuyên đề can thiệp</th>
                      <th style={{ padding: '10px 14px' }}>Ban đầu</th>
                      <th style={{ padding: '10px 14px' }}>Hiện tại</th>
                      <th style={{ padding: '10px 14px' }}>Tiến bộ ($\Delta$)</th>
                      <th style={{ padding: '10px 14px' }}>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {interventions.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0f172a' }}>{item.studentName}</td>
                        <td style={{ padding: '10px 14px', color: '#475569' }}>{item.topicName}</td>
                        <td style={{ padding: '10px 14px', color: '#64748b' }}>{item.initialMasteryScore}%</td>
                        <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0f172a' }}>{item.currentMasteryScore}%</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '10px',
                              fontSize: '12px',
                              fontWeight: 700,
                              background: item.masteryDelta > 0 ? '#dcfce7' : '#f1f5f9',
                              color: item.masteryDelta > 0 ? '#15803d' : '#64748b',
                            }}
                          >
                            {item.masteryDelta > 0 ? `+${item.masteryDelta}%` : `${item.masteryDelta}%`}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '10px',
                              fontSize: '11px',
                              fontWeight: 600,
                              background: item.status === 'improved' ? '#dcfce7' : item.status === 'assigned' ? '#e0f2fe' : '#fef3c7',
                              color: item.status === 'improved' ? '#166534' : item.status === 'assigned' ? '#0369a1' : '#854d0e',
                            }}
                          >
                            {item.status === 'improved'
                              ? 'Đã cải thiện'
                              : item.status === 'assigned'
                              ? 'Đã giao'
                              : 'Đang làm bài'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', padding: '24px 0' }}>
                Chưa có nhiệm vụ can thiệp nào được ghi nhận cho lớp này.
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal: Giao bài can thiệp */}
      {targetStudent && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div style={{ background: '#ffffff', borderRadius: '12px', width: '100%', maxWidth: '480px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
              Giao bài can thiệp cho {targetStudent.fullName}
            </h3>

            {interventionSuccessMsg ? (
              <div style={{ padding: '12px', background: '#dcfce7', color: '#166534', borderRadius: '8px', fontSize: '14px', textAlign: 'center' }}>
                <CheckCircle2 size={20} style={{ margin: '0 auto 6px' }} />
                {interventionSuccessMsg}
              </div>
            ) : (
              <form onSubmit={handleSendIntervention}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Chuyên đề mục tiêu
                  </label>
                  <input
                    type="text"
                    value={interventionTopic}
                    onChange={(e) => setInterventionTopic(e.target.value)}
                    required
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Hướng dẫn & Ghi chú của giáo viên
                  </label>
                  <textarea
                    rows={3}
                    value={interventionNotes}
                    onChange={(e) => setInterventionNotes(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    disabled={isSubmittingIntervention}
                    style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontSize: '13px', cursor: 'pointer' }}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingIntervention}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: 'none',
                      background: '#2563eb',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {isSubmittingIntervention ? 'Đang gửi...' : 'Xác nhận giao bài'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
