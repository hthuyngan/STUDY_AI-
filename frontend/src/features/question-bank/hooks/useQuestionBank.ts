import { useState, useEffect, useCallback } from 'react';
import type {
  ContentQuestionItem,
  QuestionFilterParams,
  QuestionStatsResponse,
  CreateQuestionPayload,
} from '../types';
import { questionBankApi } from '../api/questionBankApi';

const DEFAULT_FILTERS: QuestionFilterParams = {
  search: '',
  subjectId: '',
  grade: undefined,
  difficulty: '',
  type: '',
  status: '',
  sourceType: '',
};

export const useQuestionBank = () => {
  const [questions, setQuestions] = useState<ContentQuestionItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [kpiStats, setKpiStats] = useState<QuestionStatsResponse | null>(null);
  const [filters, setFiltersState] = useState<QuestionFilterParams>(DEFAULT_FILTERS);
  const [isTrashView, setIsTrashView] = useState(false);

  // Selected question for master-detail preview panel
  const [selectedQuestion, setSelectedQuestion] = useState<ContentQuestionItem | null>(null);

  // Modals state
  const [activeModal, setActiveModal] = useState<'create' | 'edit' | 'reject' | 'delete' | null>(null);
  const [targetQuestion, setTargetQuestion] = useState<ContentQuestionItem | null>(null);

  // Trigger for refreshing list
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Toast feedback state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Effect to load KPIs
  useEffect(() => {
    let isCancelled = false;
    questionBankApi.getStatistics()
      .then((stats) => {
        if (!isCancelled) setKpiStats(stats);
      })
      .catch(() => {});

    return () => {
      isCancelled = true;
    };
  }, [refreshTrigger]);

  // Effect to load Questions list
  useEffect(() => {
    let isCancelled = false;

    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const res = await questionBankApi.getQuestions({
          ...filters,
          page: currentPage,
          pageSize,
          includeDeleted: Boolean(filters.includeDeleted) || isTrashView,
        });

        if (!isCancelled) {
          setQuestions(res.items);
          setTotalCount(res.total);

          if (res.items.length > 0) {
            setSelectedQuestion((prev: ContentQuestionItem | null) => {
              if (!prev) return res.items[0];
              const found = res.items.find((item: ContentQuestionItem) => item.id === prev.id);
              return found || res.items[0];
            });
          } else {
            setSelectedQuestion(null);
          }
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          const msg = err instanceof Error ? err.message : 'Lỗi khi tải danh sách câu hỏi';
          setError(msg);
          showToast(msg, 'error');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      isCancelled = true;
    };
  }, [filters, currentPage, pageSize, isTrashView, refreshTrigger, showToast]);

  // Filter handlers
  const updateFilters = useCallback((newFilters: Partial<QuestionFilterParams>) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }));
    setCurrentPage(1); // Reset to page 1 on filter change
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
    setCurrentPage(1);
  }, []);

  const toggleTrashView = useCallback((trash: boolean) => {
    setIsTrashView(trash);
    setCurrentPage(1);
    setSelectedQuestion(null);
  }, []);

  // Modal Openers
  const openCreateModal = useCallback(() => {
    setTargetQuestion(null);
    setActiveModal('create');
  }, []);

  const openEditModal = useCallback((q: ContentQuestionItem) => {
    setTargetQuestion(q);
    setActiveModal('edit');
  }, []);

  const openRejectModal = useCallback((q: ContentQuestionItem) => {
    setTargetQuestion(q);
    setActiveModal('reject');
  }, []);

  const openDeleteModal = useCallback((q: ContentQuestionItem) => {
    setTargetQuestion(q);
    setActiveModal('delete');
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
    setTargetQuestion(null);
  }, []);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger((prev: number) => prev + 1);
  }, []);

  // CRUD Actions
  const handleSaveQuestion = useCallback(
    async (payload: CreateQuestionPayload, id?: string) => {
      try {
        if (id) {
          const updated = await questionBankApi.updateQuestion(id, payload);
          showToast('Cập nhật câu hỏi thành công!', 'success');
          setSelectedQuestion(updated);
        } else {
          await questionBankApi.createQuestion(payload);
          showToast('Tạo câu hỏi mới thành công!', 'success');
        }
        triggerRefresh();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Lỗi khi lưu câu hỏi';
        showToast(msg, 'error');
        throw err;
      }
    },
    [triggerRefresh, showToast]
  );

  const handleDeleteQuestion = useCallback(
    async (id: string) => {
      try {
        await questionBankApi.deleteQuestion(id);
        showToast('Đã chuyển câu hỏi vào thùng rác', 'success');
        triggerRefresh();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Lỗi khi xóa câu hỏi';
        showToast(msg, 'error');
        throw err;
      }
    },
    [triggerRefresh, showToast]
  );

  const handleRestoreQuestion = useCallback(
    async (id: string) => {
      try {
        await questionBankApi.restoreQuestion(id);
        showToast('Khôi phục câu hỏi thành công!', 'success');
        triggerRefresh();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Lỗi khi khôi phục';
        showToast(msg, 'error');
      }
    },
    [triggerRefresh, showToast]
  );

  // Workflow / Content Primacy Moderation Actions
  const handleSubmitReview = useCallback(
    async (id: string) => {
      try {
        const updated = await questionBankApi.submitReview(id);
        showToast('Đã gửi câu hỏi vào hàng đợi kiểm duyệt', 'success');
        setSelectedQuestion(updated);
        triggerRefresh();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Lỗi khi gửi duyệt';
        showToast(msg, 'error');
      }
    },
    [triggerRefresh, showToast]
  );

  const handleApproveQuestion = useCallback(
    async (id: string) => {
      try {
        const updated = await questionBankApi.approveQuestion(id);
        showToast('Phê duyệt câu hỏi thành công!', 'success');
        setSelectedQuestion(updated);
        triggerRefresh();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Lỗi khi phê duyệt';
        showToast(msg, 'error');
      }
    },
    [triggerRefresh, showToast]
  );

  const handleRejectQuestion = useCallback(
    async (id: string, reason: string) => {
      try {
        const updated = await questionBankApi.rejectQuestion(id, reason);
        showToast('Đã từ chối câu hỏi kèm lý do', 'success');
        setSelectedQuestion(updated);
        triggerRefresh();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Lỗi khi từ chối';
        showToast(msg, 'error');
        throw err;
      }
    },
    [triggerRefresh, showToast]
  );

  const handlePublishQuestion = useCallback(
    async (id: string) => {
      try {
        const updated = await questionBankApi.publishQuestion(id);
        showToast('Xuất bản câu hỏi thành công!', 'success');
        setSelectedQuestion(updated);
        triggerRefresh();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Lỗi khi xuất bản';
        showToast(msg, 'error');
      }
    },
    [triggerRefresh, showToast]
  );

  const handleUnpublishQuestion = useCallback(
    async (id: string) => {
      try {
        const updated = await questionBankApi.unpublishQuestion(id);
        showToast('Đã thu hồi câu hỏi về trạng thái duyệt', 'success');
        setSelectedQuestion(updated);
        triggerRefresh();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Lỗi khi thu hồi';
        showToast(msg, 'error');
      }
    },
    [triggerRefresh, showToast]
  );

  return {
    questions,
    totalCount,
    currentPage,
    pageSize,
    isLoading,
    error,
    kpiStats,
    filters,
    isTrashView,
    selectedQuestion,
    activeModal,
    targetQuestion,
    toast,
    // Actions
    setPage: setCurrentPage,
    setPageSize,
    updateFilters,
    resetFilters,
    toggleTrashView,
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
    reload: triggerRefresh,
  };
};
