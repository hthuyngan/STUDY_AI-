import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  Sparkles,
  Globe,
  Undo2,
  MoreVertical,
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

interface MenuCoords {
  top: number;
  right: number;
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

  // 3-dots Kebab Dropdown Menu state
  const [openMenuQuestionId, setOpenMenuQuestionId] = useState<string | null>(null);
  const [menuCoords, setMenuCoords] = useState<MenuCoords | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close kebab menu on outside click, window resize, scroll or Escape key
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuQuestionId(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenMenuQuestionId(null);
      }
    };

    const handleScrollOrResize = () => {
      setOpenMenuQuestionId(null);
    };

    if (openMenuQuestionId) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
      window.addEventListener('resize', handleScrollOrResize);
      window.addEventListener('scroll', handleScrollOrResize, true);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [openMenuQuestionId]);

  const handleToggleMenu = (q: ContentQuestionItem, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (openMenuQuestionId === q.id) {
      setOpenMenuQuestionId(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuCoords({
      top: rect.bottom + 6,
      right: window.innerWidth - rect.right,
    });
    setOpenMenuQuestionId(q.id);
  };

  // Helper for standardized status badge styling (Lỗi 5)
  const renderStatusBadge = (status: string, isDeleted?: boolean) => {
    if (isDeleted || isTrashView) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
          <Trash2 className="w-3.5 h-3.5 text-red-600" />
          Đã xóa
        </span>
      );
    }

    switch (status) {
      case 'published':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Đã xuất bản
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
            Đã duyệt
          </span>
        );
      case 'in_review':
      case 'in-review':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            Chờ duyệt
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Bị từ chối
          </span>
        );
      case 'draft':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
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
        return <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">Nhận biết</span>;
      case 'medium':
      case 'thong_hieu':
        return <span className="text-[11px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60">Thông hiểu</span>;
      case 'hard':
      case 'van_dung':
        return <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">Vận dụng</span>;
      case 'expert':
      case 'van_dung_cao':
        return <span className="text-[11px] font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200/60">VD cao</span>;
      default:
        return <span className="text-[11px] font-medium text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/60">{difficulty || 'Chuẩn'}</span>;
    }
  };

  // Helper for question type
  const renderQuestionType = (type?: string) => {
    switch (type) {
      case 'single_choice':
      case 'multiple-choice':
        return <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60">Trắc nghiệm</span>;
      case 'multiple_choice':
      case 'multiple-select':
        return <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60">Nhiều lựa chọn</span>;
      case 'true_false':
      case 'true-false':
        return <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60">Đúng / Sai</span>;
      case 'short_answer':
      case 'short-answer':
        return <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60">Điền câu trả lời</span>;
      case 'essay':
        return <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60">Tự luận</span>;
      default:
        return <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60">{type || 'Trắc nghiệm'}</span>;
    }
  };

  // Currently opened menu question
  const activeMenuQuestion = openMenuQuestionId
    ? questions.find((q) => q.id === openMenuQuestionId)
    : null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Table responsive container (Evondev R9 rule) */}
      <div className="overflow-x-auto min-w-full">
        {/* Streamlined 5-column Table: [Mã câu], [Môn / Lớp], [Nội dung câu hỏi], [Trạng thái], [Thao tác] */}
        <table className="staff-table w-full text-left text-sm border-collapse min-w-[760px]">
          <thead>
            <tr className="bg-slate-50/90 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <th className="py-3.5 px-4 w-28">Mã câu</th>
              <th className="py-3.5 px-4 w-36">Môn / Lớp</th>
              <th className="py-3.5 px-4 min-w-[320px]">Nội dung câu hỏi</th>
              <th className="py-3.5 px-4 w-32 text-center">Trạng thái</th>
              <th className="py-3.5 px-4 w-24 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              // Loading skeleton rows
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-20" /></td>
                  <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-24" /></td>
                  <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-3/4 mb-2" /><div className="h-3 bg-slate-100 rounded w-1/2" /></td>
                  <td className="py-4 px-4 text-center"><div className="h-5 bg-slate-200 rounded-full w-20 mx-auto" /></td>
                  <td className="py-4 px-4 text-right"><div className="h-7 bg-slate-200 rounded w-16 ml-auto" /></td>
                </tr>
              ))
            ) : questions.length === 0 ? (
              // Empty state
              <tr>
                <td colSpan={5} className="py-16 text-center text-slate-500">
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
              questions.map((q) => {
                const isSelected = selectedQuestionId === q.id;
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
                    {/* 1. Mã câu */}
                    <td className="py-3 px-4 align-top">
                      <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block">
                        {q.code || q.id.slice(0, 8)}
                      </span>
                    </td>

                    {/* 2. Môn / Lớp (Không hardcode mặc định Toán học hay lớp 12) */}
                    <td className="py-3 px-4 align-top">
                      <div className="font-medium text-slate-800 text-xs">
                        {q.subjectName || 'Chưa phân môn'}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {q.grade ? `Lớp ${q.grade}` : 'Chưa xếp lớp'}
                      </div>
                    </td>

                    {/* 3. Nội dung câu hỏi (Chiếm phần lớn chiều rộng, max 2-3 dòng, kèm dạng câu/độ khó/nguồn) */}
                    <td className="py-3 px-4 align-top">
                      <div className="line-clamp-2 text-xs text-slate-800 font-normal leading-relaxed mb-1.5">
                        <MathView math={q.prompt} />
                      </div>

                      {/* Metadata Chips: Dạng câu, Độ khó, Nguồn, Phương án */}
                      <div className="flex items-center flex-wrap gap-1.5">
                        {renderQuestionType(q.questionType || q.type)}
                        {renderDifficultyBadge(q.difficulty)}

                        {isVNHSGE ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded">
                            <Sparkles className="w-3 h-3 text-indigo-500" />
                            VNHSGE
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[11px] font-medium text-slate-600 bg-slate-100 border border-slate-200/60 px-2 py-0.5 rounded">
                            Thủ công
                          </span>
                        )}

                        {q.options && q.options.length > 0 && (
                          <span className="text-[11px] text-slate-400 font-normal ml-1">
                            {q.options.length} phương án
                            {q.correctAnswer && (
                              <span className="text-emerald-700 font-medium ml-1">
                                • Đáp án: {q.correctAnswer}
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 4. Trạng thái (Standardized Badge) */}
                    <td className="py-3 px-4 align-top text-center whitespace-nowrap">
                      {renderStatusBadge(q.status, q.isDeleted)}
                    </td>

                    {/* 5. Thao tác: Nút Xem trước độc lập + 3-dots Kebab Menu */}
                    <td className="py-3 px-4 align-top text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {/* 1-Click Preview Button */}
                        <button
                          type="button"
                          onClick={() => {
                            onSelectQuestion(q);
                            onPreviewModal(q);
                          }}
                          title="Xem trước"
                          aria-label="Xem trước"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-[#183B69] hover:bg-slate-100 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* 3-dots Kebab Dropdown Menu Trigger */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleMenu(q, e)}
                          title="Thao tác khác"
                          aria-label="Thao tác khác"
                          aria-haspopup="true"
                          aria-expanded={openMenuQuestionId === q.id}
                          className={`p-1.5 rounded-lg transition-colors ${
                            openMenuQuestionId === q.id
                              ? 'bg-slate-200 text-slate-900'
                              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                          }`}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Portal Kebab Menu Dropdown (Prevents clipping inside table overflow-x-auto container) */}
      {openMenuQuestionId && activeMenuQuestion && menuCoords && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            className="kebab-menu-portal fixed z-50 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 min-w-[190px] text-xs font-medium text-slate-700 animate-fadeIn"
            style={{
              top: `${menuCoords.top}px`,
              right: `${menuCoords.right}px`,
            }}
            role="menu"
            aria-orientation="vertical"
          >
            {!isTrashView ? (
              <>
                {/* Chỉnh sửa */}
                <button
                  type="button"
                  title="Chỉnh sửa"
                  onClick={() => {
                    setOpenMenuQuestionId(null);
                    onEditQuestion(activeMenuQuestion);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left hover:bg-slate-50 hover:text-[#183B69] transition-colors"
                  role="menuitem"
                >
                  <Edit2 className="w-4 h-4 text-blue-600" />
                  <span>Chỉnh sửa</span>
                </button>

                {/* Gửi kiểm duyệt (draft hoặc rejected) */}
                {(activeMenuQuestion.status === 'draft' || activeMenuQuestion.status === 'rejected') && (
                  <button
                    type="button"
                    title="Gửi kiểm duyệt"
                    onClick={() => {
                      setOpenMenuQuestionId(null);
                      onSubmitReview(activeMenuQuestion);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left hover:bg-amber-50 text-amber-700 transition-colors"
                    role="menuitem"
                  >
                    <Send className="w-4 h-4 text-amber-600" />
                    <span>Gửi kiểm duyệt</span>
                  </button>
                )}

                {/* Phê duyệt / Từ chối (in_review hoặc in-review) */}
                {(activeMenuQuestion.status === 'in_review' || activeMenuQuestion.status === 'in-review') && (
                  <>
                    <button
                      type="button"
                      title="Phê duyệt"
                      onClick={() => {
                        setOpenMenuQuestionId(null);
                        onApproveQuestion(activeMenuQuestion);
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left hover:bg-emerald-50 text-emerald-700 transition-colors"
                      role="menuitem"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Phê duyệt</span>
                    </button>
                    <button
                      type="button"
                      title="Từ chối"
                      onClick={() => {
                        setOpenMenuQuestionId(null);
                        onRejectQuestion(activeMenuQuestion);
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left hover:bg-rose-50 text-rose-700 transition-colors"
                      role="menuitem"
                    >
                      <XCircle className="w-4 h-4 text-rose-600" />
                      <span>Từ chối</span>
                    </button>
                  </>
                )}

                {/* Xuất bản (approved) */}
                {activeMenuQuestion.status === 'approved' && (
                  <button
                    type="button"
                    title="Xuất bản"
                    onClick={() => {
                      setOpenMenuQuestionId(null);
                      onPublishQuestion(activeMenuQuestion);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left hover:bg-emerald-50 text-emerald-700 transition-colors"
                    role="menuitem"
                  >
                    <Globe className="w-4 h-4 text-emerald-600" />
                    <span>Xuất bản</span>
                  </button>
                )}

                {/* Gỡ xuất bản (published) */}
                {activeMenuQuestion.status === 'published' && (
                  <button
                    type="button"
                    title="Gỡ xuất bản"
                    onClick={() => {
                      setOpenMenuQuestionId(null);
                      onUnpublishQuestion(activeMenuQuestion);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left hover:bg-amber-50 text-amber-700 transition-colors"
                    role="menuitem"
                  >
                    <Undo2 className="w-4 h-4 text-amber-600" />
                    <span>Gỡ xuất bản</span>
                  </button>
                )}

                <div className="h-px bg-slate-100 my-1" />

                {/* Xóa mềm */}
                <button
                  type="button"
                  title="Xóa mềm"
                  onClick={() => {
                    setOpenMenuQuestionId(null);
                    onDeleteQuestion(activeMenuQuestion);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left hover:bg-rose-50 text-rose-600 transition-colors"
                  role="menuitem"
                >
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <span>Xóa mềm</span>
                </button>
              </>
            ) : (
              /* Thùng rác: Khôi phục */
              <button
                type="button"
                title="Khôi phục"
                onClick={() => {
                  setOpenMenuQuestionId(null);
                  onRestoreQuestion(activeMenuQuestion);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left hover:bg-emerald-50 text-emerald-700 transition-colors"
                role="menuitem"
              >
                <RotateCcw className="w-4 h-4 text-emerald-600" />
                <span>Khôi phục câu hỏi</span>
              </button>
            )}
          </div>,
          document.body
        )
      }

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
