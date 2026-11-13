import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import type { QuestionBankItem } from '../types';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-scaleUp">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-rose-50/50">
          <div className="flex items-center gap-2 text-rose-700">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <h3 className="font-semibold text-sm">Từ chối câu hỏi</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Bạn đang từ chối câu hỏi{' '}
            <span className="font-mono font-semibold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
              {question.code || question.id.slice(0, 8)}
            </span>
            . Vui lòng ghi rõ lý do để tác giả chỉnh sửa lại.
          </p>

          <div>
            <label htmlFor="rejectionReason" className="block text-xs font-medium text-slate-700 mb-1.5">
              Lý do từ chối <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="rejectionReason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ví dụ: Công thức tính sai ở phương án B; Thiếu hình vẽ minh họa..."
              rows={4}
              className="w-full text-xs rounded-lg border border-slate-300 p-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#183B69] focus:border-transparent resize-none"
              autoFocus
            />
          </div>

          {error && (
            <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-2.5">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Đang xử lý...' : 'Xác nhận từ chối'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
