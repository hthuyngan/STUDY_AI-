import React, { useEffect, useState } from 'react';
import {
  Check,
  ShieldAlert,
  Sparkles,
  X,
} from 'lucide-react';
import { teacherManagementService } from '@/services/teacherManagement.service';
import { operationsService } from '@/services/operations.service';
import { getAccessToken } from '@/auth/authSession';
import type {
  AiContentQualityAuditResponse,
} from '@/types/teacherManagement';
import './TeacherPages.css';
import '../Admin/AdminPages.css';

interface MockModerationItem {
  id: string;
  type: 'lesson' | 'question';
  title: string;
  topic: string;
  authorId: string;
  authorName: string;
  content: string;
  status: 'draft' | 'in-review' | 'approved' | 'published' | 'rejected';
  createdAt: string;
}

const INITIAL_ITEMS: MockModerationItem[] = [
  {
    id: 'q_mod_01',
    type: 'question',
    title: 'Khảo sát cực trị hàm bậc ba',
    topic: 'Ứng dụng đạo hàm',
    authorId: 'usr_teacher_author',
    authorName: 'Thầy Hưng',
    content: 'Cho hàm số $y = x^3 - 3x^2 + 2$. Điểm cực đại của đồ thị hàm số là:\nA. $(0; 2)$\nB. $(2; -2)$\nC. $(0; -2)$\nD. $(2; 2)$',
    status: 'in-review',
    createdAt: '2026-11-16T08:00:00Z',
  },
  {
    id: 'lsn_mod_02',
    type: 'lesson',
    title: 'Bài 3: Phương trình mặt cầu trong không gian Oxyz',
    topic: 'Hình học không gian Oxyz',
    authorId: 'usr_teacher_other',
    authorName: 'Cô Lan',
    content: 'Định nghĩa: Mặt cầu tâm $I(a;b;c)$ bán kính $R$ có phương trình $(x-a)^2 + (y-b)^2 + (z-c)^2 = R^2$.',
    status: 'approved',
    createdAt: '2026-11-15T14:30:00Z',
  },
  {
    id: 'q_mod_03',
    type: 'question',
    title: 'Tích phân hàm phân thức hữu tỉ',
    topic: 'Nguyên hàm & Tích phân',
    authorId: 'usr_teacher_author',
    authorName: 'Thầy Hưng',
    content: 'Tính tích phân $\\int_1^2 \\frac{1}{2x+1} dx$. Lời giải chi tiết theo phương pháp đổi biến.',
    status: 'draft',
    createdAt: '2026-11-16T09:15:00Z',
  },
];

export const ContentGovernanceWorkspace: React.FC = () => {
  const [items, setItems] = useState<MockModerationItem[]>(() =>
    getAccessToken() ? [] : INITIAL_ITEMS
  );
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<MockModerationItem | null>(null);

  useEffect(() => {
    if (getAccessToken()) {
      operationsService
        .getApprovals()
        .then((approvals) => {
          const mapped: MockModerationItem[] = approvals.map((a) => ({
            id: a.contentId || a.id,
            type: (a.contentType as string) === 'question' ? 'question' : 'lesson',
            title: a.title,
            topic: a.chapterName || a.subjectName,
            authorId: a.authorName,
            authorName: a.authorName,
            content:
              a.contentPreview?.summary ||
              a.contentPreview?.introduction ||
              a.title,
            status:
              a.status === 'pending'
                ? 'in-review'
                : a.status === 'approved'
                ? 'approved'
                : a.status === 'published'
                ? 'published'
                : 'rejected',
            createdAt: a.submittedAt || new Date().toISOString(),
          }));
          setItems(mapped);
        })
        .catch(() => {
          setItems([]);
        });
    }
  }, []);

  // AI Audit State
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [auditResult, setAuditResult] = useState<AiContentQualityAuditResponse | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);

  // Workflow Action State
  const [workflowFeedback, setWorkflowFeedback] = useState<string | null>(null);
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [showRejectDialog, setShowRejectDialog] = useState<boolean>(false);

  const filteredItems = items.filter((item) => {
    if (statusFilter === 'all') return true;
    return item.status === statusFilter;
  });

  const handleOpenAuditModal = async (item: MockModerationItem) => {
    setSelectedItem(item);
    setIsAuditing(true);
    setAuditResult(null);
    setAuditError(null);
    setWorkflowFeedback(null);
    setWorkflowError(null);

    try {
      const res = await teacherManagementService.auditContentQualityWithAi({
        contentType: item.type,
        title: item.title,
        bodyText: item.content,
      });
      setAuditResult(res);
    } catch (err: unknown) {
      setAuditError((err as Error).message || 'Không thể kiểm định chất lượng AI');
    } finally {
      setIsAuditing(false);
    }
  };

  const handleExecuteWorkflow = async (
    item: MockModerationItem,
    action: 'submit_review' | 'approve' | 'reject' | 'publish',
    reason?: string
  ) => {
    setWorkflowError(null);
    setWorkflowFeedback(null);

    try {
      const result = await teacherManagementService.executeContentWorkflowAction({
        entityType: item.type,
        entityId: item.id,
        action,
        reasonOrNotes: reason,
      });

      // Update local state status
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: result.newStatus as MockModerationItem['status'] } : i))
      );

      setWorkflowFeedback(`Thành công: ${result.message}`);
      setShowRejectDialog(false);
    } catch (err: unknown) {
      setWorkflowError((err as Error).message || 'Lỗi thao tác quy trình kiểm duyệt');
    }
  };

  return (
    <div className="admin-page-container" style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
            Không gian Quản trị & Kiểm duyệt Học liệu
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>
            Quy trình phê duyệt nghiêm ngặt, tách biệt vai trò (SoD) và trợ lý AI thẩm định công thức KaTeX
          </p>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'in-review', label: 'Chờ duyệt' },
            { id: 'approved', label: 'Đã duyệt' },
            { id: 'published', label: 'Đã xuất bản' },
            { id: 'draft', label: 'Bản nháp' },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setStatusFilter(pill.id)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: statusFilter === pill.id ? '#ffffff' : 'transparent',
                color: statusFilter === pill.id ? '#0f172a' : '#64748b',
                fontWeight: statusFilter === pill.id ? 600 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: statusFilter === pill.id ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {workflowFeedback && (
        <div style={{ padding: '12px 16px', background: '#dcfce7', color: '#166534', borderRadius: '8px', marginBottom: '16px' }}>
          {workflowFeedback}
        </div>
      )}

      {workflowError && (
        <div style={{ padding: '12px 16px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={18} />
          <span>{workflowError}</span>
        </div>
      )}

      {/* Moderation Items Table */}
      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
              <th style={{ padding: '12px 16px' }}>Loại & Tiêu đề</th>
              <th style={{ padding: '12px 16px' }}>Chuyên đề</th>
              <th style={{ padding: '12px 16px' }}>Tác giả biên soạn</th>
              <th style={{ padding: '12px 16px' }}>Trạng thái</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Hành động kiểm duyệt</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        background: item.type === 'lesson' ? '#e0f2fe' : '#f3e8ff',
                        color: item.type === 'lesson' ? '#0369a1' : '#7e22ce',
                      }}
                    >
                      {item.type === 'lesson' ? 'Bài học' : 'Câu hỏi'}
                    </span>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{item.title}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', maxWidth: '400px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.content}
                  </div>
                </td>
                <td style={{ padding: '12px 16px', color: '#475569' }}>{item.topic}</td>
                <td style={{ padding: '12px 16px', color: '#64748b' }}>{item.authorName}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      background:
                        item.status === 'published'
                          ? '#dcfce7'
                          : item.status === 'approved'
                          ? '#e0f2fe'
                          : item.status === 'in-review'
                          ? '#fef3c7'
                          : item.status === 'rejected'
                          ? '#fee2e2'
                          : '#f1f5f9',
                      color:
                        item.status === 'published'
                          ? '#15803d'
                          : item.status === 'approved'
                          ? '#0369a1'
                          : item.status === 'in-review'
                          ? '#b45309'
                          : item.status === 'rejected'
                          ? '#b91c1c'
                          : '#475569',
                    }}
                  >
                    {item.status}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', gap: '6px' }}>
                    {/* AI Audit Button */}
                    <button
                      onClick={() => handleOpenAuditModal(item)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#0284c7',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Sparkles size={13} /> Thẩm định AI
                    </button>

                    {item.status === 'draft' && (
                      <button
                        onClick={() => handleExecuteWorkflow(item, 'submit_review')}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: 'none',
                          background: '#2563eb',
                          color: '#ffffff',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Gửi duyệt
                      </button>
                    )}

                    {item.status === 'in-review' && (
                      <>
                        <button
                          onClick={() => handleExecuteWorkflow(item, 'approve')}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: 'none',
                            background: '#16a34a',
                            color: '#ffffff',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Check size={13} /> Duyệt
                        </button>
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setShowRejectDialog(true);
                          }}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px solid #fecaca',
                            background: '#fee2e2',
                            color: '#b91c1c',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Từ chối
                        </button>
                      </>
                    )}

                    {item.status === 'approved' && (
                      <button
                        onClick={() => handleExecuteWorkflow(item, 'publish')}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: 'none',
                          background: '#059669',
                          color: '#ffffff',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Xuất bản
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* AI Audit Modal */}
      {selectedItem && !showRejectDialog && (
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
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '680px',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={20} color="#0284c7" />
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                  Kết quả Thẩm định Chất lượng AI: {selectedItem.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Advisory Disclaimer Banner */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '12px 14px',
                marginBottom: '16px',
                fontSize: '12px',
                color: '#475569',
              }}
            >
              ⚠️ <strong>Nguyên tắc Sư phạm:</strong> Kết quả kiểm định AI chỉ mang tính chất cố vấn hỗ trợ. Mọi nội dung xuất bản bắt buộc phải được giáo viên/chuyên môn kiểm tra và duyệt bằng tay.
            </div>

            {isAuditing ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                <Sparkles className="animate-spin" style={{ width: '28px', height: '28px', margin: '0 auto 10px' }} />
                <div>Gemini đang rà soát chính tả, công thức KaTeX và tính sư phạm...</div>
              </div>
            ) : auditError ? (
              <div style={{ padding: '12px 16px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px' }}>
                {auditError}
              </div>
            ) : auditResult ? (
              <div>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Đánh giá tổng quan:
                  </div>
                  <div style={{ padding: '10px', background: '#f8fafc', borderRadius: '6px', fontSize: '13px', color: '#0f172a' }}>
                    {auditResult.overallAssessment}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ padding: '10px', background: '#f1f5f9', borderRadius: '6px' }}>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Phát hiện vấn đề:</div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: auditResult.hasIssues ? '#dc2626' : '#16a34a' }}>
                      {auditResult.issueCount} điểm cần lưu ý
                    </div>
                  </div>
                  <div style={{ padding: '10px', background: '#f1f5f9', borderRadius: '6px' }}>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Độ khó đề xuất:</div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#2563eb', textTransform: 'capitalize' }}>
                      {auditResult.suggestedCognitiveDifficulty}
                    </div>
                  </div>
                </div>

                {auditResult.suggestions.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                      Đề xuất chỉnh sửa chi tiết:
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {auditResult.suggestions.map((s, idx) => (
                        <div key={idx} style={{ padding: '8px 12px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '6px', fontSize: '12px' }}>
                          <div style={{ fontWeight: 600, color: '#b45309', marginBottom: '2px' }}>
                            [{s.category}] {s.reason}
                          </div>
                          <div style={{ color: '#dc2626', textDecoration: 'line-through' }}>{s.originalSnippet}</div>
                          <div style={{ color: '#16a34a', fontWeight: 600 }}>👉 {s.proposedCorrection}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Văn bản đề xuất hoàn thiện (KaTeX Live Preview):
                  </div>
                  <div style={{ padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                    {auditResult.proposedImprovedBody || selectedItem.content}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    onClick={() => setSelectedItem(null)}
                    style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontSize: '13px', cursor: 'pointer' }}
                  >
                    Đóng
                  </button>
                  <button
                    onClick={() => {
                      setItems((prev) =>
                        prev.map((i) =>
                          i.id === selectedItem.id
                            ? { ...i, content: auditResult.proposedImprovedBody || i.content }
                            : i
                        )
                      );
                      setWorkflowFeedback('Đã áp dụng các sửa đổi được AI thẩm định vào nội dung.');
                      setSelectedItem(null);
                    }}
                    style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#2563eb', color: '#ffffff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Áp dụng sửa đổi
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {selectedItem && showRejectDialog && (
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
          <div style={{ background: '#ffffff', borderRadius: '12px', width: '100%', maxWidth: '440px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '18px', fontWeight: 700, color: '#b91c1c' }}>
              Từ chối duyệt học liệu
            </h3>
            <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#64748b' }}>
              Nhập lý do từ chối để gửi phản hồi sư phạm lại cho tác giả ({selectedItem.authorName}):
            </p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="VD: Sai ký hiệu KaTeX tích phân, thiếu ví dụ minh họa..."
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box', marginBottom: '16px' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setShowRejectDialog(false)}
                style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontSize: '13px', cursor: 'pointer' }}
              >
                Hủy
              </button>
              <button
                onClick={() => handleExecuteWorkflow(selectedItem, 'reject', rejectReason)}
                style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#dc2626', color: '#ffffff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
