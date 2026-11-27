import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  AlertTriangle,
  Award,
  BarChart3,
  Bell,
  BookOpen,
  CheckSquare,
  Cpu,
  CreditCard,
  FileCheck,
  FileText,
  GraduationCap,
  HelpCircle,
  History,
  Layers,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Shield,
  Sliders,
  Upload,
  Users,
} from 'lucide-react'
import type { UserRole } from '@/auth/auth.types'

export interface WorkspaceNavItem {
  id: string
  label: string
  path: string
  icon: LucideIcon
  badge?: string | number
}

export interface WorkspaceNavGroup {
  id: string
  title: string
  items: WorkspaceNavItem[]
}

export interface WorkspaceConfig {
  role: UserRole
  name: string
  subLabel: string
  badgeText: string
  basePath: string
  groups: WorkspaceNavGroup[]
}

export const WORKSPACE_CONFIGS: Record<Exclude<UserRole, 'learner'>, WorkspaceConfig> = {
  admin: {
    role: 'admin',
    name: 'Quản trị hệ thống',
    subLabel: 'ADMIN',
    badgeText: 'Quản trị viên',
    basePath: '/admin',
    groups: [
      {
        id: 'overview',
        title: 'TỔNG QUAN',
        items: [
          {
            id: 'admin-dashboard',
            label: 'Dashboard',
            path: '/admin',
            icon: LayoutDashboard,
          },
        ],
      },
      {
        id: 'users-staff',
        title: 'NGƯỜI DÙNG',
        items: [
          {
            id: 'admin-users',
            label: 'Quản lý người dùng',
            path: '/admin/users',
            icon: Users,
          },
          {
            id: 'admin-teachers',
            label: 'Quản lý nhân sự',
            path: '/admin/teachers',
            icon: GraduationCap,
          },
          {
            id: 'admin-roles',
            label: 'Vai trò và phân quyền',
            path: '/admin/roles',
            icon: Shield,
          },
        ],
      },
      {
        id: 'learning',
        title: 'HỌC TẬP',
        items: [
          {
            id: 'admin-curriculum',
            label: 'Chương trình học',
            path: '/content/subjects',
            icon: BookOpen,
          },
          {
            id: 'admin-question-bank',
            label: 'Ngân hàng câu hỏi',
            path: '/content/question-bank',
            icon: HelpCircle,
          },
          {
            id: 'admin-content-monitor',
            label: 'Kiểm duyệt nội dung',
            path: '/admin/content-monitor',
            icon: FileCheck,
          },
        ],
      },
      {
        id: 'services',
        title: 'DỊCH VỤ',
        items: [
          {
            id: 'admin-api-management',
            label: 'Quản lý API',
            path: '/admin/api-management',
            icon: Cpu,
            badge: 'Mẫu',
          },
          {
            id: 'admin-subscriptions',
            label: 'Gói đăng ký',
            path: '/admin/subscriptions',
            icon: CreditCard,
            badge: 'Mẫu',
          },
          {
            id: 'admin-tickets',
            label: 'Hỗ trợ',
            path: '/admin/tickets',
            icon: MessageSquare,
          },
        ],
      },
      {
        id: 'system',
        title: 'HỆ THỐNG',
        items: [
          {
            id: 'admin-audit-logs',
            label: 'Nhật ký hoạt động',
            path: '/admin/audit-logs',
            icon: History,
          },
          {
            id: 'admin-system',
            label: 'Giám sát',
            path: '/admin/system',
            icon: Sliders,
          },
          {
            id: 'admin-operations',
            label: 'Vận hành AI & QA',
            path: '/admin/operations',
            icon: Activity,
          },
          {
            id: 'admin-reports',
            label: 'Báo cáo tổng hợp',
            path: '/admin/reports',
            icon: BarChart3,
          },
          {
            id: 'admin-announcements',
            label: 'Thông báo hệ thống',
            path: '/admin/announcements',
            icon: Bell,
          },
          {
            id: 'admin-settings',
            label: 'Cài đặt',
            path: '/admin/settings',
            icon: Settings,
          },
        ],
      },
    ],
  },

  teacher: {
    role: 'teacher',
    name: 'Không gian giáo viên',
    subLabel: 'TEACHER',
    badgeText: 'Giáo viên',
    basePath: '/teacher',
    groups: [
      {
        id: 'overview',
        title: 'Tổng quan',
        items: [
          {
            id: 'teacher-dashboard',
            label: 'Bàn làm việc',
            path: '/teacher',
            icon: LayoutDashboard,
          },
        ],
      },
      {
        id: 'teaching',
        title: 'Quản lý giảng dạy',
        items: [
          {
            id: 'teacher-classes',
            label: 'Lớp học',
            path: '/teacher/classes',
            icon: GraduationCap,
          },
          {
            id: 'teacher-students',
            label: 'Học viên',
            path: '/teacher/students',
            icon: Users,
          },
          {
            id: 'teacher-assignments',
            label: 'Bài tập',
            path: '/teacher/assignments',
            icon: FileText,
          },
        ],
      },
      {
        id: 'performance',
        title: 'Kết quả học tập',
        items: [
          {
            id: 'teacher-grades',
            label: 'Bảng điểm',
            path: '/teacher/grades',
            icon: Award,
          },
          {
            id: 'teacher-alerts',
            label: 'Cảnh báo học tập',
            path: '/teacher/alerts',
            icon: AlertTriangle,
            badge: 3,
          },
        ],
      },
    ],
  },

  content: {
    role: 'content',
    name: 'Quản lý nội dung',
    subLabel: 'CONTENT',
    badgeText: 'Nội dung',
    basePath: '/content',
    groups: [
      {
        id: 'overview',
        title: 'TỔNG QUAN',
        items: [
          {
            id: 'content-dashboard',
            label: 'Bảng nội dung',
            path: '/content',
            icon: LayoutDashboard,
          },
        ],
      },
      {
        id: 'curriculum',
        title: 'QUẢN LÝ HỌC TẬP',
        items: [
          {
            id: 'content-catalog',
            label: 'Danh mục chuẩn',
            path: '/content/catalog',
            icon: BookOpen,
          },
          {
            id: 'content-curriculum-workspace',
            label: 'Không gian giáo trình',
            path: '/content/curriculum',
            icon: Layers,
          },
          {
            id: 'content-subjects',
            label: 'Môn học',
            path: '/content/subjects',
            icon: BookOpen,
          },
          {
            id: 'content-chapters',
            label: 'Chương học',
            path: '/content/chapters',
            icon: Layers,
          },
          {
            id: 'content-lessons',
            label: 'Bài học',
            path: '/content/lessons',
            icon: FileText,
          },
          {
            id: 'content-questions',
            label: 'Ngân hàng câu hỏi',
            path: '/content/questions',
            icon: HelpCircle,
          },
          {
            id: 'content-assessments',
            label: 'Bài thu hoạch',
            path: '/content/assessments',
            icon: CheckSquare,
          },
          {
            id: 'content-import',
            label: 'Nhập giáo trình',
            path: '/content/import',
            icon: Upload,
          },
        ],
      },
      {
        id: 'editorial',
        title: 'BIÊN TẬP & XUẤT BẢN',
        items: [
          {
            id: 'content-review',
            label: 'Hàng đợi duyệt',
            path: '/content/review',
            icon: FileCheck,
            badge: 2,
          },
          {
            id: 'content-publications',
            label: 'Lịch sử xuất bản',
            path: '/content/publications',
            icon: History,
          },
        ],
      },
    ],
  },
}

export function getWorkspaceConfig(role?: UserRole): WorkspaceConfig {
  if (role && role !== 'learner' && WORKSPACE_CONFIGS[role]) {
    return WORKSPACE_CONFIGS[role]
  }
  return WORKSPACE_CONFIGS.admin
}

export function getWorkspaceNavigation(role?: UserRole): WorkspaceNavGroup[] {
  return getWorkspaceConfig(role).groups
}

export const ROLE_LABELS: Record<UserRole, string> = {
  learner: 'Học viên',
  teacher: 'Giáo viên',
  content: 'Biên tập viên',
  admin: 'Quản trị viên',
}
