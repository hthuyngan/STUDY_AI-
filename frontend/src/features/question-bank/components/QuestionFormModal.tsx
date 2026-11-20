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
import styles from '../QuestionBank.module.css';

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
    <div className={styles.modalBackdrop}>
      <div className={`staff-modal ${styles.modalDialog} ${styles.modalLg}`}>
        {/* Header */}
        <div className={`${styles.modalHeader} ${styles.modalHeaderNavy}`}>
          <div className={styles.modalTitleGroup}>
            <Layers size={18} style={{ color: '#93c5fd' }} />
            <h3 className={styles.modalTitle} style={{ color: '#ffffff' }}>
              {isEdit ? 'Chỉnh sửa câu hỏi' : 'Soạn câu hỏi mới'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`staff-modal-close ${styles.closeIconBtn} ${styles.closeIconBtnLight}`}
            title="Đóng modal"
            aria-label="Đóng modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className={styles.modalBody}>
            {error && (
              <div className={`${styles.formAlert} ${styles.formAlertError}`}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Section 1: Phân loại & Metadata */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className={styles.formSectionHeader}>
                <BookOpen size={15} style={{ color: '#183b69' }} />
                1. Thông tin phân loại
              </div>

              <div className={`${styles.formGrid} ${styles.formGrid3}`}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Mã câu hỏi <span className={styles.requiredStar}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Q-TOAN12-001"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className={styles.formInput}
                    style={{ fontFamily: 'ui-monospace, monospace' }}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Chuyên đề / Chủ đề
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Cực trị hàm số"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Môn học</label>
                  <select
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    className={styles.formSelect}
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

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Khối lớp</label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(Number(e.target.value))}
                    className={styles.formSelect}
                  >
                    <option value={12}>Lớp 12</option>
                    <option value={11}>Lớp 11</option>
                    <option value={10}>Lớp 10</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Độ khó</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className={styles.formSelect}
                  >
                    <option value="easy">Nhận biết (Easy)</option>
                    <option value="medium">Thông hiểu (Medium)</option>
                    <option value="hard">Vận dụng (Hard)</option>
                    <option value="expert">Vận dụng cao (Expert)</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Dạng câu hỏi</label>
                  <select
                    value={questionType}
                    onChange={(e) => setQuestionType(e.target.value)}
                    className={styles.formSelect}
                  >
                    <option value="multiple-choice">Trắc nghiệm đơn</option>
                    <option value="multiple-select">Nhiều lựa chọn</option>
                    <option value="true-false">Đúng / Sai</option>
                    <option value="short-answer">Điền câu trả lời ngắn</option>
                    <option value="essay">Tự luận</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Trạng thái khởi tạo</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className={styles.formSelect}
                  >
                    <option value="draft">Bản nháp</option>
                    <option value="published">Xuất bản ngay</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Nội dung câu hỏi with KaTeX */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className={styles.formSectionHeader} style={{ justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileEdit size={15} style={{ color: '#183b69' }} />
                  2. Nội dung câu hỏi (KaTeX $...$)
                </span>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 400, textTransform: 'none' }}>
                  Hỗ trợ công thức KaTeX inline $...$ và block $$...$$
                </span>
              </div>

              <div className={styles.formGroup}>
                <textarea
                  placeholder="Cho hàm số $y = x^3 - 3x^2 + 2$. Điểm cực đại của đồ thị hàm số là:"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={3}
                  className={styles.formTextarea}
                />
                {prompt && (
                  <div style={{ marginTop: '8px', padding: '10px 12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                    <span style={{ fontSize: '10.5px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                      Xem trước trực tiếp (KaTeX Live Preview):
                    </span>
                    <div style={{ fontSize: '13px', color: '#0f172a' }}>
                      <MathView math={prompt} />
                    </div>
                  </div>
                )}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Đường dẫn hình ảnh minh họa (nếu có)
                </label>
                <input
                  type="text"
                  placeholder="https://example.com/hinh-ve.png"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className={styles.formInput}
                />
              </div>
            </div>

            {/* Section 3: Phương án lựa chọn & Đáp án đúng */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className={styles.formSectionHeader}>
                3. Các phương án lựa chọn & Đáp án
              </div>

              <div className={`${styles.formGrid} ${styles.formGrid2}`}>
                {options.map((opt, idx) => (
                  <div key={opt.key} style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontWeight: 700, color: '#334155', fontSize: '12px' }}>Phương án {opt.key}:</span>
                    <input
                      type="text"
                      placeholder={`phương án ${opt.key}`}
                      value={opt.text}
                      onChange={(e) => handleOptionTextChange(idx, e.target.value)}
                      className={styles.formInput}
                    />
                    {opt.text && (
                      <div style={{ fontSize: '11.5px', color: '#334155', backgroundColor: '#ffffff', padding: '4px 8px', borderRadius: '4px', border: '1px solid #f1f5f9' }}>
                        <MathView math={opt.text} />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Select for correct answer */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '6px', flexWrap: 'wrap' }}>
                <label className={styles.formLabel} style={{ whiteSpace: 'nowrap' }}>
                  Chọn đáp án đúng <span className={styles.requiredStar}>*</span>:
                </label>
                <select
                  value={correctAnswer}
                  onChange={(e) => handleOptionSelectCorrect(e.target.value)}
                  className={styles.formSelect}
                  style={{ flex: 1, minWidth: '200px' }}
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className={styles.formSectionHeader}>
                4. Lời giải chi tiết
              </div>

              <textarea
                placeholder="Áp dụng công thức và kiến thức để giải chi tiết câu hỏi..."
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                rows={3}
                className={styles.formTextarea}
              />
              {explanation && (
                <div style={{ padding: '10px 12px', backgroundColor: '#f0f7ff', border: '1px solid #bfdbfe', borderRadius: '8px' }}>
                  <span style={{ fontSize: '10.5px', fontWeight: 600, color: '#1d4ed8', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                    Xem trước lời giải:
                  </span>
                  <div style={{ fontSize: '13px', color: '#1e3a8a' }}>
                    <MathView math={explanation} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Modal Action Buttons */}
          <div className={styles.modalFooter}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className={`${styles.btn} ${styles.btnSecondary}`}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`${styles.btn} ${styles.btnPrimary} ${isSubmitting ? styles.btnDisabled : ''}`}
            >
              <Save size={14} />
              {isSubmitting ? 'Đang lưu...' : isEdit ? 'Lưu cập nhật' : 'Tạo câu hỏi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
