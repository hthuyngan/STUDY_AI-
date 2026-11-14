import React, { useState } from 'react';
import {
  X,
  Layers,
  FileEdit,
  Save,
  AlertCircle,
  BookOpen,
} from 'lucide-react';
import type { ContentQuestionItem, CreateQuestionPayload, QuestionOption } from '../types';
import { MathView } from '../../../components/common/MathView';

interface QuestionFormModalProps {
  isOpen: boolean;
  initialQuestion?: ContentQuestionItem | null;
  onSave: (payload: CreateQuestionPayload, id?: string) => Promise<void>;
  onClose: () => void;
}

export const QuestionFormModal: React.FC<QuestionFormModalProps> = ({
  isOpen,
  initialQuestion,
  onClose,
  onSave,
}) => {
  const isEdit = !!initialQuestion;

  // Form states
  const [code, setCode] = useState(() => initialQuestion?.code || `Q-${Date.now().toString().slice(-6)}`);
  const [subjectId, setSubjectId] = useState(() => initialQuestion?.subjectId || 'sub-math');
  const [grade, setGrade] = useState(() => initialQuestion?.grade || 12);
  const [questionType, setQuestionType] = useState(() => initialQuestion?.questionType || initialQuestion?.type || 'multiple-choice');
  const [difficulty, setDifficulty] = useState(() => initialQuestion?.difficulty || 'medium');
  const [topic, setTopic] = useState(() => initialQuestion?.topic || '');
  const [status, setStatus] = useState(() => initialQuestion?.status || 'draft');

  const [prompt, setPrompt] = useState(() => initialQuestion?.prompt || '');
  const [imageUrl, setImageUrl] = useState(() => initialQuestion?.imageUrl || '');

  const [options, setOptions] = useState<QuestionOption[]>(() => {
    if (initialQuestion?.options && Array.isArray(initialQuestion.options) && initialQuestion.options.length > 0) {
      return initialQuestion.options.map((opt: unknown, idx: number) => {
        if (typeof opt === 'string') {
          const match = opt.match(/^(\[[A-Z]\]|[A-Z]\.|\([A-Z]\)|[A-Z]:)\s*(.*)$/i);
          const key = match ? match[1].replace(/[[\]().:]/g, '').toUpperCase() : String.fromCharCode(65 + idx);
          const text = match ? match[2] : opt;
          return {
            key,
            text,
            isCorrect: initialQuestion.correctAnswer?.trim().toUpperCase() === key || initialQuestion.correctAnswer?.trim() === text,
          };
        }
        const o = opt as QuestionOption;
        const key = o.key || String.fromCharCode(65 + idx);
        return {
          key,
          text: o.text || '',
          isCorrect: initialQuestion.correctAnswer?.trim().toUpperCase() === key || o.isCorrect === true,
        };
      });
    }
    return [
      { key: 'A', text: '', isCorrect: true },
      { key: 'B', text: '', isCorrect: false },
      { key: 'C', text: '', isCorrect: false },
      { key: 'D', text: '', isCorrect: false },
    ];
  });

  const [correctAnswer, setCorrectAnswer] = useState(() => initialQuestion?.correctAnswer || 'A');
  const [explanation, setExplanation] = useState(() => initialQuestion?.explanation || '');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleOptionTextChange = (index: number, text: string) => {
    const updated = [...options];
    updated[index].text = text;
    setOptions(updated);
  };

  const handleOptionSelectCorrect = (val: string) => {
    setCorrectAnswer(val);
    const updated = options.map((opt) => ({
      ...opt,
      isCorrect: opt.key === val || opt.text === val,
    }));
    setOptions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('Vui lòng nhập mã câu hỏi');
      return;
    }
    if (!prompt.trim()) {
      setError('Vui lòng nhập nội dung câu hỏi');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      // Build options array as strings matching the correctAnswer
      const rawOptionTexts = options.map((o) => o.text.trim()).filter(Boolean);
      let matchedCorrect = correctAnswer.trim();
      const matchedOpt = options.find((o) => o.key === correctAnswer || o.text === correctAnswer);
      if (matchedOpt && matchedOpt.text.trim()) {
        matchedCorrect = matchedOpt.text.trim();
      }

      // If rawOptionTexts is empty (e.g. non-choice), keep fallback
      const finalOptions = rawOptionTexts.length >= 2 ? rawOptionTexts : ['Phương án A', 'Phương án B'];
      if (!finalOptions.includes(matchedCorrect)) {
        matchedCorrect = finalOptions[0];
      }

      const payload: CreateQuestionPayload = {
        code: code.trim(),
        subjectId: subjectId || undefined,
        grade: String(grade),
        type: questionType,
        questionType,
        difficulty,
        topic: topic.trim() || undefined,
        prompt: prompt.trim(),
        imageUrl: imageUrl.trim() || undefined,
        correctAnswer: matchedCorrect,
        explanation: explanation.trim() || undefined,
        status,
        options: finalOptions,
        sourceType: initialQuestion?.sourceType || 'manual',
      };

      await onSave(payload, initialQuestion?.id);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi lưu câu hỏi';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
      <div className="staff-modal bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-scaleUp">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-[#183B69] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-200" />
            <h3 className="font-semibold text-base">
              {isEdit ? 'Chỉnh sửa câu hỏi' : 'Soạn câu hỏi mới'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="staff-modal-close p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            title="Đóng modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {error && (
            <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Phân loại & Metadata */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b pb-1.5 border-slate-100">
              <BookOpen className="w-4 h-4 text-[#183B69]" />
              1. Thông tin phân loại
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Mã câu hỏi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="VD: Q-TOAN12-001"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full text-xs font-mono rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#183B69]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Chuyên đề / Chủ đề
                </label>
                <input
                  type="text"
                  placeholder="VD: Cực trị hàm số"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#183B69]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Môn học</label>
                <select
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#183B69]"
                >
                  <option value="sub-math">Toán học</option>
                  <option value="sub-phys">Vật lý</option>
                  <option value="sub-chem">Hóa học</option>
                  <option value="sub-bio">Sinh học</option>
                  <option value="sub-eng">Tiếng Anh</option>
                  <option value="sub-hist">Lịch sử</option>
                  <option value="sub-geo">Địa lý</option>
                  <option value="sub-gdcd">Giáo dục công dân</option>
                  <option value="sub-lit">Ngữ văn</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Khối lớp</label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(Number(e.target.value))}
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#183B69]"
                >
                  <option value={12}>Lớp 12</option>
                  <option value={11}>Lớp 11</option>
                  <option value={10}>Lớp 10</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Độ khó</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#183B69]"
                >
                  <option value="easy">Nhận biết (Easy)</option>
                  <option value="medium">Thông hiểu (Medium)</option>
                  <option value="hard">Vận dụng (Hard)</option>
                  <option value="expert">Vận dụng cao (Expert)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Dạng câu hỏi</label>
                <select
                  value={questionType}
                  onChange={(e) => setQuestionType(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#183B69]"
                >
                  <option value="multiple-choice">Trắc nghiệm đơn</option>
                  <option value="multiple-select">Nhiều lựa chọn</option>
                  <option value="true-false">Đúng / Sai</option>
                  <option value="short-answer">Điền câu trả lời ngắn</option>
                  <option value="essay">Tự luận</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Trạng thái khởi tạo</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#183B69]"
                >
                  <option value="draft">Bản nháp</option>
                  <option value="published">Xuất bản ngay</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Nội dung câu hỏi with KaTeX */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between border-b pb-1.5 border-slate-100">
              <span className="flex items-center gap-1.5">
                <FileEdit className="w-4 h-4 text-[#183B69]" />
                2. Nội dung câu hỏi (KaTeX $...$)
              </span>
              <span className="text-[11px] text-slate-400 font-normal">
                Hỗ trợ công thức KaTeX inline $...$ và block $$...$$
              </span>
            </h4>

            <div>
              <textarea
                placeholder="Cho hàm số $y = x^3 - 3x^2 + 2$. Điểm cực đại của đồ thị hàm số là:"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                className="w-full text-xs rounded-lg border border-slate-300 p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#183B69]"
              />
              {prompt && (
                <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    Xem trước trực tiếp (KaTeX Live Preview):
                  </span>
                  <div className="text-xs text-slate-900">
                    <MathView math={prompt} />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Đường dẫn hình ảnh minh họa (nếu có)
              </label>
              <input
                type="text"
                placeholder="https://example.com/hinh-ve.png"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#183B69]"
              />
            </div>
          </div>

          {/* Section 3: Phương án lựa chọn & Đáp án đúng */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b pb-1.5 border-slate-100">
              3. Các phương án lựa chọn & Đáp án
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {options.map((opt, idx) => (
                <div key={opt.key} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1.5">
                  <span className="font-bold text-slate-700 text-xs">Phương án {opt.key}:</span>
                  <input
                    type="text"
                    placeholder={`phương án ${opt.key}`}
                    value={opt.text}
                    onChange={(e) => handleOptionTextChange(idx, e.target.value)}
                    className="w-full text-xs rounded border border-slate-300 px-2.5 py-1.5 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#183B69]"
                  />
                  {opt.text && (
                    <div className="text-[11px] text-slate-600 bg-white px-2 py-1 rounded border border-slate-100">
                      <MathView math={opt.text} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Select for correct answer */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-3">
              <label className="font-semibold text-slate-700 shrink-0">
                Chọn đáp án đúng <span className="text-rose-500">*</span>:
              </label>
              <select
                value={correctAnswer}
                onChange={(e) => handleOptionSelectCorrect(e.target.value)}
                className="flex-1 text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-900 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-[#183B69]"
              >
                <option value="">Chọn đáp án đúng</option>
                {options.map((opt) => (
                  <option key={opt.key} value={opt.text || opt.key}>
                    {opt.text || `Phương án ${opt.key}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Section 4: Lời giải chi tiết with KaTeX */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b pb-1.5 border-slate-100">
              4. Lời giải chi tiết
            </h4>

            <textarea
              placeholder="Áp dụng công thức và kiến thức để giải chi tiết câu hỏi..."
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              rows={3}
              className="w-full text-xs rounded-lg border border-slate-300 p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#183B69]"
            />
            {explanation && (
              <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg">
                <span className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider block mb-1">
                  Xem trước lời giải:
                </span>
                <div className="text-xs text-slate-800">
                  <MathView math={explanation} />
                </div>
              </div>
            )}
          </div>

          {/* Modal Action Buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-[#183B69] hover:bg-[#132f54] rounded-lg transition-colors shadow-sm disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Đang lưu...' : isEdit ? 'Lưu cập nhật' : 'Tạo câu hỏi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
