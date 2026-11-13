import React from 'react';
import {
  Eye,
  Edit2,
  Trash2,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Send,
  AlertCircle,
  FileQuestion,
  ChevronLeft,
  ChevronRight,
  Globe,
  Undo2,
  MoreHorizontal,
} from 'lucide-react';
import type { ContentQuestionItem } from '../types';
import { MathView } from '../../../components/common/MathView';

interface QuestionTableProps {
  questions: ContentQuestionItem[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  isLoading: boolean;
  selectedQuestionId: string | null;
  isTrashView: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onSelectQuestion: (question: ContentQuestionItem) => void;
  onPreviewModal: (question: ContentQuestionItem) => void;
  onEditQuestion: (question: ContentQuestionItem) => void;
  onDeleteQuestion: (question: ContentQuestionItem) => void;
  onRestoreQuestion: (question: ContentQuestionItem) => void;
  onSubmitReview: (question: ContentQuestionItem) => void;
  onApproveQuestion: (question: ContentQuestionItem) => void;
  onRejectQuestion: (question: ContentQuestionItem) => void;
  onPublishQuestion: (question: ContentQuestionItem) => void;
  onUnpublishQuestion: (question: ContentQuestionItem) => void;
}

export const QuestionTable: React.FC<QuestionTableProps> = ({
  questions,
  totalCount,
  currentPage,
  pageSize,
  isLoading,
  selectedQuestionId,
  isTrashView,
  onPageChange,
  onPageSizeChange,
  onSelectQuestion,
  onPreviewModal,
  onEditQuestion,
  onDeleteQuestion,
  onRestoreQuestion,
  onSubmitReview,
  onApproveQuestion,
  onRejectQuestion,
  onPublishQuestion,
  onUnpublishQuestion,
}) => {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // Helper for status badge styling
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Đã xuất bản
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <CheckCircle2 className="w-3 h-3 text-blue-600" />
            Đã duyệt
          </span>
        );
      case 'in_review':
      case 'in-review':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertCircle className="w-3 h-3 text-amber-600" />
            Chờ duyệt
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" />
            Bị từ chối
          </span>
        );
      case 'draft':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Bản nháp
          </span>
        );
    }
  };

  // Helper for difficulty badge
  const renderDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
      case 'nhan_biet':
        return <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Nhận biết</span>;
      case 'medium':
      case 'thong_hieu':
        return <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded">Thông hiểu</span>;
      case 'hard':
      case 'van_dung':
        return <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded">Vận dụng</span>;
      case 'expert':
      case 'van_dung_cao':
        return <span className="text-xs font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded">VD cao</span>;
      default:
        return <span className="text-xs font-medium text-slate-600 bg-slate-50 px-2 py-0.5 rounded">{difficulty || 'Chuẩn'}</span>;
    }
  };

  // Helper for question type
  const renderQuestionType = (type?: string) => {
    switch (type) {
      case 'single_choice':
      case 'multiple-choice':
        return <span className="text-xs font-medium text-slate-700">Trắc nghiệm</span>;
      case 'multiple_choice':
      case 'multiple-select':
        return <span className="text-xs font-medium text-slate-700">Nhiều lựa chọn</span>;
      case 'true_false':
      case 'true-false':
        return <span className="text-xs font-medium text-slate-700">Đúng / Sai</span>;
      case 'short_answer':
      case 'short-answer':
        return <span className="text-xs font-medium text-slate-700">Điền câu trả lời</span>;
      case 'essay':
        return <span className="text-xs font-medium text-slate-700">Tự luận</span>;
      default:
        return <span className="text-xs font-medium text-slate-500">{type || 'Trắc nghiệm'}</span>;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Table responsive container (Evondev R9 rule) */}
      <div className="overflow-x-auto min-w-full">
        <table className="staff-table w-full text-left text-sm border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <th className="py-3 px-4 w-12 text-center">STT</th>
              <th className="py-3 px-4 w-32">Mã câu</th>
              <th className="py-3 px-4 w-36">Môn & Lớp</th>
              <th className="py-3 px-4 min-w-[280px]">Nội dung câu hỏi</th>
              <th className="py-3 px-4 w-32 text-center">Trạng thái</th>
              <th className="py-3 px-4 w-32 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              // Loading skeleton rows
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-4 px-4 text-center"><div className="h-4 bg-slate-200 rounded w-6 mx-auto" /></td>
                  <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-20" /></td>
                  <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-24" /></td>
                  <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-3/4 mb-1" /><div className="h-3 bg-slate-100 rounded w-1/2" /></td>
                  <td className="py-4 px-4 text-center"><div className="h-5 bg-slate-200 rounded-full w-20 mx-auto" /></td>
                  <td className="py-4 px-4 text-right"><div className="h-7 bg-slate-200 rounded w-24 ml-auto" /></td>
                </tr>
              ))
            ) : questions.length === 0 ? (
              // Empty state
              <tr>
                <td colSpan={6} className="py-16 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
                      <FileQuestion className="w-8 h-8" />
                    </div>
                    <p className="text-base font-semibold text-slate-800 mb-1">
                      {isTrashView ? 'Thùng rác trống' : 'Không tìm thấy câu hỏi nào'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {isTrashView
                        ? 'Chưa có câu hỏi nào bị đưa vào thùng rác.'
                        : 'Thử thay đổi từ khóa tìm kiếm hoặc bỏ bớt các bộ lọc đang chọn.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              questions.map((q, index) => {
                const isSelected = selectedQuestionId === q.id;
                const rowNumber = (currentPage - 1) * pageSize + index + 1;
                const isVNHSGE = q.sourceType === 'vnhsge';

                return (
                  <tr
                    key={q.id}
                    onClick={() => onSelectQuestion(q)}
                    className={`cursor-pointer transition-colors duration-150 ${
                      isSelected
                        ? 'bg-blue-50/70 border-l-4 border-l-[#183B69]'
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    {/* STT */}
                    <td className="py-3 px-4 text-center text-xs font-medium text-slate-400">
                      {rowNumber}
                    </td>

                    {/* Mã câu */}
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {q.code || q.id.slice(0, 8)}
                      </span>
                    </td>

                    {/* Môn & Lớp */}
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800 text-xs">
                        {q.subjectName || 'Chưa phân loại'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {q.grade ? `Lớp ${q.grade}` : "Chưa xác định lớp"}
                      </div>
                    </td>

                    {/* Nội dung tóm tắt with MathView */}
                    <td className="py-3 px-4 max-w-md">
                      <div className="line-clamp-2 text-xs text-slate-800 font-normal leading-relaxed">
                        <MathView math={q.prompt} />
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">{renderQuestionType(q.questionType || q.type)}<span>·</span>{renderDifficultyBadge(q.difficulty)}<span>·</span>{isVNHSGE ? "VNHSGE" : "Thủ công"}</div>
                      {q.options && q.options.length > 0 && (
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                          <span>{q.options.length} phương án</span>

                        </div>
                      )}
                    </td>

                    {/* Trạng thái */}
                    <td className="py-3 px-4 text-center">
                      {renderStatusBadge(q.status)}
                    </td>

                    {/* Primary actions and accessible overflow menu */}
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button type="button" onClick={() => { onSelectQuestion(q); onPreviewModal(q); }}
                          title="Xem trước" aria-label={`Xem trước câu hỏi ${q.code || q.id}`}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-[#183B69] hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">
                          <Eye className="w-4 h-4" />
                        </button>
                        <details className="relative group">
                          <summary aria-label={`Thao tác câu hỏi ${q.code || q.id}`}
                            className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 [&::-webkit-details-marker]:hidden">
                            <MoreHorizontal className="w-5 h-5" />
                          </summary>
                          <div className="absolute right-0 top-full z-30 mt-1 min-w-[190px] rounded-xl border border-slate-200 bg-white p-1.5 text-left shadow-xl">
                            {!isTrashView ? (
                              <>
                                <button type="button" onClick={() => onEditQuestion(q)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm hover:bg-slate-100"><Edit2 className="w-4 h-4" /> Chỉnh sửa</button>
                                {(q.status === 'draft' || q.status === 'rejected') && <button type="button" onClick={() => onSubmitReview(q)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm hover:bg-amber-50"><Send className="w-4 h-4" /> Gửi duyệt</button>}
                                {(q.status === 'in_review' || q.status === 'in-review') && (
                                  <>
                                    <button type="button" onClick={() => onApproveQuestion(q)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm hover:bg-emerald-50"><CheckCircle2 className="w-4 h-4" /> Phê duyệt</button>
                                    <button type="button" onClick={() => onRejectQuestion(q)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm hover:bg-rose-50"><XCircle className="w-4 h-4" /> Từ chối</button>
                                  </>
                                )}
                                {q.status === 'approved' && <button type="button" onClick={() => onPublishQuestion(q)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm hover:bg-emerald-50"><Globe className="w-4 h-4" /> Xuất bản</button>}
                                {q.status === 'published' && <button type="button" onClick={() => onUnpublishQuestion(q)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm hover:bg-amber-50"><Undo2 className="w-4 h-4" /> Gỡ xuất bản</button>}
                                <button type="button" onClick={() => onDeleteQuestion(q)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-rose-700 hover:bg-rose-50"><Trash2 className="w-4 h-4" /> Xóa câu hỏi</button>
                              </>
                            ) : <button type="button" onClick={() => onRestoreQuestion(q)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-emerald-700 hover:bg-emerald-50"><RotateCcw className="w-4 h-4" /> Khôi phục</button>}
                          </div>
                        </details>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="bg-white border-t border-slate-200 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-3">
          <span>
            Hiển thị <span className="font-semibold text-slate-900">{questions.length}</span> /{' '}
            <span className="font-semibold text-slate-900">{totalCount.toLocaleString()}</span> câu hỏi
          </span>

          <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200">
            <span>Mỗi trang:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="border border-slate-200 rounded px-2 py-1 text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#183B69]"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <span className="mr-2">
            Trang <span className="font-semibold text-slate-900">{currentPage}</span> / {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage <= 1 || isLoading}
            onClick={() => onPageChange(currentPage - 1)}
            className="p-1.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Trang trước"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={currentPage >= totalPages || isLoading}
            onClick={() => onPageChange(currentPage + 1)}
            className="p-1.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Trang sau"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
