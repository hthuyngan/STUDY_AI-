/**
 * Canonical Math 12 Scope & Chapter Structure (BASE-01).
 * Official scope: Toan lop 12 only (6 chapters).
 * Legacy Grade 10/11 and non-Math data remain untouched in DB but are excluded from new learning UIs.
 */

export interface Math12ChapterMeta {
  order: number
  code: string
  title: string
  shortTitle: string
  description: string
}

export const MATH12_CHAPTERS: Math12ChapterMeta[] = [
  {
    order: 1,
    code: 'M12-C1',
    title: 'Ứng dụng đạo hàm để khảo sát và vẽ đồ thị hàm số',
    shortTitle: 'Ứng dụng đạo hàm',
    description: 'Tính đơn điệu, cực trị, giá trị lớn nhất - nhỏ nhất, đường tiệm cận và khảo sát đồ thị hàm số.',
  },
  {
    order: 2,
    code: 'M12-C2',
    title: 'Vectơ và hệ tọa độ trong không gian',
    shortTitle: 'Vectơ trong không gian',
    description: 'Vectơ trong không gian, hệ trục tọa độ Oxyz và biểu thức tọa độ của các phép toán vectơ.',
  },
  {
    order: 3,
    code: 'M12-C3',
    title: 'Các số đặc trưng đo mức độ phân tán của mẫu số liệu ghép nhóm',
    shortTitle: 'Mẫu số liệu ghép nhóm',
    description: 'Khoảng biến thiên, khoảng tứ phân vị, phương sai và độ lệch chuẩn của mẫu số liệu ghép nhóm.',
  },
  {
    order: 4,
    code: 'M12-C4',
    title: 'Nguyên hàm và tích phân',
    shortTitle: 'Nguyên hàm & Tích phân',
    description: 'Nguyên hàm, tích phân và ứng dụng hình học của tích phân trong tính diện tích, thể tích.',
  },
  {
    order: 5,
    code: 'M12-C5',
    title: 'Phương pháp tọa độ trong không gian',
    shortTitle: 'Tọa độ không gian Oxyz',
    description: 'Phương trình mặt phẳng, đường thẳng và mặt cầu trong không gian Oxyz.',
  },
  {
    order: 6,
    code: 'M12-C6',
    title: 'Xác suất có điều kiện',
    shortTitle: 'Xác suất có điều kiện',
    description: 'Xác suất có điều kiện, công thức xác suất toàn phần và công thức Bayes.',
  },
]

export function isMath12Subject(subject: { id?: string; code?: string; name?: string; grade?: string }): boolean {
  const id = (subject.id || '').toLowerCase()
  const code = (subject.code || '').toLowerCase()
  const name = (subject.name || '').toLowerCase()
  const grade = (subject.grade || '').trim()

  const isMath = id.includes('math') || code.includes('math') || code.includes('toan') || name.includes('toán')
  if (!isMath) return false

  if (grade && grade !== '12') return false
  if (/(^|\D)(10|11)(\D|$)/.test(id) || /(^|\D)(10|11)(\D|$)/.test(name)) return false

  return true
}
