import React, { useState } from 'react';
import {
  CheckCircle,
  AlertCircle,
  Database,
  X,
  BookOpen,
} from 'lucide-react';
import type { ContentQuestionItem } from '../types';
import { useQuestionBank } from '../hooks/useQuestionBank';
import { QuestionBankKPIs } from '../components/QuestionBankKPIs';
import { QuestionFilters } from '../components/QuestionFilters';
import { QuestionTable } from '../components/QuestionTable';
import { QuestionPreviewPanel } from '../components/QuestionPreviewPanel';
import { QuestionFormModal } from '../components/QuestionFormModal';
import { QuestionRejectModal } from '../components/QuestionRejectModal';
import { QuestionDeleteModal } from '../components/QuestionDeleteModal';
import { MathView } from '../../../components/common/MathView';
import styles from '../QuestionBank.module.css';

const SUBJECT_OPTIONS = [
  { id: 'all', name: 'Tất cả môn học' },
  { id: 'math', name: 'Toán học' },
  { id: 'physics', name: 'Vật lý' },
  { id: 'chemistry', name: 'Hóa học' },
  { id: 'english', name: 'Tiếng Anh' },
  { id: 'history', name: 'Lịch sử' },
  { id: 'geography', name: 'Địa lý' },
  { id: 'biology', name: 'Sinh học' },
  { id: 'civic', name: 'Giáo dục công dân' },
  { id: 'literature', name: 'Ngữ văn' },
];

export const ModernQuestionBankPage: React.FC = () => {
  const {
    questions,
    totalCount,
    currentPage,
    pageSize,
    isLoading,
    kpiStats,
    filters,
    selectedQuestion,
    activeModal,
    targetQuestion,
    toast,
    setPage,
    setPageSize,
    updateFilters,
    resetFilters,
    setSelectedQuestion,
    openCreateModal,
    openEditModal,
    openRejectModal,
    openDeleteModal,
    closeModal,
    handleSaveQuestion,
    handleDeleteQuestion,
    handleRestoreQuestion,
    handleSubmitReview,
    handleApproveQuestion,
    handleRejectQuestion,
    handlePublishQuestion,
    handleUnpublishQuestion,
  } = useQuestionBank();

  // Standalone preview modal state (for deep inspection & Scenario 6 E2E compatibility)
  const [previewModalQuestion, setPreviewModalQuestion] = useState<ContentQuestionItem | null>(null);

  return (
    <div className={styles.page}>
      {/* Toast Notification Banner */}
      {toast && (
        <div className={styles.toastOverlay}>
          <div
            className={`${styles.toast} ${
              toast.type === 'success' ? styles.toastSuccess : styles.toastError
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle size={18} style={{ flexShrink: 0 }} />
            ) : (
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className={styles.container}>
        {/* Page Top Header */}
        <div className={styles.header}>
          <div>
            <div className={styles.headerTitleGroup}>
              <div className={styles.headerIcon}>
                <Database size={20} />
              </div>
              <h1 className={styles.headerTitle}>
                Ngân hàng câu hỏi
              </h1>
            </div>
            <p className={styles.headerSubtitle}>
              Quản lý toàn bộ câu hỏi ôn luyện, ngân hàng đề VNHSGE và quy trình kiểm duyệt nội dung của vai trò Content.
            </p>
          </div>
        </div>

        {/* Section 1: Real KPI Dashboard Cards */}
        <QuestionBankKPIs stats={kpiStats} loading={isLoading && !kpiStats} />

        {/* Section 2: Comprehensive Filters */}
        <QuestionFilters
          filters={filters}
          onFilterChange={updateFilters}
          onReset={resetFilters}
          subjects={SUBJECT_OPTIONS}
          onOpenCreate={openCreateModal}
        />

        {/* Section 3: Master-Detail Workstation Layout */}
        <div className={styles.workstation}>
          {/* Left/Main Column: Question Table */}
          <div className={styles.tableCol}>
            <QuestionTable
              questions={questions}
              totalCount={totalCount}
              currentPage={currentPage}
              pageSize={pageSize}
              isLoading={isLoading}
              selectedQuestionId={selectedQuestion?.id || null}
              isTrashView={Boolean(filters.includeDeleted)}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              onSelectQuestion={setSelectedQuestion}
              onPreviewModal={setPreviewModalQuestion}
              onEditQuestion={openEditModal}
              onDeleteQuestion={openDeleteModal}
              onRestoreQuestion={(q) => handleRestoreQuestion(q.id)}
              onSubmitReview={(q) => handleSubmitReview(q.id)}
              onApproveQuestion={(q) => handleApproveQuestion(q.id)}
              onRejectQuestion={openRejectModal}
              onPublishQuestion={(q) => handlePublishQuestion(q.id)}
              onUnpublishQuestion={(q) => handleUnpublishQuestion(q.id)}
            />
          </div>

          {/* Right Column: Master-Detail Preview Panel */}
          {selectedQuestion && (
            <div className={styles.previewCol}>
              <QuestionPreviewPanel
                question={selectedQuestion}
                onClose={() => setSelectedQuestion(null)}
                onEdit={openEditModal}
                onDelete={openDeleteModal}
                onRestore={(q) => handleRestoreQuestion(q.id)}
                onSubmitReview={(q) => handleSubmitReview(q.id)}
                onApprove={(q) => handleApproveQuestion(q.id)}
                onReject={openRejectModal}
                onPublish={(q) => handlePublishQuestion(q.id)}
                onUnpublish={(q) => handleUnpublishQuestion(q.id)}
                isTrashView={Boolean(filters.includeDeleted)}
              />
            </div>
          )}
        </div>
      </div>

      {/* ================= STANDALONE PREVIEW MODAL ================= */}
      {previewModalQuestion && (
        <div className={styles.modalBackdrop}>
          <div className={`staff-modal ${styles.modalDialog} ${styles.modalMd}`}>
            {/* Header */}
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={styles.codeBadge}>
                  {previewModalQuestion.code || previewModalQuestion.id.slice(0, 8)}
                </span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  {previewModalQuestion.subjectName} • Lớp {previewModalQuestion.grade}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewModalQuestion(null)}
                className={`staff-modal-close ${styles.closeIconBtn}`}
                title="Đóng modal"
                aria-label="Đóng modal"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className={styles.modalBody}>
              <div className={styles.previewSectionTitle}>
                <BookOpen size={14} style={{ color: '#183b69' }} />
                Nội dung câu hỏi
              </div>
              <div style={{ fontSize: '13.5px', color: '#0f172a', lineHeight: 1.6, padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <MathView math={previewModalQuestion.prompt} />
              </div>

              {/* Options */}
              {previewModalQuestion.options && previewModalQuestion.options.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '4px' }}>
                  <div className={styles.previewSectionTitle}>
                    Phương án trả lời
                  </div>
                  {previewModalQuestion.options.map((optStr, idx) => {
                    const match = typeof optStr === 'string' ? optStr.match(/^(\[[A-Z]\]|[A-Z]\.|\([A-Z]\)|[A-Z]:)\s*(.*)$/i) : null;
                    const key = match ? match[1].replace(/[[\]().:]/g, '').toUpperCase() : String.fromCharCode(65 + idx);
                    const text = match ? match[2] : (optStr as string);
                    const isCorrect = previewModalQuestion.correctAnswer?.trim().toUpperCase() === key;

                    return (
                      <div
                        key={key}
                        className={`${styles.optionCard} ${isCorrect ? styles.optionCorrect : ''}`}
                      >
                        <span
                          className={`${styles.optionCircle} ${isCorrect ? styles.optionCircleCorrect : ''}`}
                        >
                          {key}
                        </span>
                        <div className={styles.optionText}>
                          <MathView math={text} />
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

              {/* Explanation */}
              {previewModalQuestion.explanation && (
                <div style={{ paddingTop: '4px' }}>
                  <div className={styles.previewSectionTitle} style={{ color: '#1d4ed8' }}>
                    Lời giải chi tiết
                  </div>
                  <div className={styles.explanationBox}>
                    <MathView math={previewModalQuestion.explanation} />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className={styles.modalFooter}>
              <button
                type="button"
                onClick={() => setPreviewModalQuestion(null)}
                className={`staff-modal-close ${styles.btn} ${styles.btnSecondary}`}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODALS ================= */}

      {/* Form Modal for Create & Edit */}
      {(activeModal === 'create' || activeModal === 'edit') && (
        <QuestionFormModal
          key={targetQuestion?.id || 'new'}
          isOpen={true}
          initialQuestion={targetQuestion}
          onClose={closeModal}
          onSave={handleSaveQuestion}
        />
      )}

      {/* Reject Modal with Reason */}
      {activeModal === 'reject' && (
        <QuestionRejectModal
          isOpen={true}
          question={targetQuestion}
          onClose={closeModal}
          onConfirm={handleRejectQuestion}
        />
      )}

      {/* Delete / Soft Delete Modal */}
      {activeModal === 'delete' && (
        <QuestionDeleteModal
          isOpen={true}
          question={targetQuestion}
          onClose={closeModal}
          onConfirm={handleDeleteQuestion}
        />
      )}
    </div>
  );
};

export default ModernQuestionBankPage;
