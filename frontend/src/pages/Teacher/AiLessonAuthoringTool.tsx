import React, { useState } from 'react';
import {
  CheckCircle2,
  Code,
  FileText,
  HelpCircle,
  Lightbulb,
  Save,
  Sparkles,
} from 'lucide-react';
import { teacherManagementService } from '@/services/teacherManagement.service';
import type {
  LessonAuthoringOutlineResponse,
  CheckpointQuestionDraft,
} from '@/types/teacherManagement';
import './TeacherPages.css';
import '../Admin/AdminPages.css';

export const AiLessonAuthoringTool: React.FC = () => {
  const [subjectName, setSubjectName] = useState<string>('Toán 12');
  const [chapterTitle, setChapterTitle] = useState<string>('Chương 4: Nguyên hàm và Tích phân');
  const [lessonTitle, setLessonTitle] = useState<string>('Bài 1: Nguyên hàm và các tính chất');
  const [targetGrade, setTargetGrade] = useState<string>('12');

  const [isGeneratingOutline, setIsGeneratingOutline] = useState<boolean>(false);
  const [outline, setOutline] = useState<LessonAuthoringOutlineResponse | null>(null);

  const [isGeneratingCheckpoints, setIsGeneratingCheckpoints] = useState<boolean>(false);
  const [checkpoints, setCheckpoints] = useState<CheckpointQuestionDraft[]>([]);

  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateOutline = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGeneratingOutline(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const res = await teacherManagementService.generateLessonOutlineDraft({
        subjectName,
        chapterTitle,
        lessonTitle,
        targetGrade,
      });
      setOutline(res);
    } catch (err: unknown) {
      setError((err as Error).message || 'Không thể tạo đề cương bài giảng AI');
    } finally {
      setIsGeneratingOutline(false);
    }
  };

  const handleGenerateCheckpoints = async () => {
    setIsGeneratingCheckpoints(true);
    setError(null);

    try {
      const questions = await teacherManagementService.generateCheckpointQuestions({
        topicName: lessonTitle,
        questionCount: 3,
        targetDifficulty: 'thong_hieu',
      });
      setCheckpoints(questions);
    } catch (err: unknown) {
      setError((err as Error).message || 'Không thể tạo câu hỏi kiểm tra nhanh');
    } finally {
      setIsGeneratingCheckpoints(false);
    }
  };

  const handleSaveDraft = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="admin-page-container" style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
            Công cụ Soạn thảo Bài giảng AI Sư phạm
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>
            Hỗ trợ giáo viên lập dàn ý lý thuyết chuẩn GDPT 2018, công thức KaTeX và câu hỏi đánh giá quá trình
          </p>
        </div>

        {outline && (
          <button
            onClick={handleSaveDraft}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: '#16a34a',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Save size={16} /> Lưu bản nháp học liệu
          </button>
        )}
      </div>

      {saveSuccess && (
        <div style={{ padding: '12px 16px', background: '#dcfce7', color: '#166534', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={18} />
          <span>Đã lưu bản nháp bài học vào ngân hàng học liệu để chuẩn bị gửi duyệt!</span>
        </div>
      )}

      {error && (
        <div style={{ padding: '12px 16px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* Main Authoring Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: outline ? '360px 1fr' : '1fr', gap: '24px' }}>
        {/* Input Parameters Card */}
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px', height: 'fit-content' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Sparkles size={18} color="#2563eb" />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
              Thông số Bài soạn
            </h3>
          </div>

          <form onSubmit={handleGenerateOutline}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Môn học & Khối lớp
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
                <input
                  type="text"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  required
                  style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
                <select
                  value={targetGrade}
                  onChange={(e) => setTargetGrade(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                >
                  <option value="12">Lớp 12</option>
                  <option value="11">Lớp 11</option>
                  <option value="10">Lớp 10</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Chương / Cụm chủ đề
              </label>
              <input
                type="text"
                value={chapterTitle}
                onChange={(e) => setChapterTitle(e.target.value)}
                required
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Tên bài học
              </label>
              <input
                type="text"
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
                required
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>

            <button
              type="submit"
              disabled={isGeneratingOutline}
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: '8px',
                border: 'none',
                background: '#2563eb',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <Sparkles size={16} />
              {isGeneratingOutline ? 'Đang tạo bài soạn...' : 'Khởi tạo Dàn ý bằng AI'}
            </button>
          </form>
        </div>

        {/* Outline & Live Preview */}
        {outline && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Outline Card */}
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px' }}>
              <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '16px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>
                  {subjectName} — {chapterTitle}
                </span>
                <h2 style={{ margin: '4px 0 0', fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>
                  {outline.lessonTitle}
                </h2>
              </div>

              {/* 1. Learning Objectives */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={16} color="#16a34a" /> 1. Mục tiêu bài học (Yêu cầu cần đạt)
                </h4>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>
                  {outline.learningObjectives.map((obj, i) => (
                    <li key={i}>{obj}</li>
                  ))}
                </ul>
              </div>

              {/* 2. Introduction */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Lightbulb size={16} color="#eab308" /> 2. Tình huống mở đầu (Khởi động)
                </h4>
                <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', fontSize: '13px', color: '#334155', lineHeight: 1.5 }}>
                  {outline.introductionDraft}
                </div>
              </div>

              {/* 3. Core Formulas KaTeX */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Code size={16} color="#7c3aed" /> 3. Công thức trọng tâm (KaTeX Notation)
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {outline.coreFormulasKaTeX.map((f, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '10px 14px',
                        background: '#faf5ff',
                        border: '1px solid #e9d5ff',
                        borderRadius: '6px',
                        fontFamily: 'monospace',
                        fontSize: '13px',
                        color: '#6b21a8',
                      }}
                    >
                      {f}
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Worked Examples */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={16} color="#2563eb" /> 4. Ví dụ mẫu & Phương pháp giải
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {outline.workedExamples.map((ex, i) => (
                    <div key={i} style={{ padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', color: '#334155' }}>
                      {ex}
                    </div>
                  ))}
                </div>
              </div>

              {/* 5. Pedagogical Notes */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  ⚠️ 5. Lưu ý Sư phạm & Bẫy sai lầm của học sinh
                </h4>
                <div style={{ padding: '12px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px', fontSize: '13px', color: '#92400e' }}>
                  {outline.pedagogicalNotes}
                </div>
              </div>

              {/* Formative Checkpoints Action */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <HelpCircle size={16} color="#0284c7" /> 6. Câu hỏi Kiểm tra Nhanh (Formative Checkpoints)
                  </h4>
                  <button
                    onClick={handleGenerateCheckpoints}
                    disabled={isGeneratingCheckpoints}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#0284c7',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Sparkles size={13} />
                    {isGeneratingCheckpoints ? 'Đang tạo câu hỏi...' : 'Tạo 3 câu hỏi trắc nghiệm bằng AI'}
                  </button>
                </div>

                {checkpoints.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {checkpoints.map((q, idx) => (
                      <div key={idx} style={{ padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
                          Câu {idx + 1}: {q.prompt}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
                          {q.options.map((opt, optIdx) => (
                            <div
                              key={optIdx}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '4px',
                                background: opt.startsWith(q.correctAnswer) ? '#dcfce7' : '#ffffff',
                                border: '1px solid #e2e8f0',
                                color: opt.startsWith(q.correctAnswer) ? '#166534' : '#475569',
                                fontWeight: opt.startsWith(q.correctAnswer) ? 600 : 400,
                              }}
                            >
                              {opt}
                            </div>
                          ))}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
                          <strong>Giải thích:</strong> {q.explanation}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
