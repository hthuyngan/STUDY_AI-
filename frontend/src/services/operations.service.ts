import type {
  AnnouncementItem,
  ApprovalItem,
  AuditLogEntry,
  OperationalSettings,
  PublicationRecord,
} from '@/types/operations'
import { educationService } from './education.service'

const STORAGE_KEYS = {
  APPROVALS: 'study_ai_approvals_v5',
  PUBLICATIONS: 'study_ai_publications_v5',
  ANNOUNCEMENTS: 'study_ai_announcements_v5',
  AUDIT_LOGS: 'study_ai_audit_logs_v5',
  SETTINGS: 'study_ai_settings_v5',
}

export const INITIAL_SETTINGS: OperationalSettings = {
  systemName: 'STUDY_AI Educational Platform',
  systemDescription: 'Hệ sinh thái học tập và gia sư thông minh ứng dụng AI',
  language: 'vi-VN',
  passingScoreThreshold: 5.0,
  lowScoreAlertThreshold: 5.0,
  attentionProgressThreshold: 60,
  requireApprovalBeforePublish: true,
  allowRevisionRequests: true,
  showArchivedContent: false,
  notificationDisplayDays: 7,
  enableDemoAlerts: true,
  updatedAt: '2026-10-27T10:00:00Z',
  updatedBy: 'Demo Admin',
}

export const INITIAL_APPROVALS: ApprovalItem[] = [
  {
    id: 'apr-1',
    title: 'Tiệm cận đứng và tiệm cận ngang của đồ thị hàm số',
    contentType: 'lesson',
    contentId: 'lesson-math-09',
    subjectId: 'math',
    subjectName: 'Toán học 12',
    chapterId: 'ch-01',
    chapterName: 'Chương 1: Ứng dụng đạo hàm để khảo sát hàm số',
    authorName: 'Phạm Văn Nam',
    authorRole: 'Biên soạn nội dung',
    version: 'v1.1',
    status: 'pending',
    submittedAt: '2026-10-27T07:45:00Z',
    contentPreview: {
      introduction: 'Định nghĩa và phương pháp xác định đường tiệm cận đứng, tiệm cận ngang của đồ thị hàm phân thức và hàm hữu tỉ.',
      definitions: 'Đường thẳng x = x0 là TCĐ nếu ít nhất một trong các giới hạn vô cực khi x -> x0. Đường thẳng y = y0 là TCN nếu giới hạn ở vô cực bằng y0.',
      formulas: 'TCĐ: x = -d / c (với hàm phân thức bậc 1 / bậc 1)\nTCN: y = a / c',
      examples: 'Ví dụ: Tìm tiệm cận của đồ thị hàm số y = (2x - 1) / (x + 2). TCĐ x = -2, TCN y = 2.',
      summary: 'Ghi nhớ cách nhẩm nhanh hệ số để kết luận tiệm cận.',
    },
    history: [
      {
        id: 'h-1',
        action: 'Gửi duyệt nội dung',
        actor: 'Phạm Văn Nam',
        timestamp: '2026-10-27T07:45:00Z',
        note: 'Đã hoàn thiện bài học, bổ sung hình vẽ và đồ thị minh họa trực quan.',
      },
    ],
  },
  {
    id: 'apr-2',
    title: 'Bộ câu hỏi thu hoạch: Tiệm cận đứng và tiệm cận ngang',
    contentType: 'assessment',
    contentId: 'asm-math-09',
    subjectId: 'math',
    subjectName: 'Toán học 12',
    authorName: 'Phạm Văn Nam',
    authorRole: 'Biên soạn nội dung',
    version: 'v1.0',
    status: 'pending',
    submittedAt: '2026-10-27T07:50:00Z',
    contentPreview: {
      questionCount: 10,
      maxScore: 10,
    },
    history: [
      {
        id: 'h-2',
        action: 'Gửi duyệt bài thu hoạch',
        actor: 'Phạm Văn Nam',
        timestamp: '2026-10-27T07:50:00Z',
        note: 'Gồm 10 câu hỏi trắc nghiệm 4 mức độ nhận thức.',
      },
    ],
  },
  {
    id: 'apr-3',
    title: 'Phương trình dao động điều hòa của con lắc lò xo',
    contentType: 'lesson',
    contentId: 'lesson-phy-02',
    subjectId: 'physics',
    subjectName: 'Vật lý 12',
    authorName: 'Lê Thanh Thảo',
    authorRole: 'Giáo viên Vật lý',
    version: 'v1.0',
    status: 'changes-requested',
    submittedAt: '2026-10-26T15:20:00Z',
    reviewedAt: '2026-10-26T17:00:00Z',
    reviewedBy: 'Quản trị viên',
    reviewNote: 'Cần bổ sung thêm ví dụ thực tế về chu kỳ khi ghép nối tiếp hai lò xo.',
    contentPreview: {
      introduction: 'Khảo sát động lực học và năng lượng của con lắc lò xo nằm ngang và treo thẳng đứng.',
      formulas: 'omega = sqrt(k / m); T = 2 * pi * sqrt(m / k)',
      summary: 'Định luật bảo toàn cơ năng trong dao động điều hòa.',
    },
    history: [
      {
        id: 'h-3-1',
        action: 'Gửi duyệt nội dung',
        actor: 'Lê Thanh Thảo',
        timestamp: '2026-10-26T15:20:00Z',
      },
      {
        id: 'h-3-2',
        action: 'Yêu cầu chỉnh sửa',
        actor: 'Quản trị viên',
        timestamp: '2026-10-26T17:00:00Z',
        note: 'Cần bổ sung thêm ví dụ thực tế về chu kỳ khi ghép nối tiếp hai lò xo.',
      },
    ],
  },
  {
    id: 'apr-4',
    title: 'Este - Lipit và phản ứng xà phòng hóa',
    contentType: 'lesson',
    contentId: 'lesson-chem-01',
    subjectId: 'chemistry',
    subjectName: 'Hóa học 12',
    authorName: 'Nguyễn Thu Trang',
    authorRole: 'Tổ trưởng chuyên môn',
    version: 'v1.0',
    status: 'approved',
    submittedAt: '2026-10-25T09:00:00Z',
    reviewedAt: '2026-10-26T10:00:00Z',
    reviewedBy: 'Quản trị viên',
    reviewNote: 'Nội dung đạt chuẩn chương trình GDPT mới, sẵn sàng xuất bản.',
    contentPreview: {
      introduction: 'Khái niệm, cấu tạo và tính chất hóa học của este.',
      formulas: 'RCOOR\' + NaOH -> RCOONa + R\'OH',
    },
    history: [
      {
        id: 'h-4-1',
        action: 'Gửi duyệt',
        actor: 'Nguyễn Thu Trang',
        timestamp: '2026-10-25T09:00:00Z',
      },
      {
        id: 'h-4-2',
        action: 'Phê duyệt',
        actor: 'Quản trị viên',
        timestamp: '2026-10-26T10:00:00Z',
        note: 'Nội dung đạt chuẩn chương trình GDPT mới.',
      },
    ],
  },
  {
    id: 'apr-5',
    title: 'Khảo sát và vẽ đồ thị hàm phân thức bậc nhất / bậc nhất',
    contentType: 'lesson',
    contentId: 'lesson-math-08',
    subjectId: 'math',
    subjectName: 'Toán học 12',
    authorName: 'Phạm Văn Nam',
    authorRole: 'Biên soạn nội dung',
    version: 'v2.0',
    status: 'published',
    submittedAt: '2026-10-20T08:00:00Z',
    reviewedAt: '2026-10-20T10:00:00Z',
    reviewedBy: 'Quản trị viên',
    history: [
      {
        id: 'h-5-1',
        action: 'Xuất bản',
        actor: 'Quản trị viên',
        timestamp: '2026-10-20T10:30:00Z',
      },
    ],
  },
]

export const INITIAL_PUBLICATIONS: PublicationRecord[] = [
  {
    id: 'pub-1',
    title: 'Khảo sát và vẽ đồ thị hàm phân thức bậc nhất / bậc nhất',
    contentType: 'lesson',
    contentId: 'lesson-math-08',
    subjectName: 'Toán học 12',
    version: 'v2.0',
    publishedBy: 'Demo Admin',
    publishedAt: '2026-10-20T10:30:00Z',
    status: 'active',
    changelog: 'Cập nhật thêm 3 bài toán ứng dụng thực tế và bảng biến thiên động.',
  },
  {
    id: 'pub-2',
    title: 'Sự đồng biến, nghịch biến của hàm số',
    contentType: 'lesson',
    contentId: 'lesson-math-01',
    subjectName: 'Toán học 12',
    version: 'v1.0',
    publishedBy: 'Demo Admin',
    publishedAt: '2026-10-15T08:00:00Z',
    status: 'active',
    changelog: 'Xuất bản lần đầu theo khung chương trình GDPT 2018.',
  },
  {
    id: 'pub-3',
    title: 'Dao động điều hòa và các đại lượng đặc trưng',
    contentType: 'lesson',
    contentId: 'lesson-phy-01',
    subjectName: 'Vật lý 12',
    version: 'v1.0',
    publishedBy: 'Demo Admin',
    publishedAt: '2026-10-18T14:00:00Z',
    status: 'active',
    changelog: 'Xuất bản bài học mở đầu chương Dao động cơ.',
  },
]

export const INITIAL_ANNOUNCEMENTS: AnnouncementItem[] = [
  {
    id: 'anc-1',
    title: 'Bảo trì hệ thống định kỳ máy chủ học tập',
    content: 'Hệ thống STUDY_AI sẽ tiến hành nâng cấp hạ tầng mạng vào lúc 02:00 sáng Thứ Bảy (khoảng 30 phút). Các hoạt động tự học không bị gián đoạn dữ liệu.',
    audience: 'all',
    severity: 'warning',
    status: 'published',
    publishedAt: '2026-10-27T08:00:00Z',
    createdBy: 'Demo Admin',
    createdAt: '2026-10-27T07:30:00Z',
    updatedAt: '2026-10-27T08:00:00Z',
  },
  {
    id: 'anc-2',
    title: 'Kỳ thi thử THPT Quốc gia trực tuyến đợt 1',
    content: 'Tất cả học viên khối 12 chuẩn bị tham gia đợt thi thử trực tuyến môn Toán và Vật lý vào ngày 05/11. Đề thi bám sát cấu trúc đề minh họa mới nhất.',
    audience: 'learners',
    severity: 'info',
    status: 'published',
    publishedAt: '2026-10-26T09:00:00Z',
    createdBy: 'Demo Admin',
    createdAt: '2026-10-26T08:30:00Z',
    updatedAt: '2026-10-26T09:00:00Z',
  },
  {
    id: 'anc-3',
    title: 'Nhắc nhở hoàn tất nhập điểm và giao bài tập tuần 8',
    content: 'Đề nghị quý thầy cô giáo viên bộ môn kiểm tra và hoàn thành việc chấm bài tập trực tuyến của các lớp phụ trách trước 23:59 ngày 30/10.',
    audience: 'teachers',
    severity: 'danger',
    status: 'published',
    publishedAt: '2026-10-25T14:00:00Z',
    createdBy: 'Demo Admin',
    createdAt: '2026-10-25T13:40:00Z',
    updatedAt: '2026-10-25T14:00:00Z',
  },
]

export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'log-1',
    timestamp: '2026-10-27T10:15:00Z',
    actor: 'Demo Admin',
    workspace: 'admin',
    action: 'Cập nhật điểm bài tập',
    target: 'Bài nộp asg-1 (Nguyễn Minh Anh)',
    targetId: 'sub-1',
    result: 'success',
    details: 'Đã chấm điểm 9.5 kèm nhận xét chi tiết',
  },
  {
    id: 'log-2',
    timestamp: '2026-10-27T09:40:00Z',
    actor: 'Demo Admin',
    workspace: 'content',
    action: 'Gửi duyệt nội dung',
    target: 'Tiệm cận đứng và tiệm cận ngang',
    targetId: 'apr-1',
    result: 'success',
    details: 'Chuyển trạng thái sang Chờ duyệt',
  },
  {
    id: 'log-3',
    timestamp: '2026-10-26T17:00:00Z',
    actor: 'Demo Admin',
    workspace: 'admin',
    action: 'Yêu cầu chỉnh sửa',
    target: 'Phương trình dao động điều hòa',
    targetId: 'apr-3',
    result: 'warning',
    details: 'Yêu cầu bổ sung thêm bài toán ghép lò xo',
  },
  {
    id: 'log-4',
    timestamp: '2026-10-26T14:00:00Z',
    actor: 'Demo Admin',
    workspace: 'admin',
    action: 'Tạo thông báo hệ thống',
    target: 'Kỳ thi thử THPT Quốc gia đợt 1',
    targetId: 'anc-2',
    result: 'success',
    details: 'Phát hành thông báo cho đối tượng Học viên',
  },
  {
    id: 'log-5',
    timestamp: '2026-10-25T11:00:00Z',
    actor: 'Demo Admin',
    workspace: 'support',
    action: 'Phân công ticket hỗ trợ',
    target: 'Ticket tkt-102 (Lỗi hiển thị bài tập)',
    targetId: 'tkt-102',
    result: 'success',
    details: 'Phân công cho nhân viên Lê Hữu Phước',
  },
]

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined' || !window.localStorage) {
    return JSON.parse(JSON.stringify(fallback))
  }
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(fallback))
  } catch {
    return JSON.parse(JSON.stringify(fallback))
  }
}

function saveToStorage<T>(key: string, data: T): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    localStorage.setItem(key, JSON.stringify(data))
    // Trigger in-tab event for React components
    window.dispatchEvent(
      new CustomEvent('study_ai_operations_change', { detail: { key } })
    )
  } catch (e) {
    console.error(`Failed to save to localStorage (${key}):`, e)
  }
}

export const operationsService = {
  // ==================== AUDIT LOGS ====================
  async getAuditLogs(filterAction = 'all', filterWorkspace = 'all', search = ''): Promise<AuditLogEntry[]> {
    let logs = loadFromStorage<AuditLogEntry[]>(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS)
    if (filterAction !== 'all') {
      logs = logs.filter((l) => l.action.toLowerCase().includes(filterAction.toLowerCase()))
    }
    if (filterWorkspace !== 'all') {
      logs = logs.filter((l) => l.workspace === filterWorkspace)
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      logs = logs.filter(
        (l) =>
          l.target.toLowerCase().includes(q) ||
          l.actor.toLowerCase().includes(q) ||
          (l.details && l.details.toLowerCase().includes(q))
      )
    }
    return logs
  },

  async recordAuditLog(
    entry: Omit<AuditLogEntry, 'id' | 'timestamp'>
  ): Promise<AuditLogEntry> {
    const logs = await this.getAuditLogs()
    const newLog: AuditLogEntry = {
      ...entry,
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
    }
    const updated = [newLog, ...logs]
    saveToStorage(STORAGE_KEYS.AUDIT_LOGS, updated)
    return newLog
  },

  // ==================== APPROVALS ====================
  async getApprovals(statusFilter = 'all', typeFilter = 'all', search = ''): Promise<ApprovalItem[]> {
    let list = loadFromStorage<ApprovalItem[]>(STORAGE_KEYS.APPROVALS, INITIAL_APPROVALS)
    if (statusFilter !== 'all') {
      list = list.filter((a) => a.status === statusFilter)
    }
    if (typeFilter !== 'all') {
      list = list.filter((a) => a.contentType === typeFilter)
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.authorName.toLowerCase().includes(q) ||
          a.subjectName.toLowerCase().includes(q)
      )
    }
    return list
  },

  async getApprovalById(id: string): Promise<ApprovalItem | null> {
    const list = await this.getApprovals()
    return list.find((a) => a.id === id) || null
  },

  async submitForApproval(
    item: Omit<ApprovalItem, 'id' | 'status' | 'submittedAt' | 'history'>
  ): Promise<ApprovalItem> {
    const list = await this.getApprovals()
    const now = new Date().toISOString()
    const newApproval: ApprovalItem = {
      ...item,
      id: `apr-${Date.now()}`,
      status: 'pending',
      submittedAt: now,
      history: [
        {
          id: `h-${Date.now()}`,
          action: 'Gửi duyệt nội dung',
          actor: item.authorName || 'Biên soạn nội dung',
          timestamp: now,
          note: 'Gửi yêu cầu phê duyệt mới',
        },
      ],
    }
    const updated = [newApproval, ...list]
    saveToStorage(STORAGE_KEYS.APPROVALS, updated)

    await this.recordAuditLog({
      actor: item.authorName || 'Biên soạn nội dung',
      workspace: 'content',
      action: 'Gửi duyệt nội dung',
      target: item.title,
      targetId: newApproval.id,
      result: 'success',
      details: `Gửi phê duyệt ${item.contentType}: ${item.title}`,
    })

    return newApproval
  },

  async approveContent(id: string, note?: string, actor = 'Demo Admin'): Promise<ApprovalItem> {
    const list = await this.getApprovals()
    const idx = list.findIndex((a) => a.id === id)
    if (idx === -1) throw new Error('Không tìm thấy yêu cầu phê duyệt')

    const now = new Date().toISOString()
    const item = list[idx]
    const updated: ApprovalItem = {
      ...item,
      status: 'approved',
      reviewedAt: now,
      reviewedBy: actor,
      reviewNote: note || 'Nội dung đạt chuẩn chất lượng giáo dục STUDY_AI.',
      history: [
        {
          id: `h-${Date.now()}`,
          action: 'Phê duyệt nội dung',
          actor,
          timestamp: now,
          note,
        },
        ...item.history,
      ],
    }
    list[idx] = updated
    saveToStorage(STORAGE_KEYS.APPROVALS, list)

    await this.recordAuditLog({
      actor,
      workspace: 'admin',
      action: 'Phê duyệt nội dung',
      target: item.title,
      targetId: item.id,
      result: 'success',
      details: note || 'Phê duyệt nội dung sẵn sàng xuất bản',
    })

    return updated
  },

  async requestChanges(id: string, reason: string, actor = 'Demo Admin'): Promise<ApprovalItem> {
    if (!reason.trim()) {
      throw new Error('Vui lòng nhập lý do hoặc nội dung yêu cầu chỉnh sửa')
    }
    const list = await this.getApprovals()
    const idx = list.findIndex((a) => a.id === id)
    if (idx === -1) throw new Error('Không tìm thấy yêu cầu phê duyệt')

    const now = new Date().toISOString()
    const item = list[idx]
    const updated: ApprovalItem = {
      ...item,
      status: 'changes-requested',
      reviewedAt: now,
      reviewedBy: actor,
      reviewNote: reason,
      history: [
        {
          id: `h-${Date.now()}`,
          action: 'Yêu cầu chỉnh sửa',
          actor,
          timestamp: now,
          note: reason,
        },
        ...item.history,
      ],
    }
    list[idx] = updated
    saveToStorage(STORAGE_KEYS.APPROVALS, list)

    // Update in education service if it exists
    try {
      await educationService.changeLessonStatus(item.contentId, 'draft')
    } catch {
      // Ignore if not a lesson id in education service
    }

    await this.recordAuditLog({
      actor,
      workspace: 'admin',
      action: 'Yêu cầu chỉnh sửa nội dung',
      target: item.title,
      targetId: item.id,
      result: 'warning',
      details: reason,
    })

    return updated
  },

  async rejectContent(id: string, reason: string, actor = 'Demo Admin'): Promise<ApprovalItem> {
    if (!reason.trim()) {
      throw new Error('Vui lòng nhập lý do từ chối nội dung')
    }
    const list = await this.getApprovals()
    const idx = list.findIndex((a) => a.id === id)
    if (idx === -1) throw new Error('Không tìm thấy yêu cầu phê duyệt')

    const now = new Date().toISOString()
    const item = list[idx]
    const updated: ApprovalItem = {
      ...item,
      status: 'rejected',
      reviewedAt: now,
      reviewedBy: actor,
      rejectionReason: reason,
      history: [
        {
          id: `h-${Date.now()}`,
          action: 'Từ chối phê duyệt',
          actor,
          timestamp: now,
          note: reason,
        },
        ...item.history,
      ],
    }
    list[idx] = updated
    saveToStorage(STORAGE_KEYS.APPROVALS, list)

    await this.recordAuditLog({
      actor,
      workspace: 'admin',
      action: 'Từ chối nội dung',
      target: item.title,
      targetId: item.id,
      result: 'failure',
      details: reason,
    })

    return updated
  },

  async publishContent(id: string, changelog?: string, actor = 'Demo Admin'): Promise<PublicationRecord> {
    const list = await this.getApprovals()
    const idx = list.findIndex((a) => a.id === id)
    if (idx === -1) throw new Error('Không tìm thấy nội dung để xuất bản')

    const item = list[idx]
    if (item.status !== 'approved' && item.status !== 'pending') {
      throw new Error('Nội dung phải được phê duyệt trước khi xuất bản')
    }

    const now = new Date().toISOString()

    // 1. Mark approval as published
    const updatedApproval: ApprovalItem = {
      ...item,
      status: 'published',
      history: [
        {
          id: `h-${Date.now()}`,
          action: 'Xuất bản trực tiếp',
          actor,
          timestamp: now,
          note: changelog || 'Xuất bản nội dung lên hệ thống học tập',
        },
        ...item.history,
      ],
    }
    list[idx] = updatedApproval
    saveToStorage(STORAGE_KEYS.APPROVALS, list)

    // 2. Add to Publications
    const pubs = await this.getPublications()
    const newPub: PublicationRecord = {
      id: `pub-${Date.now()}`,
      title: item.title,
      contentType: item.contentType,
      contentId: item.contentId,
      subjectName: item.subjectName,
      version: item.version || 'v1.0',
      publishedBy: actor,
      publishedAt: now,
      status: 'active',
      changelog: changelog || 'Nội dung chính thức được phê duyệt và phát hành.',
    }
    saveToStorage(STORAGE_KEYS.PUBLICATIONS, [newPub, ...pubs])

    // 3. Update education service lesson status
    try {
      await educationService.changeLessonStatus(item.contentId, 'published')
    } catch {
      // safe fallback
    }

    // 4. Audit log
    await this.recordAuditLog({
      actor,
      workspace: 'admin',
      action: 'Xuất bản nội dung',
      target: item.title,
      targetId: newPub.id,
      result: 'success',
      details: `Xuất bản phiên bản ${newPub.version}: ${newPub.title}`,
    })

    return newPub
  },

  // ==================== PUBLICATIONS ====================
  async getPublications(typeFilter = 'all', search = ''): Promise<PublicationRecord[]> {
    let pubs = loadFromStorage<PublicationRecord[]>(STORAGE_KEYS.PUBLICATIONS, INITIAL_PUBLICATIONS)
    if (typeFilter !== 'all') {
      pubs = pubs.filter((p) => p.contentType === typeFilter)
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      pubs = pubs.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.subjectName.toLowerCase().includes(q) ||
          p.publishedBy.toLowerCase().includes(q)
      )
    }
    return pubs
  },

  async rollbackPublication(
    pubId: string,
    targetVersion: string,
    actor = 'Demo Admin'
  ): Promise<PublicationRecord> {
    const pubs = await this.getPublications()
    const idx = pubs.findIndex((p) => p.id === pubId)
    if (idx === -1) throw new Error('Không tìm thấy bản ghi xuất bản')

    const now = new Date().toISOString()
    const current = pubs[idx]
    const updated: PublicationRecord = {
      ...current,
      version: targetVersion,
      publishedAt: now,
      publishedBy: actor,
      changelog: `Khôi phục về phiên bản ${targetVersion}`,
    }
    pubs[idx] = updated
    saveToStorage(STORAGE_KEYS.PUBLICATIONS, pubs)

    await this.recordAuditLog({
      actor,
      workspace: 'admin',
      action: 'Khôi phục phiên bản xuất bản',
      target: current.title,
      targetId: current.id,
      result: 'warning',
      details: `Khôi phục từ ${current.version} về ${targetVersion}`,
    })

    return updated
  },

  // ==================== ANNOUNCEMENTS ====================
  async getAnnouncements(statusFilter = 'all', audienceFilter = 'all', search = ''): Promise<AnnouncementItem[]> {
    let list = loadFromStorage<AnnouncementItem[]>(STORAGE_KEYS.ANNOUNCEMENTS, INITIAL_ANNOUNCEMENTS)
    if (statusFilter !== 'all') {
      list = list.filter((a) => a.status === statusFilter)
    }
    if (audienceFilter !== 'all') {
      list = list.filter((a) => a.audience === audienceFilter)
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.content.toLowerCase().includes(q) ||
          a.createdBy.toLowerCase().includes(q)
      )
    }
    return list
  },

  async saveAnnouncement(data: Partial<AnnouncementItem>, actor = 'Demo Admin'): Promise<AnnouncementItem> {
    const list = await this.getAnnouncements()
    const now = new Date().toISOString()

    if (data.id) {
      const idx = list.findIndex((a) => a.id === data.id)
      if (idx === -1) throw new Error('Không tìm thấy thông báo')
      const updated: AnnouncementItem = {
        ...list[idx],
        ...data,
        updatedAt: now,
      }
      list[idx] = updated
      saveToStorage(STORAGE_KEYS.ANNOUNCEMENTS, list)

      await this.recordAuditLog({
        actor,
        workspace: 'admin',
        action: 'Cập nhật thông báo hệ thống',
        target: updated.title,
        targetId: updated.id,
        result: 'success',
      })
      return updated
    } else {
      const newAnc: AnnouncementItem = {
        id: `anc-${Date.now()}`,
        title: data.title || 'Thông báo mới',
        content: data.content || '',
        audience: data.audience || 'all',
        targetClassId: data.targetClassId,
        targetClassName: data.targetClassName,
        severity: data.severity || 'info',
        status: data.status || 'published',
        publishedAt: data.status === 'published' ? now : undefined,
        createdBy: actor,
        createdAt: now,
        updatedAt: now,
      }
      const updatedList = [newAnc, ...list]
      saveToStorage(STORAGE_KEYS.ANNOUNCEMENTS, updatedList)

      await this.recordAuditLog({
        actor,
        workspace: 'admin',
        action: 'Tạo thông báo hệ thống',
        target: newAnc.title,
        targetId: newAnc.id,
        result: 'success',
        details: `Đối tượng: ${newAnc.audience} | Mức độ: ${newAnc.severity}`,
      })
      return newAnc
    }
  },

  async deleteAnnouncement(id: string, actor = 'Demo Admin'): Promise<void> {
    const list = await this.getAnnouncements()
    const item = list.find((a) => a.id === id)
    const filtered = list.filter((a) => a.id !== id)
    saveToStorage(STORAGE_KEYS.ANNOUNCEMENTS, filtered)

    if (item) {
      await this.recordAuditLog({
        actor,
        workspace: 'admin',
        action: 'Xóa thông báo hệ thống',
        target: item.title,
        targetId: id,
        result: 'warning',
      })
    }
  },

  // ==================== SETTINGS ====================
  getSettings(): OperationalSettings {
    return loadFromStorage<OperationalSettings>(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS)
  },

  saveSettings(data: Partial<OperationalSettings>, actor = 'Demo Admin'): OperationalSettings {
    const current = this.getSettings()
    const now = new Date().toISOString()
    const updated: OperationalSettings = {
      ...current,
      ...data,
      updatedAt: now,
      updatedBy: actor,
    }
    saveToStorage(STORAGE_KEYS.SETTINGS, updated)

    this.recordAuditLog({
      actor,
      workspace: 'admin',
      action: 'Cập nhật cấu hình vận hành',
      target: 'Thiết lập hệ thống',
      result: 'success',
      details: 'Thay đổi các quy tắc học tập, kiểm duyệt và thông báo',
    })

    return updated
  },

  resetSettings(actor = 'Demo Admin'): OperationalSettings {
    saveToStorage(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS)
    this.recordAuditLog({
      actor,
      workspace: 'admin',
      action: 'Khôi phục cấu hình mặc định',
      target: 'Thiết lập hệ thống',
      result: 'warning',
    })
    return INITIAL_SETTINGS
  },

  resetAllDemoData(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(STORAGE_KEYS.APPROVALS)
      localStorage.removeItem(STORAGE_KEYS.PUBLICATIONS)
      localStorage.removeItem(STORAGE_KEYS.ANNOUNCEMENTS)
      localStorage.removeItem(STORAGE_KEYS.AUDIT_LOGS)
      localStorage.removeItem(STORAGE_KEYS.SETTINGS)
    }
  },

  _resetMockState(): void {
    this.resetAllDemoData()
  },
}
