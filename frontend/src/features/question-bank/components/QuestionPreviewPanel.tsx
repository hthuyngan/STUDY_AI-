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
      if (typeof opt === 'string') {
        const match = opt.match(/^(\[[A-Z]\]|[A-Z]\.|\([A-Z]\)|[A-Z]:)\s*(.*)$/i);
        const key = match ? match[1].replace(/[[\]().:]/g, '').toUpperCase() : String.fromCharCode(65 + idx);
        const text = match ? match[2] : opt;
        return {
          key,
          text,
          isCorrect: question.correctAnswer?.trim().toUpperCase() === key,
        };
      }
      const o = opt as QuestionOption;
      const key = o.key || String.fromCharCode(65 + idx);
      return {
        key,
        text: o.text || '',
        isCorrect:
          question.correctAnswer?.trim().toUpperCase() === key ||
          o.isCorrect === true,
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
    <div className="w-full lg:w-[420px] xl:w-[460px] bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full max-h-[calc(100vh-160px)] sticky top-6 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
            {question.code || question.id.slice(0, 10)}
          </span>
          <button
            type="button"
            onClick={handleCopyCode}
            title="Sao chép mã"
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {question.status === 'published' && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Đã xuất bản
            </span>
          )}
          {question.status === 'approved' && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
              Đã duyệt
            </span>
          )}
          {(question.status === 'in_review' || question.status === 'in-review') && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
              Chờ duyệt
            </span>
          )}
          {question.status === 'rejected' && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
              Từ chối
            </span>
          )}
          {question.status === 'draft' && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              Bản nháp
            </span>
          )}

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors ml-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body scroll */}
      <div className="p-4 overflow-y-auto space-y-5 text-sm flex-1">
        {/* Learner View Card */}
        <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/40">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-[#183B69]" />
            Giao diện học sinh (Learner Preview)
          </div>

          {/* Prompt with MathView */}
          <div className="text-slate-900 leading-relaxed font-normal text-sm mb-3">
            <MathView math={question.prompt} />
          </div>

          {/* Image preview if exists */}
          {question.imageUrl && (
            <div className="mb-3 rounded border border-slate-200 overflow-hidden bg-white">
              <img
                src={question.imageUrl}
                alt="Hình minh họa câu hỏi"
                className="max-h-48 w-full object-contain mx-auto"
                loading="lazy"
              />
            </div>
          )}

          {/* Options */}
          {parsedOptions.length > 0 && (
            <div className="space-y-2">
              {parsedOptions.map((opt) => {
                const isCorrect = opt.isCorrect;

                return (
                  <div
                    key={opt.key}
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs transition-colors ${
                      isCorrect
                        ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-medium'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <span
                      className={`inline-flex items-center justify-center w-5 h-5 rounded-full font-bold text-[11px] shrink-0 mt-0.5 ${
                        isCorrect
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-600 border border-slate-300'
                      }`}
                    >
                      {opt.key}
                    </span>
                    <div className="flex-1 leading-relaxed">
                      <MathView math={opt.text} />
                    </div>
                    {isCorrect && (
                      <span className="text-[11px] font-semibold text-emerald-700 shrink-0">
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
          <div className="border border-blue-100 rounded-lg p-3.5 bg-blue-50/30">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-blue-800 mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Lời giải chi tiết
            </div>
            <div className="text-slate-800 text-xs leading-relaxed">
              <MathView math={question.explanation} />
            </div>
          </div>
        )}

        {/* Rejection reason if rejected */}
        {question.status === 'rejected' && question.rejectionReason && (
          <div className="border border-rose-200 rounded-lg p-3 bg-rose-50/60">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-rose-800 mb-1 flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5 text-rose-600" />
              Lý do từ chối
            </div>
            <p className="text-xs text-rose-900 leading-relaxed">
              {question.rejectionReason}
            </p>
          </div>
        )}

        {/* Metadata & Taxonomy */}
        <div className="border border-slate-200 rounded-lg p-3.5 space-y-2 bg-white text-xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            Thông tin phân loại & Nguồn gốc
          </div>

          <div className="grid grid-cols-2 gap-2 text-slate-600">
            <div>
              <span className="text-slate-400 block text-[11px]">Môn học:</span>
              <span className="font-medium text-slate-800">{question.subjectName || 'Toán học'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Khối lớp:</span>
              <span className="font-medium text-slate-800">Lớp {question.grade || 12}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Dạng câu:</span>
              <span className="font-medium text-slate-800">{question.questionType || question.type || 'Trắc nghiệm đơn'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Độ khó:</span>
              <span className="font-medium text-slate-800">{question.difficulty || 'medium'}</span>
            </div>
            {question.topic && (
              <div className="col-span-2">
                <span className="text-slate-400 block text-[11px]">Chủ đề (Topic):</span>
                <span className="font-medium text-slate-800">{question.topic}</span>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400 flex items-center gap-1">
                <Award className="w-3 h-3 text-slate-400" /> Nguồn dữ liệu:
              </span>
              <span className="font-semibold text-slate-700">
                {isVNHSGE ? 'VNHSGE (Bộ đề QG)' : 'Nhập thủ công'}
              </span>
            </div>

            {isVNHSGE && (
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-600" /> Giấy phép:
                </span>
                <span className="font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">
                  CC-BY-NC-SA-4.0 (arXiv:2305.12199)
                </span>
              </div>
            )}

            {question.createdAt && (
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" /> Ngày tạo:
                </span>
                <span className="text-slate-600">
                  {new Date(question.createdAt).toLocaleDateString('vi-VN')}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Footer (Content Primacy) */}
      <div className="p-3 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
        {!isTrashView ? (
          <>
            <div className="flex items-center gap-1.5">
              {/* Edit button */}
              <button
                type="button"
                onClick={() => onEdit(question)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors shadow-sm"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                Sửa
              </button>

              {/* Submit for review */}
              {(question.status === 'draft' || question.status === 'rejected') && (
                <button
                  type="button"
                  onClick={() => onSubmitReview(question)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-300 rounded-lg hover:bg-amber-100 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  Gửi duyệt
                </button>
              )}

              {/* Approve & Reject for in_review */}
              {(question.status === 'in_review' || question.status === 'in-review') && (
                <>
                  <button
                    type="button"
                    onClick={() => onApprove(question)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-300 rounded-lg hover:bg-emerald-100 transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Duyệt
                  </button>
                  <button
                    type="button"
                    onClick={() => onReject(question)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-300 rounded-lg hover:bg-rose-100 transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Từ chối
                  </button>
                </>
              )}

              {/* Publish button if approved */}
              {question.status === 'approved' && (
                <button
                  type="button"
                  onClick={() => onPublish(question)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  <Globe className="w-3.5 h-3.5" />
                  Xuất bản
                </button>
              )}

              {/* Unpublish button if published */}
              {question.status === 'published' && (
                <button
                  type="button"
                  onClick={() => onUnpublish(question)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Thu hồi (Gỡ)
                </button>
              )}
            </div>

            {/* Soft Delete */}
            <button
              type="button"
              onClick={() => onDelete(question)}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Chuyển vào thùng rác"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        ) : (
          /* Trash recovery */
          <button
            type="button"
            onClick={() => onRestore(question)}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-300 rounded-lg hover:bg-emerald-100 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Khôi phục câu hỏi này
          </button>
        )}
      </div>
    </div>
  );
};
