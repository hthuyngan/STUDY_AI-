import React, { useState } from 'react';
import { X, Trash2, AlertCircle } from 'lucide-react';
import type { QuestionBankItem } from '../types';
import styles from '../QuestionBank.module.css';

interface QuestionDeleteModalProps {
  isOpen: boolean;
  question: QuestionBankItem | null;
  onClose: () => void;
  onConfirm: (questionId: string) => Promise<void>;
}

export const QuestionDeleteModal: React.FC<QuestionDeleteModalProps> = ({
  isOpen,
  question,
  onClose,
  onConfirm,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !question) return null;

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      setError('');
      await onConfirm(question.id);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi xóa câu hỏi';
      setError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={styles.modalBackdrop}>
      <div className={`staff-modal ${styles.modalDialog} ${styles.modalSm}`}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.modalTitleGroup}>
            <Trash2 size={18} style={{ color: '#dc2626' }} />
            <h3 className={styles.modalTitle} style={{ color: '#0f172a' }}>
              Xóa câu hỏi vào thùng rác
            </h3>
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

        {/* Content */}
        <div className={styles.modalBody}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <AlertCircle size={20} style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <p style={{ margin: '0 0 6px 0', fontWeight: 600, color: '#1e293b', fontSize: '13.5px' }}>
                Bạn có chắc chắn muốn xóa câu hỏi{' '}
                <span className={styles.codeBadge}>
                  {question.code || question.id.slice(0, 8)}
                </span>
                ?
              </p>
              <p style={{ margin: 0, color: '#64748b', fontSize: '12.5px', lineHeight: 1.5 }}>
                Câu hỏi sẽ được đưa vào thùng rác (xóa mềm). Bạn có thể khôi phục lại bất kỳ lúc nào từ tab Thùng rác.
              </p>
            </div>
          </div>

          {error && (
            <div className={`${styles.formAlert} ${styles.formAlertError}`}>
              {error}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className={styles.modalFooter}>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className={`${styles.btn} ${styles.btnSecondary}`}
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className={`${styles.btn} ${styles.btnDanger} ${isDeleting ? styles.btnDisabled : ''}`}
          >
            {isDeleting ? 'Đang xóa...' : 'Chuyển vào thùng rác'}
          </button>
        </div>
      </div>
    </div>
  );
};
