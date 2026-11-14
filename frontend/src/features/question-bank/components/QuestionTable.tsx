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
import styles from '../QuestionBank.module.css';

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

  // Helper for standardized status badge styling
  const renderStatusBadge = (status: string, isDeleted?: boolean) => {
    if (isDeleted || isTrashView) {
      return (
        <span className={`${styles.badge} ${styles.badgeDeleted}`}>
          <Trash2 size={13} style={{ color: '#dc2626' }} />
          Đã xóa
        </span>
      );
    }

    switch (status) {
      case 'published':
        return (
          <span className={`${styles.badge} ${styles.badgePublished}`}>
            <span className={`${styles.badgeDot} ${styles.dotPublished}`} />
            Đã xuất bản
          </span>
        );
      case 'approved':
        return (
          <span className={`${styles.badge} ${styles.badgeApproved}`}>
            <CheckCircle2 size={13} style={{ color: '#1d4ed8' }} />
            Đã duyệt
          </span>
        );
      case 'in_review':
      case 'in-review':
        return (
          <span className={`${styles.badge} ${styles.badgeInReview}`}>
            <AlertCircle size={13} style={{ color: '#d97706' }} />
            Chờ duyệt
          </span>
        );
      case 'rejected':
        return (
          <span className={`${styles.badge} ${styles.badgeRejected}`}>
            <XCircle size={13} style={{ color: '#e11d48' }} />
            Bị từ chối
          </span>
        );
      case 'draft':
      default:
        return (
          <span className={`${styles.badge} ${styles.badgeDraft}`}>
            <span className={`${styles.badgeDot} ${styles.dotDraft}`} />
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
        return <span className={`${styles.chip} ${styles.chipEasy}`}>Nhận biết</span>;
      case 'medium':
      case 'thong_hieu':
        return <span className={`${styles.chip} ${styles.chipMedium}`}>Thông hiểu</span>;
      case 'hard':
      case 'van_dung':
        return <span className={`${styles.chip} ${styles.chipHard}`}>Vận dụng</span>;
      case 'expert':
      case 'van_dung_cao':
        return <span className={`${styles.chip} ${styles.chipExpert}`}>VD cao</span>;
      default:
        return <span className={`${styles.chip} ${styles.chipDefault}`}>{difficulty || 'Chuẩn'}</span>;
    }
  };

  // Helper for question type
  const renderQuestionType = (type?: string) => {
    switch (type) {
      case 'single_choice':
      case 'multiple-choice':
        return <span className={`${styles.chip} ${styles.chipDefault}`}>Trắc nghiệm</span>;
      case 'multiple_choice':
      case 'multiple-select':
        return <span className={`${styles.chip} ${styles.chipDefault}`}>Nhiều lựa chọn</span>;
      case 'true_false':
      case 'true-false':
        return <span className={`${styles.chip} ${styles.chipDefault}`}>Đúng / Sai</span>;
      case 'short_answer':
      case 'short-answer':
        return <span className={`${styles.chip} ${styles.chipDefault}`}>Điền câu trả lời</span>;
      case 'essay':
        return <span className={`${styles.chip} ${styles.chipDefault}`}>Tự luận</span>;
      default:
        return <span className={`${styles.chip} ${styles.chipDefault}`}>{type || 'Trắc nghiệm'}</span>;
    }
  };

  // Currently opened menu question
  const activeMenuQuestion = openMenuQuestionId
    ? questions.find((q) => q.id === openMenuQuestionId)
    : null;

  return (
    <div className={styles.tableCard}>
      {/* Table responsive container */}
      <div className={styles.tableScroll}>
        {/* Streamlined 5-column Table: [Mã câu], [Môn / Lớp], [Nội dung câu hỏi], [Trạng thái], [Thao tác] */}
        <table className={`staff-table ${styles.table}`}>
          <thead>
            <tr>
              <th className={`${styles.th} ${styles.thCode}`}>Mã câu</th>
              <th className={`${styles.th} ${styles.thSubject}`}>Môn / Lớp</th>
              <th className={`${styles.th} ${styles.thContent}`}>Nội dung câu hỏi</th>
              <th className={`${styles.th} ${styles.thStatus}`}>Trạng thái</th>
              <th className={`${styles.th} ${styles.thActions}`}>Thao tác</th>
            </tr>
          </thead>
          <tbody className={styles.tbody}>
            {isLoading ? (
              // Loading skeleton rows
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  <td className={styles.td} style={{ padding: '16px' }}><div style={{ height: '16px', background: '#e2e8f0', borderRadius: '4px', width: '80px' }} /></td>
                  <td className={styles.td} style={{ padding: '16px' }}><div style={{ height: '16px', background: '#e2e8f0', borderRadius: '4px', width: '96px' }} /></td>
                  <td className={styles.td} style={{ padding: '16px' }}><div style={{ height: '16px', background: '#e2e8f0', borderRadius: '4px', width: '75%', marginBottom: '8px' }} /><div style={{ height: '12px', background: '#f1f5f9', borderRadius: '4px', width: '50%' }} /></td>
                  <td className={styles.td} style={{ padding: '16px', textAlign: 'center' }}><div style={{ height: '20px', background: '#e2e8f0', borderRadius: '9999px', width: '80px', margin: '0 auto' }} /></td>
                  <td className={styles.td} style={{ padding: '16px', textAlign: 'right' }}><div style={{ height: '28px', background: '#e2e8f0', borderRadius: '6px', width: '60px', marginLeft: 'auto' }} /></td>
                </tr>
              ))
            ) : questions.length === 0 ? (
              // Empty state
              <tr>
                <td colSpan={5} style={{ padding: '64px 16px', textAlign: 'center', color: '#64748b' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', maxWidth: '360px', margin: '0 auto' }}>
                    <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', marginBottom: '16px' }}>
                      <FileQuestion size={28} />
                    </div>
                    <p style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b', margin: '0 0 4px 0' }}>
                      {isTrashView ? 'Thùng rác trống' : 'Không tìm thấy câu hỏi nào'}
                    </p>
                    <p style={{ fontSize: '12.5px', color: '#64748b', margin: 0 }}>
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
                    className={`${styles.tr} ${isSelected ? styles.trSelected : ''}`}
                  >
                    {/* 1. Mã câu */}
                    <td className={styles.td}>
                      <span className={styles.codeBadge}>
                        {q.code || q.id.slice(0, 8)}
                      </span>
                    </td>

                    {/* 2. Môn / Lớp */}
                    <td className={styles.td}>
                      <div className={styles.subjectName}>
                        {q.subjectName || 'Chưa phân môn'}
                      </div>
                      <div className={styles.gradeText}>
                        {q.grade ? `Lớp ${q.grade}` : 'Chưa xếp lớp'}
                      </div>
                    </td>

                    {/* 3. Nội dung câu hỏi (MathView + Chips) */}
                    <td className={styles.td}>
                      <div className={styles.promptClamp}>
                        <MathView math={q.prompt} />
                      </div>

                      {/* Metadata Chips: Dạng câu, Độ khó, Nguồn, Phương án */}
                      <div className={styles.metaRow}>
                        {renderQuestionType(q.questionType || q.type)}
                        {renderDifficultyBadge(q.difficulty)}

                        {isVNHSGE ? (
                          <span className={`${styles.chip} ${styles.chipVnhsge}`}>
                            <Sparkles size={11} style={{ color: '#6366f1' }} />
                            VNHSGE
                          </span>
                        ) : (
                          <span className={`${styles.chip} ${styles.chipDefault}`}>
                            Thủ công
                          </span>
                        )}

                        {q.options && q.options.length > 0 && (
                          <span className={styles.optionsCount}>
                            {q.options.length} phương án
                            {q.correctAnswer && (
                              <span className={styles.correctAnswerText}>
                                • Đáp án: {q.correctAnswer}
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 4. Trạng thái (Standardized Badge) */}
                    <td className={styles.td} style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {renderStatusBadge(q.status, q.isDeleted)}
                    </td>

                    {/* 5. Thao tác: Nút Xem trước độc lập + 3-dots Kebab Menu */}
                    <td className={styles.td} style={{ textAlign: 'right', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                      <div className={styles.rowActions}>
                        {/* 1-Click Preview Button */}
                        <button
                          type="button"
                          onClick={() => {
                            onSelectQuestion(q);
                            onPreviewModal(q);
                          }}
                          title="Xem trước"
                          aria-label="Xem trước"
                          className={styles.actionBtn}
                        >
                          <Eye size={16} />
                        </button>

                        {/* 3-dots Kebab Dropdown Menu Trigger */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleMenu(q, e)}
                          title="Thao tác khác"
                          aria-label="Thao tác khác"
                          aria-haspopup="true"
                          aria-expanded={openMenuQuestionId === q.id}
                          className={`${styles.actionBtn} ${openMenuQuestionId === q.id ? styles.actionBtnActive : ''}`}
                        >
                          <MoreVertical size={16} />
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

      {/* Portal Kebab Menu Dropdown */}
      {openMenuQuestionId && activeMenuQuestion && menuCoords && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            className={`kebab-menu-portal ${styles.kebabPortal}`}
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
                  className={styles.kebabItem}
                  role="menuitem"
                >
                  <Edit2 size={14} style={{ color: '#2563eb' }} />
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
                    className={`${styles.kebabItem} ${styles.kebabItemWarning}`}
                    role="menuitem"
                  >
                    <Send size={14} style={{ color: '#d97706' }} />
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
                      className={`${styles.kebabItem} ${styles.kebabItemSuccess}`}
                      role="menuitem"
                    >
                      <CheckCircle2 size={14} style={{ color: '#16a34a' }} />
                      <span>Phê duyệt</span>
                    </button>
                    <button
                      type="button"
                      title="Từ chối"
                      onClick={() => {
                        setOpenMenuQuestionId(null);
                        onRejectQuestion(activeMenuQuestion);
                      }}
                      className={`${styles.kebabItem} ${styles.kebabItemDanger}`}
                      role="menuitem"
                    >
                      <XCircle size={14} style={{ color: '#dc2626' }} />
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
                    className={`${styles.kebabItem} ${styles.kebabItemSuccess}`}
                    role="menuitem"
                  >
                    <Globe size={14} style={{ color: '#16a34a' }} />
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
                    className={`${styles.kebabItem} ${styles.kebabItemWarning}`}
                    role="menuitem"
                  >
                    <Undo2 size={14} style={{ color: '#d97706' }} />
                    <span>Gỡ xuất bản</span>
                  </button>
                )}

                <div className={styles.kebabDivider} />

                {/* Xóa mềm */}
                <button
                  type="button"
                  title="Xóa mềm"
                  onClick={() => {
                    setOpenMenuQuestionId(null);
                    onDeleteQuestion(activeMenuQuestion);
                  }}
                  className={`${styles.kebabItem} ${styles.kebabItemDanger}`}
                  role="menuitem"
                >
                  <Trash2 size={14} style={{ color: '#dc2626' }} />
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
                className={`${styles.kebabItem} ${styles.kebabItemSuccess}`}
                role="menuitem"
              >
                <RotateCcw size={14} style={{ color: '#16a34a' }} />
                <span>Khôi phục câu hỏi</span>
              </button>
            )}
          </div>,
          document.body
        )
      }

      {/* Pagination Footer */}
      <div className={styles.pagination}>
        <div className={styles.paginationLeft}>
          <span className={styles.paginationCount}>
            Hiển thị <strong>{questions.length}</strong> /{' '}
            <strong>{totalCount.toLocaleString()}</strong> câu hỏi
          </span>

          <div className={styles.pageSizeGroup}>
            <span>Mỗi trang:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className={styles.pageSizeSelect}
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        <div className={styles.paginationRight}>
          <span className={styles.pageNumber}>
            Trang <strong>{currentPage}</strong> / {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage <= 1 || isLoading}
            onClick={() => onPageChange(currentPage - 1)}
            className={styles.pageNavBtn}
            title="Trang trước"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            disabled={currentPage >= totalPages || isLoading}
            onClick={() => onPageChange(currentPage + 1)}
            className={styles.pageNavBtn}
            title="Trang sau"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
