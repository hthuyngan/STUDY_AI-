import type { SuggestedPrompt } from '@/types/aiTutor'

export interface SubjectOption {
  id: string
  name: string
}

export const SUBJECT_OPTIONS: SubjectOption[] = [
  { id: 'all', name: 'Không chọn môn' },
  { id: 'toan-10', name: 'Toán 10' },
  { id: 'toan-11', name: 'Toán 11' },
  { id: 'toan-12', name: 'Toán 12' },
  { id: 'vat-ly-12', name: 'Vật lý 12' },
  { id: 'hoa-hoc-12', name: 'Hóa học 12' },
  { id: 'tieng-anh', name: 'Tiếng Anh' },
]

export const SUGGESTED_PROMPTS: (SuggestedPrompt & { subjectLabel?: string })[] = [
  {
    id: 'giai-thich-toan-12',
    title: 'Đạo hàm & Cực trị hàm số',
    subject: 'toan-12',
    subjectLabel: 'Toán 12',
    prompt: "Giải thích cho mình vì sao đạo hàm f'(x) = 0 tại các điểm cực trị của hàm số khả vi?",
    icon: '∑',
  },
  {
    id: 'giai-thich-toan-10',
    title: 'Mệnh đề & Tập hợp',
    subject: 'toan-10',
    subjectLabel: 'Toán 10',
    prompt: 'Giải thích khái niệm mệnh đề kéo theo và cho ví dụ trong thực tế.',
    icon: '∑',
  },
  {
    id: 'giai-thich-toan-11',
    title: 'Dãy số & Cấp số cộng',
    subject: 'toan-11',
    subjectLabel: 'Toán 11',
    prompt: 'Công thức số hạng tổng quát của cấp số cộng được suy ra như thế nào?',
    icon: '∑',
  },
  {
    id: 'quiz-vat-ly-12',
    title: 'Quiz Định luật Newton',
    subject: 'vat-ly-12',
    subjectLabel: 'Vật lý 12',
    prompt: 'Tạo giúp mình 3 câu hỏi trắc nghiệm kèm lời giải về các định luật chuyển động Newton.',
    icon: '⚛',
  },
  {
    id: 'xac-suat-12',
    title: 'Giải bài Xác suất có điều kiện',
    subject: 'toan-12',
    subjectLabel: 'Toán 12',
    prompt: 'Hướng dẫn phương pháp tư duy và các bước giải dạng bài xác suất có điều kiện trong đề thi tốt nghiệp.',
    icon: '∑',
  },
]
