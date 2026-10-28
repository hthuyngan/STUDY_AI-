import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  AlertTriangle,
  Award,
  BarChart3,
  Bell,
  BookOpen,
  CheckSquare,
  FileCheck,
  FileText,
  GraduationCap,
  History,
  Layers,
  LayoutDashboard,
  LifeBuoy,
  MessageSquare,
  School,
  Search,
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
  badge?: string
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
        title: 'Tổng quan',
        items: [
          {
            id: 'admin-dashboard',
            label: 'Bảng điều khiển',
            path: '/admin',
            icon: LayoutDashboard,
          },
        ],
      },
      {
        id: 'education',
        title: 'Quản lý học tập',
        items: [
          {
            id: 'admin-subjects',
            label: 'Môn học',
            path: '/admin/subjects',
            icon: BookOpen,
          },
          {
            id: 'admin-chapters',
            label: 'Chương học',
            path: '/admin/chapters',
            icon: Layers,
          },
          {
            id: 'admin-lessons',
            label: 'Bài học',
            path: '/admin/lessons',
            icon: FileText,
          },
          {
            id: 'admin-assessments',
            label: 'Bài thu hoạch',
            path: '/admin/assessments',
            icon: CheckSquare,
          },
        ],
      },
      {
        id: 'teaching',
        title: 'Quản lý giảng dạy',
        items: [
          {
            id: 'admin-classes',
            label: 'Lớp học',
            path: '/admin/classes',
            icon: School,
          },
          {
            id: 'admin-students',
            label: 'Học viên',
            path: '/admin/students',
            icon: Users,
          },
          {
            id: 'admin-assignments',
            label: 'Bài tập',
            path: '/admin/assignments',
            icon: FileText,
          },
        ],
      },
      {
        id: 'performance',
        title: 'Kết quả học tập',
        items: [
          {
            id: 'admin-grades',
            label: 'Bảng điểm',
            path: '/admin/grades',
            icon: Award,
          },
          {
            id: 'admin-alerts',
            label: 'Cảnh báo học tập',
            path: '/admin/alerts',
            icon: AlertTriangle,
          },
        ],
      },
      {
        id: 'content_control',
        title: 'Kiểm soát nội dung',
        items: [
          {
            id: 'admin-approvals',
            label: 'Phê duyệt nội dung',
            path: '/admin/approvals',
            icon: FileCheck,
          },
          {
            id: 'admin-publications',
            label: 'Lịch sử xuất bản',
            path: '/admin/publications',
            icon: History,
          },
        ],
      },
      {
        id: 'operations',
        title: 'Vận hành & Hỗ trợ',
        items: [
          {
            id: 'admin-tickets',
            label: 'Yêu cầu hỗ trợ',
            path: '/admin/tickets',
            icon: LifeBuoy,
          },
          {
            id: 'admin-announcements',
            label: 'Thông báo hệ thống',
            path: '/admin/announcements',
            icon: Bell,
          },
          {
            id: 'admin-audit-logs',
            label: 'Nhật ký quản trị',
            path: '/admin/audit-logs',
            icon: Activity,
          },
        ],
      },
      {
        id: 'staff',
        title: 'Quản lý nhân sự',
        items: [
          {
            id: 'admin-teachers',
            label: 'Giáo viên',
            path: '/admin/teachers',
            icon: GraduationCap,
          },
        ],
      },
      {
        id: 'analytics',
        title: 'Báo cáo',
        items: [
          {
            id: 'admin-reports',
            label: 'Báo cáo học tập',
            path: '/admin/reports',
            icon: BarChart3,
          },
        ],
      },
      {
        id: 'management',
        title: 'Quản trị người dùng',
        items: [
          {
            id: 'admin-users',
            label: 'Danh sách người dùng',
            path: '/admin/users',
            icon: Users,
          },
          {
            id: 'admin-roles',
            label: 'Phân quyền & Vai trò',
            path: '/admin/roles',
            icon: Shield,
          },
        ],
      },
      {
        id: 'system',
        title: 'Hạ tầng & Hệ thống',
        items: [
          {
            id: 'admin-system',
            label: 'Trạng thái hệ thống',
            path: '/admin/system',
            icon: Sliders,
          },
        ],
      },
      {
        id: 'configuration',
        title: 'Cấu hình',
        items: [
          {
            id: 'admin-settings',
            label: 'Thiết lập vận hành',
            path: '/admin/settings',
            icon: Settings,
          },
        ],
      },
    ],
  },

  teacher: {
    role: 'teacher',
    name: 'Không gian giảng dạy',
    subLabel: 'TEACHER',
    badgeText: 'Giáo viên',
    basePath: '/teacher',
    groups: [
      {
        id: 'overview',
        title: 'Hoạt động',
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
        id: 'classes',
        title: 'Lớp học & Học sinh',
        items: [
          {
            id: 'teacher-classes',
            label: 'Danh sách lớp học',
            path: '/teacher/classes',
            icon: GraduationCap,
          },
        ],
      },
      {
        id: 'assignments',
        title: 'Nhiệm vụ & Bài tập',
        items: [
          {
            id: 'teacher-assignments',
            label: 'Quản lý bài tập',
            path: '/teacher/assignments',
            icon: CheckSquare,
          },
        ],
      },
    ],
  },

  content: {
    role: 'content',
    name: 'Biên tập giáo trình',
    subLabel: 'CONTENT',
    badgeText: 'Nội dung',
    basePath: '/content',
    groups: [
      {
        id: 'overview',
        title: 'Tổng quan',
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
        title: 'Chương trình & Bài học',
        items: [
          {
            id: 'content-subjects',
            label: 'Cấu trúc môn học',
            path: '/content/subjects',
            icon: BookOpen,
          },
          {
            id: 'content-lessons',
            label: 'Kho bài học',
            path: '/content/lessons',
            icon: FileText,
          },
          {
            id: 'content-assessments',
            label: 'Bộ bài thu hoạch',
            path: '/content/assessments',
            icon: Layers,
          },
        ],
      },
      {
        id: 'editorial',
        title: 'Kiểm duyệt',
        items: [
          {
            id: 'content-review',
            label: 'Hàng đợi duyệt',
            path: '/content/review',
            icon: FileCheck,
          },
        ],
      },
    ],
  },

  support: {
    role: 'support',
    name: 'Hỗ trợ người dùng',
    subLabel: 'SUPPORT',
    badgeText: 'Hỗ trợ',
    basePath: '/support',
    groups: [
      {
        id: 'overview',
        title: 'Tổng quan',
        items: [
          {
            id: 'support-dashboard',
            label: 'Hàng chờ hỗ trợ',
            path: '/support',
            icon: LayoutDashboard,
          },
        ],
      },
      {
        id: 'tickets',
        title: 'Ticket & Yêu cầu',
        items: [
          {
            id: 'support-tickets',
            label: 'Tất cả tickets',
            path: '/support/tickets',
            icon: MessageSquare,
          },
        ],
      },
      {
        id: 'users',
        title: 'Tra cứu thông tin',
        items: [
          {
            id: 'support-users',
            label: 'Tra cứu tài khoản',
            path: '/support/users',
            icon: Search,
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
  support: 'Hỗ trợ viên',
  admin: 'Quản trị viên',
}
