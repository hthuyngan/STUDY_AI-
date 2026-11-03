/**
 * Controlled Knowledge Point and Section Mapping
 * Maps assessment question topics to deterministic knowledge point IDs, lesson sections, and section titles.
 */

export interface KnowledgeMappingEntry {
  knowledgePointId: string
  title: string
  sectionId: string
  sectionTitle: string
}

export const KNOWLEDGE_TOPIC_MAPPING: Record<string, KnowledgeMappingEntry> = {
  'Điểm uốn đồ thị hàm số': {
    knowledgePointId: 'kp-math-inflection-point',
    title: 'Điểm uốn của đồ thị hàm số bậc 3',
    sectionId: 'definitions',
    sectionTitle: 'Khái niệm và Định nghĩa cơ bản',
  },
  'Tâm đối xứng hàm phân thức': {
    knowledgePointId: 'kp-math-rational-symmetry',
    title: 'Tâm đối xứng của hàm phân thức hữu tỉ',
    sectionId: 'formulas',
    sectionTitle: 'Công thức trọng tâm',
  },
  'Tính đơn điệu của hàm số': {
    knowledgePointId: 'kp-math-monotonicity',
    title: 'Xét dấu đạo hàm và tính đơn điệu của hàm số',
    sectionId: 'definitions',
    sectionTitle: 'Khái niệm và Định nghĩa cơ bản',
  },
  'Tính đối xứng hàm trùng phương': {
    knowledgePointId: 'kp-math-quartic-symmetry',
    title: 'Trục đối xứng của hàm bậc 4 trùng phương',
    sectionId: 'formulas',
    sectionTitle: 'Công thức trọng tâm',
  },
  'Sự tương giao của đồ thị': {
    knowledgePointId: 'kp-math-intersection-roots',
    title: 'Sự tương giao đồ thị và số nghiệm phương trình',
    sectionId: 'examples',
    sectionTitle: 'Ví dụ mẫu & Phương pháp giải',
  },
  'Kiến thức cốt lõi': {
    knowledgePointId: 'kp-generic-core-concept',
    title: 'Khái niệm và nguyên lý cốt lõi',
    sectionId: 'definitions',
    sectionTitle: 'Khái niệm và Định nghĩa cơ bản',
  },
  'Phương pháp giải': {
    knowledgePointId: 'kp-generic-problem-solving',
    title: 'Phương pháp giải toán và biến đổi công thức',
    sectionId: 'examples',
    sectionTitle: 'Ví dụ mẫu & Phương pháp giải',
  },
  'Kỹ năng làm bài': {
    knowledgePointId: 'kp-generic-exam-pitfalls',
    title: 'Các bẫy đề thi và lưu ý quan trọng',
    sectionId: 'important-notes',
    sectionTitle: 'Bẫy đề thi & Lưu ý cần nhớ',
  },
}

/**
 * Resolves knowledge point metadata for a question topic.
 */
export function resolveKnowledgeMapping(
  topic?: string,
  prompt?: string
): KnowledgeMappingEntry {
  if (topic && KNOWLEDGE_TOPIC_MAPPING[topic]) {
    return KNOWLEDGE_TOPIC_MAPPING[topic]
  }

  // Derive stable fallback ID from topic or prompt
  const baseText = topic || prompt || 'Kiến thức bài giảng'
  const slug = baseText
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .substring(0, 32) || 'general'

  return {
    knowledgePointId: `kp-${slug}`,
    title: topic || (prompt ? prompt.substring(0, 50) + '...' : 'Kiến thức trọng tâm'),
    sectionId: 'definitions',
    sectionTitle: 'Khái niệm và Định nghĩa cơ bản',
  }
}
