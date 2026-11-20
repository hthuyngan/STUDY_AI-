import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import type { QuestionBankItem } from '../types';
import styles from '../QuestionBank.module.css';

interface QuestionRejectModalProps {
  isOpen: boolean;
  question: QuestionBankItem | null;
  onClose: () => void;
  onConfirm: (questionId: string, reason: string) => Promise<void>;
}

export const QuestionRejectModal: React.FC<QuestionRejectModalProps> = ({
  isOpen,
  question,
  onClose,
  onConfirm,
}) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !question) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Vui lòng nhập lý do từ chối câu hỏi');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await onConfirm(question.id, reason.trim());
      setReason('');
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra khi từ chối câu hỏi';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalBackdrop}>
      <div className={`staff-modal ${styles.modalDialog} ${styles.modalSm}`}>
        {/* Header */}
        <div className={`${styles.modalHeader} ${styles.modalHeaderDanger}`}>
          <div className={styles.modalTitleGroup}>
            <AlertTriangle size={18} style={{ color: '#e11d48' }} />
            <h3 className={styles.modalTitle}>Từ chối câu hỏi</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`staff-modal-close ${styles.closeIconBtn}`}
            title="Đóng modal"
            aria-label="Đóng modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div className={styles.modalBody}>
            <p style={{ margin: 0, color: '#475569', fontSize: '13px', lineHeight: 1.5 }}>
              Bạn đang từ chối câu hỏi{' '}
              <span className={styles.codeBadge}>
                {question.code || question.id.slice(0, 8)}
              </span>
              . Vui lòng ghi rõ lý do để tác giả chỉnh sửa lại.
            </p>

            <div className={styles.formGroup}>
              <label htmlFor="rejectionReason" className={styles.formLabel}>
                Lý do từ chối <span className={styles.requiredStar}>*</span>
              </label>
              <textarea
                id="rejectionReason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ví dụ: Công thức tính sai ở phương án B; Thiếu hình vẽ minh họa..."
                rows={4}
                className={styles.formTextarea}
                autoFocus
              />
            </div>

            {error && (
              <div className={`${styles.formAlert} ${styles.formAlertError}`}>
                {error}
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className={styles.modalFooter}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className={`${styles.btn} ${styles.btnSecondary}`}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !reason.trim()}
              className={`${styles.btn} ${styles.btnDanger} ${isSubmitting || !reason.trim() ? styles.btnDisabled : ''}`}
            >
              {isSubmitting ? 'Đang xử lý...' : 'Xác nhận từ chối'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
