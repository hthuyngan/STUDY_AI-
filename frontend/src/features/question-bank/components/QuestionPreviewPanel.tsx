import React, { useMemo } from 'react';
import {
  X,
  Edit3,
  CheckCircle2,
  XCircle,
  Send,
  Trash2,
  RotateCcw,
  Globe,
  Lock,
  Sparkles,
  BookOpen,
  Calendar,
  Layers,
  Award,
  Copy,
  Check,
} from 'lucide-react';
import type { ContentQuestionItem, QuestionOption } from '../types';
import { MathView } from '../../../components/common/MathView';
import styles from '../QuestionBank.module.css';

interface QuestionPreviewPanelProps {
  question: ContentQuestionItem | null;
  onClose: () => void;
  onEdit: (question: ContentQuestionItem) => void;
  onDelete: (question: ContentQuestionItem) => void;
  onRestore: (question: ContentQuestionItem) => void;
  onSubmitReview: (question: ContentQuestionItem) => void;
  onApprove: (question: ContentQuestionItem) => void;
  onReject: (question: ContentQuestionItem) => void;
  onPublish: (question: ContentQuestionItem) => void;
  onUnpublish: (question: ContentQuestionItem) => void;
  isTrashView: boolean;
}

export const QuestionPreviewPanel: React.FC<QuestionPreviewPanelProps> = ({
  question,
  onClose,
  onEdit,
  onDelete,
  onRestore,
  onSubmitReview,
  onApprove,
  onReject,
  onPublish,
  onUnpublish,
  isTrashView,
}) => {
  const [copied, setCopied] = React.useState(false);

  // Parse options safely from string[] or object[]
  const parsedOptions: QuestionOption[] = useMemo(() => {
    if (!question || !question.options || !Array.isArray(question.options)) return [];
    return question.options.map((opt: unknown, idx: number) => {
      const correctAns = question.correctAnswer?.trim() || '';
      if (typeof opt === 'string') {
        const match = opt.match(/^(\[[A-Z]\]|[A-Z]\.|\([A-Z]\)|[A-Z]:)\s*(.*)$/i);
        const key = match ? match[1].replace(/[[\]().:]/g, '').toUpperCase() : String.fromCharCode(65 + idx);
        const text = match ? match[2] : opt;
        const isCorrect =
          correctAns.toUpperCase() === key ||
          correctAns === text.trim() ||
          correctAns === opt.trim();
        return {
          key,
          text,
          isCorrect,
        };
      }
      const o = opt as QuestionOption;
      const key = o.key || String.fromCharCode(65 + idx);
      const text = o.text || '';
      const isCorrect =
        correctAns.toUpperCase() === key ||
        correctAns === text.trim() ||
        o.isCorrect === true;
      return {
        key,
        text,
        isCorrect,
      };
    });
  }, [question]);

  if (!question) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(question.code || question.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isVNHSGE = question.sourceType === 'vnhsge';

  return (
    <>
      {/* Drawer Backdrop for tablet/mobile screens (< 1024px) */}
      <div
        className={styles.previewDrawerBackdrop}
        onClick={onClose}
        aria-hidden="true"
      />

      <div className={styles.previewCard}>
        {/* Header */}
        <div className={styles.previewHeader}>
          <div className={styles.previewHeaderCodeGroup}>
            <span className={styles.codeBadge}>
              {question.code || question.id.slice(0, 10)}
            </span>
            <button
              type="button"
              onClick={handleCopyCode}
              title="Sao chép mã"
              className={styles.copyCodeBtn}
            >
              {copied ? <Check size={14} style={{ color: '#16a34a' }} /> : <Copy size={14} />}
            </button>
          </div>

          <div className={styles.previewHeaderRight}>
            {question.status === 'published' && (
              <span className={`${styles.badge} ${styles.badgePublished}`}>
                <span className={`${styles.badgeDot} ${styles.dotPublished}`} />
                Đã xuất bản
              </span>
            )}
            {question.status === 'approved' && (
              <span className={`${styles.badge} ${styles.badgeApproved}`}>
                <CheckCircle2 size={12} style={{ color: '#1d4ed8' }} />
                Đã duyệt
              </span>
            )}
            {(question.status === 'in_review' || question.status === 'in-review') && (
              <span className={`${styles.badge} ${styles.badgeInReview}`}>
                Chờ duyệt
              </span>
            )}
            {question.status === 'rejected' && (
              <span className={`${styles.badge} ${styles.badgeRejected}`}>
                Từ chối
              </span>
            )}
            {question.status === 'draft' && (
              <span className={`${styles.badge} ${styles.badgeDraft}`}>
                <span className={`${styles.badgeDot} ${styles.dotDraft}`} />
                Bản nháp
              </span>
            )}

            <button
              type="button"
              onClick={onClose}
              className={styles.closeIconBtn}
              title="Đóng bảng xem trước"
              aria-label="Đóng bảng xem trước"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body scroll */}
        <div className={styles.previewBody}>
          {/* Learner View Card */}
          <div className={styles.learnerBox}>
            <div className={styles.previewSectionTitle}>
              <BookOpen size={14} style={{ color: '#183b69' }} />
              Giao diện học sinh (Learner Preview)
            </div>

            {/* Prompt with MathView */}
            <div className={styles.promptCard}>
              <MathView math={question.prompt} />
            </div>

            {/* Image preview if exists */}
            {question.imageUrl && (
              <div style={{ borderRadius: '6px', border: '1px solid #e2e8f0', overflow: 'hidden', backgroundColor: '#ffffff', padding: '4px' }}>
                <img
                  src={question.imageUrl}
                  alt="Hình minh họa câu hỏi"
                  style={{ maxHeight: '180px', width: '100%', objectFit: 'contain' }}
                  loading="lazy"
                />
              </div>
            )}

            {/* Options */}
            {parsedOptions.length > 0 && (
              <div className={styles.optionsList}>
                {parsedOptions.map((opt) => {
                  const isCorrect = opt.isCorrect;

                  return (
                    <div
                      key={opt.key}
                      className={`${styles.optionCard} ${isCorrect ? styles.optionCorrect : ''}`}
                    >
                      <span
                        className={`${styles.optionCircle} ${isCorrect ? styles.optionCircleCorrect : ''}`}
                      >
                        {opt.key}
                      </span>
                      <div className={styles.optionText}>
                        <MathView math={opt.text} />
                      </div>
                      {isCorrect && (
                        <span className={styles.correctTag}>
                          Đáp án đúng
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Explanation Card */}
          {question.explanation && (
            <div>
              <div className={styles.previewSectionTitle} style={{ color: '#1d4ed8' }}>
                <Sparkles size={14} style={{ color: '#2563eb' }} />
                Lời giải chi tiết
              </div>
              <div className={styles.explanationBox}>
                <MathView math={question.explanation} />
              </div>
            </div>
          )}

          {/* Rejection reason if rejected */}
          {question.status === 'rejected' && question.rejectionReason && (
            <div className={`${styles.formAlert} ${styles.formAlertError}`} style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <XCircle size={14} />
                Lý do từ chối
              </div>
              <p style={{ margin: '4px 0 0 0', lineHeight: 1.45 }}>
                {question.rejectionReason}
              </p>
            </div>
          )}

          {/* Metadata & Taxonomy */}
          <div>
            <div className={styles.previewSectionTitle}>
              <Layers size={14} />
              Thông tin phân loại & Nguồn gốc
            </div>

            <div className={styles.metadataGrid}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Môn học:</span>
                <span className={styles.metaValue}>{question.subjectName || 'Toán học'}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Khối lớp:</span>
                <span className={styles.metaValue}>Lớp {question.grade || 12}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Dạng câu:</span>
                <span className={styles.metaValue}>{question.questionType || question.type || 'Trắc nghiệm đơn'}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Độ khó:</span>
                <span className={styles.metaValue}>{question.difficulty || 'medium'}</span>
              </div>
              {question.topic && (
                <div className={styles.metaItem} style={{ gridColumn: 'span 2' }}>
                  <span className={styles.metaLabel}>Chủ đề (Topic):</span>
                  <span className={styles.metaValue}>{question.topic}</span>
                </div>
              )}
            </div>

            <div style={{ paddingTop: '8px', marginTop: '8px', borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Award size={13} style={{ color: '#94a3b8' }} /> Nguồn dữ liệu:
                </span>
                <span style={{ fontWeight: 600, color: '#334155' }}>
                  {isVNHSGE ? 'VNHSGE (Bộ đề QG)' : 'Nhập thủ công'}
                </span>
              </div>

              {isVNHSGE && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                  <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Lock size={13} style={{ color: '#16a34a' }} /> Giấy phép:
                  </span>
                  <span style={{ fontWeight: 600, color: '#15803d', backgroundColor: '#f0fdf4', padding: '1px 6px', borderRadius: '4px', fontSize: '10px' }}>
                    CC-BY-NC-SA-4.0 (arXiv:2305.12199)
                  </span>
                </div>
              )}

              {question.createdAt && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                  <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={13} style={{ color: '#94a3b8' }} /> Ngày tạo:
                  </span>
                  <span style={{ color: '#475569' }}>
                    {new Date(question.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className={styles.previewFooterActions}>
          {!isTrashView ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                {/* Edit button */}
                <button
                  type="button"
                  onClick={() => onEdit(question)}
                  className={`${styles.btn} ${styles.btnSecondary}`}
                  style={{ padding: '4px 10px', fontSize: '12px' }}
                >
                  <Edit3 size={13} />
                  Sửa
                </button>

                {/* Submit for review */}
                {(question.status === 'draft' || question.status === 'rejected') && (
                  <button
                    type="button"
                    onClick={() => onSubmitReview(question)}
                    className={`${styles.btn} ${styles.btnWarning}`}
                    style={{ padding: '4px 10px', fontSize: '12px' }}
                  >
                    <Send size={13} />
                    Gửi duyệt
                  </button>
                )}

                {/* Approve & Reject for in_review */}
                {(question.status === 'in_review' || question.status === 'in-review') && (
                  <>
                    <button
                      type="button"
                      onClick={() => onApprove(question)}
                      className={`${styles.btn} ${styles.btnSuccess}`}
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                    >
                      <CheckCircle2 size={13} />
                      Duyệt
                    </button>
                    <button
                      type="button"
                      onClick={() => onReject(question)}
                      className={`${styles.btn} ${styles.btnDanger}`}
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                    >
                      <XCircle size={13} />
                      Từ chối
                    </button>
                  </>
                )}

                {/* Publish button if approved */}
                {question.status === 'approved' && (
                  <button
                    type="button"
                    onClick={() => onPublish(question)}
                    className={`${styles.btn} ${styles.btnSuccess}`}
                    style={{ padding: '4px 10px', fontSize: '12px' }}
                  >
                    <Globe size={13} />
                    Xuất bản
                  </button>
                )}

                {/* Unpublish button if published */}
                {question.status === 'published' && (
                  <button
                    type="button"
                    onClick={() => onUnpublish(question)}
                    className={`${styles.btn} ${styles.btnSecondary}`}
                    style={{ padding: '4px 10px', fontSize: '12px' }}
                  >
                    Thu hồi (Gỡ)
                  </button>
                )}
              </div>

              {/* Soft Delete */}
              <button
                type="button"
                onClick={() => onDelete(question)}
                className={styles.closeIconBtn}
                title="Chuyển vào thùng rác"
                aria-label="Chuyển vào thùng rác"
              >
                <Trash2 size={16} style={{ color: '#dc2626' }} />
              </button>
            </div>
          ) : (
            /* Trash recovery */
            <button
              type="button"
              onClick={() => onRestore(question)}
              className={`${styles.btn} ${styles.btnSuccess}`}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <RotateCcw size={14} />
              Khôi phục câu hỏi này
            </button>
          )}
        </div>
      </div>
    </>
  );
};
