import React, { useState } from 'react'
import { Eye, EyeOff, Loader2, Sparkles } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getDefaultRouteForRole } from '@/auth/permissions'
import { useAuth } from '@/auth/useAuth'
import './AuthPage.css'

export const LoginPage: React.FC = () => {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setErrorMessage('Vui lòng nhập địa chỉ email.')
      return
    }

    if (!password) {
      setErrorMessage('Vui lòng nhập mật khẩu.')
      return
    }

    setIsSubmitting(true)
    try {
      const loggedUser = await login({ email: trimmedEmail, password })
      const fromPath = (location.state as { from?: { pathname: string } })?.from?.pathname
      const target = fromPath || getDefaultRouteForRole(loggedUser.role)
      navigate(target, { replace: true })
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Email hoặc mật khẩu không chính xác.'
      setErrorMessage(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        {/* Brand Header */}
        <div className="auth-header">
          <Link to="/" className="auth-logo-link" aria-label="StudyAI Trang chủ">
            <div className="auth-logo-badge">
              <Sparkles size={20} className="auth-logo-icon" />
            </div>
            <span className="auth-logo-text">StudyAI</span>
          </Link>
          <h1 className="auth-title">Đăng nhập tài khoản</h1>
          <p className="auth-subtitle">
            Học tập thông minh và đồng bộ tiến độ trên mọi thiết bị
          </p>
        </div>

        {/* Server Error Alert */}
        {errorMessage && (
          <div
            id="auth-error-alert"
            role="alert"
            className="auth-error-banner"
          >
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="auth-field">
            <label htmlFor="login-email" className="auth-label">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Nhập email"
              autoComplete="email"
              autoFocus
              disabled={isSubmitting}
              aria-describedby={errorMessage ? 'auth-error-alert' : undefined}
            />
          </div>

          <div className="auth-field">
            <label htmlFor="login-password" className="auth-label">
              Mật khẩu
            </label>
            <div className="auth-input-wrapper">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="auth-input has-toggle"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                autoComplete="current-password"
                disabled={isSubmitting}
                aria-describedby={errorMessage ? 'auth-error-alert' : undefined}
              />
              <button
                type="button"
                className="auth-toggle-pwd-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                tabIndex={0}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="btn-spinner" size={18} />
                <span>Đang đăng nhập...</span>
              </>
            ) : (
              <span>Đăng nhập</span>
            )}
          </button>
        </form>

        {/* Secondary Links */}
        <div className="auth-footer">
          <p className="auth-switch-text">
            Chưa có tài khoản?{' '}
            <Link to="/register" className="auth-link">
              Đăng ký
            </Link>
          </p>

          <div className="auth-divider" />

          <Link to="/dashboard" className="auth-guest-link">
            Tiếp tục học trên thiết bị này (Khách)
          </Link>
        </div>
      </div>
    </div>
  )
}
