import React from 'react'
import { ShieldAlert, ArrowLeft, LogIn } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { resolveHomeRoute } from '@/auth/permissions'
import { Button } from '@/components/ui/Button'
import './UnauthorizedPage.css'

export interface UnauthorizedPageProps {
  requiredRole?: string
  requiredPermission?: string
}

export const UnauthorizedPage: React.FC<UnauthorizedPageProps> = ({
  requiredRole,
  requiredPermission,
}) => {
  const { user, isGuest } = useAuth()
  const navigate = useNavigate()

  const homeRoute = resolveHomeRoute(user)

  return (
    <div className="unauthorized-page-container">
      <div className="unauthorized-card" role="alert">
        <div className="unauthorized-icon-wrapper" aria-hidden="true">
          <ShieldAlert size={36} />
        </div>
        <div className="unauthorized-badge">403 FORBIDDEN</div>
        <h1 className="unauthorized-title">Không có quyền truy cập</h1>
        <p className="unauthorized-desc">
          Tài khoản hiện tại của bạn không có quyền truy cập vào khu vực này.
          {requiredRole && (
            <span className="unauthorized-detail">
              {' '}Yêu cầu vai trò: <strong>{requiredRole}</strong>.
            </span>
          )}
          {requiredPermission && (
            <span className="unauthorized-detail">
              {' '}Yêu cầu quyền hạn: <strong>{requiredPermission}</strong>.
            </span>
          )}
        </p>

        <div className="unauthorized-actions">
          {isGuest ? (
            <Button
              variant="primary"
              icon={LogIn}
              onClick={() => navigate('/login')}
            >
              Đăng nhập tài khoản
            </Button>
          ) : (
            <Button
              variant="primary"
              icon={ArrowLeft}
              onClick={() => navigate(homeRoute)}
            >
              Quay lại trang chính
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
