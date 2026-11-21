export type SubjectIconType =
  | 'math'
  | 'physics'
  | 'chemistry'
  | 'biology'
  | 'literature'
  | 'english'
  | 'history'
  | 'geography'
  | 'informatics'
  | 'civics'

export interface SubjectIconOption {
  id: SubjectIconType
  label: string
  color: string
  bgColor: string
}

export const SUBJECT_ICON_OPTIONS: SubjectIconOption[] = [
  { id: 'math', label: 'Toán học', color: '#4f46e5', bgColor: '#eef2ff' },
  { id: 'physics', label: 'Vật lý', color: '#7c3aed', bgColor: '#f5f3ff' },
  { id: 'chemistry', label: 'Hóa học', color: '#0891b2', bgColor: '#ecfeff' },
  { id: 'biology', label: 'Sinh học', color: '#059669', bgColor: '#ecfdf5' },
  { id: 'literature', label: 'Ngữ văn', color: '#d97706', bgColor: '#fffbeb' },
  { id: 'english', label: 'Tiếng Anh', color: '#2563eb', bgColor: '#eff6ff' },
  { id: 'history', label: 'Lịch sử', color: '#dc2626', bgColor: '#fef2f2' },
  { id: 'geography', label: 'Địa lý', color: '#0d9488', bgColor: '#f0fdfa' },
  { id: 'informatics', label: 'Tin học', color: '#0284c7', bgColor: '#f0f9ff' },
  { id: 'civics', label: 'GDCD & Pháp luật', color: '#9333ea', bgColor: '#faf5ff' },
]

export function resolveSubjectIcon(
  code?: string,
  name?: string,
  explicitIcon?: string,
  description?: string
): SubjectIconType {
  // 1. Check metadata tag in description: [icon:chemistry]
  if (description) {
    const match = description.match(/\[icon:([a-z0-9_-]+)\]/i)
    if (match) {
      const tag = match[1].toLowerCase() as SubjectIconType
      if (SUBJECT_ICON_OPTIONS.some((opt) => opt.id === tag)) {
        return tag
      }
    }
  }

  // 2. Check explicit icon prop
  if (explicitIcon) {
    const lower = explicitIcon.toLowerCase().trim()
    const found = SUBJECT_ICON_OPTIONS.find((opt) => opt.id === lower)
    if (found) return found.id
    if (lower.includes('math') || lower.includes('toan')) return 'math'
    if (lower.includes('phys') || lower.includes('ly')) return 'physics'
    if (lower.includes('chem') || lower.includes('hoa')) return 'chemistry'
    if (lower.includes('bio') || lower.includes('sinh')) return 'biology'
    if (lower.includes('lit') || lower.includes('van')) return 'literature'
    if (lower.includes('eng') || lower.includes('anh')) return 'english'
    if (lower.includes('hist') || lower.includes('su')) return 'history'
    if (lower.includes('geo') || lower.includes('dia')) return 'geography'
    if (lower.includes('info') || lower.includes('tin')) return 'informatics'
    if (lower.includes('civ') || lower.includes('gdcd')) return 'civics'
  }

  // 3. Check code
  const c = (code || '').toUpperCase()
  if (c.includes('MATH') || c.includes('TOAN')) return 'math'
  if (c.includes('PHYS') || c.includes('VATLY') || c.includes('VLY')) return 'physics'
  if (c.includes('CHEM') || c.includes('HOA')) return 'chemistry'
  if (c.includes('BIO') || c.includes('SINH')) return 'biology'
  if (c.includes('LIT') || c.includes('VAN')) return 'literature'
  if (c.includes('ENG') || c.includes('ANH')) return 'english'
  if (c.includes('HIST') || c.includes('SU')) return 'history'
  if (c.includes('GEO') || c.includes('DIA')) return 'geography'
  if (c.includes('INFO') || c.includes('TIN')) return 'informatics'
  if (c.includes('CIV') || c.includes('GDCD') || c.includes('PL')) return 'civics'

  // 4. Check name
  const n = (name || '').toLowerCase()
  if (n.includes('toán')) return 'math'
  if (n.includes('vật lý') || n.includes('vật lí') || n.includes('lý')) return 'physics'
  if (n.includes('hóa')) return 'chemistry'
  if (n.includes('sinh')) return 'biology'
  if (n.includes('văn')) return 'literature'
  if (n.includes('tiếng anh') || n.includes('anh')) return 'english'
  if (n.includes('sử')) return 'history'
  if (n.includes('địa')) return 'geography'
  if (n.includes('tin')) return 'informatics'
  if (n.includes('gdcd') || n.includes('kinh tế') || n.includes('pháp luật')) return 'civics'

  return 'math'
}

export function extractDescriptionText(rawDesc?: string): string {
  if (!rawDesc) return ''
  return rawDesc.replace(/\[icon:[a-z0-9_-]+\]/gi, '').trim()
}

export function packDescriptionWithIcon(text: string, iconId: SubjectIconType): string {
  const clean = extractDescriptionText(text)
  return clean ? `${clean} [icon:${iconId}]` : `[icon:${iconId}]`
}
