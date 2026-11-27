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
        id: 'teaching',
        title: 'GIẢNG DẠY',
        items: [
          {
            id: 'teacher-dashboard',
            label: 'Tổng quan',
            path: '/teacher',
            icon: LayoutDashboard,
          },
          {
            id: 'teacher-classes',
            label: 'Quản lý lớp học',
            path: '/teacher/classes',
            icon: GraduationCap,
          },
          {
            id: 'teacher-assignments',
            label: 'Bài tập',
            path: '/teacher/assignments',
            icon: FileText,
          },
          {
            id: 'teacher-exams',
            label: 'Kiểm tra & đề thi',
            path: '/teacher/exams',
            icon: CheckSquare,
          },
          {
            id: 'teacher-grades',
            label: 'Sổ điểm',
            path: '/teacher/grades',
            icon: Award,
          },
          {
            id: 'teacher-materials',
            label: 'Tài liệu giảng dạy',
            path: '/teacher/materials',
            icon: BookOpen,
          },
        ],
      },
      {
        id: 'tools',
        title: 'CÔNG CỤ',
        items: [
          {
            id: 'teacher-ai-assistant',
            label: 'AI Trợ giảng',
            path: '/teacher/ai-assistant',
            icon: Cpu,
          },
          {
            id: 'teacher-schedule',
            label: 'Lịch giảng dạy',
            path: '/teacher/schedule',
            icon: Activity,
          },
          {
            id: 'teacher-announcements',
            label: 'Thông báo lớp học',
            path: '/teacher/announcements',
            icon: Bell,
          },
          {
            id: 'teacher-support',
            label: 'Hỗ trợ',
            path: '/support',
            icon: MessageSquare,
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
        id: 'content-management',
        title: 'QUẢN LÝ NỘI DUNG',
        items: [
          {
            id: 'content-dashboard',
            label: 'Tổng quan',
            path: '/content',
            icon: LayoutDashboard,
          },
          {
            id: 'content-curriculum-workspace',
            label: 'Chương trình Toán 12',
            path: '/content/curriculum',
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
            label: 'Ngân hàng đề thi',
            path: '/content/assessments',
            icon: CheckSquare,
          },
          {
            id: 'content-materials',
            label: 'Tài liệu học tập',
            path: '/content/materials',
            icon: BookOpen,
          },
        ],
      },
      {
        id: 'quality-control',
        title: 'KIỂM SOÁT CHẤT LƯỢNG',
        items: [
          {
            id: 'content-review',
            label: 'Kiểm duyệt nội dung',
            path: '/content/review',
            icon: FileCheck,
          },
          {
            id: 'content-knowledge-base',
            label: 'Kho tri thức AI',
            path: '/content/knowledge-base',
            icon: Cpu,
          },
          {
            id: 'content-error-reports',
            label: 'Báo cáo sai sót',
            path: '/content/error-reports',
            icon: AlertTriangle,
          },
          {
            id: 'content-publications',
            label: 'Lịch sử chỉnh sửa',
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
