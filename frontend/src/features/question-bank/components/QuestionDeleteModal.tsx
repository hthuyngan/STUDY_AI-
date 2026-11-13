import React, { useState } from 'react';
import { X, Trash2, AlertCircle } from 'lucide-react';
import type { QuestionBankItem } from '../types';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-scaleUp">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 text-rose-600">
            <Trash2 className="w-5 h-5 text-rose-500" />
            <h3 className="font-semibold text-sm text-slate-900">Xóa câu hỏi vào thùng rác</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-3 text-slate-600 text-xs">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-slate-800 mb-1">
                Bạn có chắc chắn muốn xóa câu hỏi{' '}
                <span className="font-mono font-semibold bg-slate-100 px-1 py-0.5 rounded">
                  {question.code || question.id.slice(0, 8)}
                </span>
                ?
              </p>
              <p className="text-slate-500 leading-relaxed">
                Câu hỏi sẽ được đưa vào thùng rác (xóa mềm). Bạn có thể khôi phục lại bất kỳ lúc nào từ tab Thùng rác.
              </p>
            </div>
          </div>

          {error && (
            <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-2.5">
              {error}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
            >
              {isDeleting ? 'Đang xóa...' : 'Chuyển vào thùng rác'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
