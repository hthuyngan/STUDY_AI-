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
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-6 lg:p-8 font-sans text-slate-800">
      {/* Toast Notification Banner */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 animate-slideIn">
          <div
            className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium ${
              toast.type === 'success'
                ? 'bg-emerald-600 text-white border-emerald-700'
                : 'bg-rose-600 text-white border-rose-700'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle className="w-5 h-5 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Page Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-9 h-9 rounded-xl bg-[#183B69] flex items-center justify-center text-white shadow-sm">
                <Database className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Ngân hàng câu hỏi
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
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
        <div className="flex flex-col lg:flex-row items-start gap-6">
          {/* Left/Main Column: Question Table */}
          <div className="flex-1 w-full min-w-0">
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
            <div className="w-full lg:w-auto shrink-0 animate-fadeIn">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="staff-modal bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden animate-scaleUp">
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {previewModalQuestion.code || previewModalQuestion.id.slice(0, 8)}
                </span>
                <span className="text-xs text-slate-500">
                  {previewModalQuestion.subjectName} • Lớp {previewModalQuestion.grade}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewModalQuestion(null)}
                className="staff-modal-close p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
                title="Đóng modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-[#183B69]" />
                Nội dung câu hỏi
              </div>
              <div className="text-sm text-slate-900 leading-relaxed font-normal p-3 bg-slate-50/70 rounded-lg border border-slate-200">
                <MathView math={previewModalQuestion.prompt} />
              </div>

              {/* Options */}
              {previewModalQuestion.options && previewModalQuestion.options.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
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
                        className={`p-2.5 rounded-lg border flex items-start gap-2 ${
                          isCorrect ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-medium' : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${
                          isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 border'
                        }`}>
                          {key}
                        </span>
                        <div className="flex-1">
                          <MathView math={text} />
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

              {/* Explanation */}
              {previewModalQuestion.explanation && (
                <div className="pt-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-blue-700 mb-1">
                    Lời giải chi tiết
                  </div>
                  <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100 text-slate-800 leading-relaxed">
                    <MathView math={previewModalQuestion.explanation} />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewModalQuestion(null)}
                className="staff-modal-close px-4 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
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
