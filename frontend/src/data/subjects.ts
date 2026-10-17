import type { Subject } from '@/types'

// ============================================================
// SUBJECTS CATALOGUE — dữ liệu tĩnh, không thay đổi
// ============================================================

export const SUBJECTS: Subject[] = [
  {
    id: 'math',
    name: 'Toán học 10',
    shortName: 'Toán',
    icon: '📐',
    color: '#6366f1',
    bgColor: '#eef2ff',
  },
  {
    id: 'literature',
    name: 'Ngữ văn 10',
    shortName: 'Ngữ văn',
    icon: '📚',
    color: '#ec4899',
    bgColor: '#fdf2f8',
  },
  {
    id: 'english',
    name: 'Tiếng Anh 10',
    shortName: 'Anh văn',
    icon: '🌐',
    color: '#0ea5e9',
    bgColor: '#f0f9ff',
  },
  {
    id: 'physics',
    name: 'Vật lý 10',
    shortName: 'Vật lý',
    icon: '⚡',
    color: '#f59e0b',
    bgColor: '#fffbeb',
  },
  {
    id: 'chemistry',
    name: 'Hóa học 10',
    shortName: 'Hóa học',
    icon: '🧪',
    color: '#10b981',
    bgColor: '#ecfdf5',
  },
  {
    id: 'biology',
    name: 'Sinh học 10',
    shortName: 'Sinh học',
    icon: '🧬',
    color: '#8b5cf6',
    bgColor: '#f5f3ff',
  },
]

export const SUBJECT_MAP: Record<string, Subject> = Object.fromEntries(
  SUBJECTS.map((s) => [s.id, s]),
)
