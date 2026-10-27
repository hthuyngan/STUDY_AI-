import React, { useState } from 'react'
import { Eye, EyeOff, Loader2, Sparkles } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import './AuthPage.css'

export const RegisterPage: React.FC = () => {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [grade, setGrade] = useState('Lớp 12')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    const trimmedName = displayName.trim()
    if (!trimmedName) {
      setErrorMessage('Vui lòng nhập tên hiển thị.')
      return
    }

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setErrorMessage('Vui lòng nhập địa chỉ email.')
      return
    }

    if (password.length < 8) {
      setErrorMessage('Mật khẩu phải có ít nhất 8 ký tự.')
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp.')
      return
    }

    setIsSubmitting(true)
    try {
      await register({
        email: trimmedEmail,
        password,
        displayName: trimmedName,
        grade: grade || undefined,
      })
      navigate('/dashboard')
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Tạo tài khoản không thành công.'
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
          <h1 className="auth-title">Tạo tài khoản học tập</h1>
          <p className="auth-subtitle">
            Lưu trữ tiến độ, bài tập thu hoạch và đồng bộ đám mây
          </p>
        </div>

        {/* Server / Validation Error Alert */}
        {errorMessage && (
          <div
            id="register-error-alert"
            role="alert"
            className="auth-error-banner"
          >
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="auth-field">
            <label htmlFor="reg-name" className="auth-label">
              Tên hiển thị
            </label>
            <input
              id="reg-name"
              type="text"
              className="auth-input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Nhập họ và tên"
              autoComplete="name"
              autoFocus
              disabled={isSubmitting}
              aria-describedby={errorMessage ? 'register-error-alert' : undefined}
            />
          </div>

          <div className="auth-field">
            <label htmlFor="reg-email" className="auth-label">
              Email
            </label>
            <input
              id="reg-email"
              type="email"
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Nhập email"
              autoComplete="email"
              disabled={isSubmitting}
              aria-describedby={errorMessage ? 'register-error-alert' : undefined}
            />
          </div>

          <div className="auth-field">
            <label htmlFor="reg-grade" className="auth-label">
              Lớp học <span className="auth-label-opt">(tùy chọn)</span>
            </label>
            <select
              id="reg-grade"
              className="auth-input auth-select"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              disabled={isSubmitting}
            >
              <option value="Lớp 12">Lớp 12</option>
              <option value="Lớp 11">Lớp 11</option>
              <option value="Lớp 10">Lớp 10</option>
              <option value="Đại học">Đại học / Tự học</option>
            </select>
          </div>

          <div className="auth-field">
            <label htmlFor="reg-password" className="auth-label">
              Mật khẩu <span className="auth-label-hint">(tối thiểu 8 ký tự)</span>
            </label>
            <div className="auth-input-wrapper">
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                className="auth-input has-toggle"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tạo mật khẩu"
                autoComplete="new-password"
                disabled={isSubmitting}
                aria-describedby={errorMessage ? 'register-error-alert' : undefined}
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

          <div className="auth-field">
            <label htmlFor="reg-confirm-password" className="auth-label">
              Xác nhận mật khẩu
            </label>
            <div className="auth-input-wrapper">
              <input
                id="reg-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                className="auth-input has-toggle"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu"
                autoComplete="new-password"
                disabled={isSubmitting}
                aria-describedby={errorMessage ? 'register-error-alert' : undefined}
              />
              <button
                type="button"
                className="auth-toggle-pwd-btn"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                tabIndex={0}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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
                <span>Đang tạo tài khoản...</span>
              </>
            ) : (
              <span>Tạo tài khoản</span>
            )}
          </button>
        </form>

        {/* Secondary Links */}
        <div className="auth-footer">
          <p className="auth-switch-text">
            Đã có tài khoản?{' '}
            <Link to="/login" className="auth-link">
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
