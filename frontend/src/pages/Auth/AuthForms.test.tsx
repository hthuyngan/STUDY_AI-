import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { LoginPage } from './LoginPage'
import { RegisterPage } from './RegisterPage'
import { AuthContext } from '@/auth/AuthContext'
import type { AuthContextValue, AuthUser } from '@/auth/auth.types'

describe('Frontend Authentication UI & Validation Suite', () => {
  const mockLogin = vi.fn()
  const mockRegister = vi.fn()
  const mockLogout = vi.fn()

  const defaultAuthContext: AuthContextValue = {
    user: null,
    state: 'guest',
    error: null,
    isAuthenticated: false,
    isGuest: true,
    login: mockLogin,
    register: mockRegister,
    logout: mockLogout,
    refreshSession: vi.fn(),
    migrationPending: false,
    confirmMigration: vi.fn(),
    declineMigration: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  /* =========================================================================
   * 1. LOGIN FORM VALIDATION & INTERACTIONS
   * ========================================================================= */
  describe('LoginPage', () => {
    it('1.1. Hiển thị form đăng nhập và chặn nộp khi email hoặc mật khẩu rỗng', async () => {
      render(
        <AuthContext.Provider value={defaultAuthContext}>
          <MemoryRouter initialEntries={['/login']}>
            <LoginPage />
          </MemoryRouter>
        </AuthContext.Provider>
      )

      expect(screen.getByRole('heading', { name: /đăng nhập tài khoản/i })).toBeDefined()
      expect(screen.getByLabelText(/^email$/i)).toBeDefined()
      expect(screen.getByLabelText(/^mật khẩu$/i)).toBeDefined()

      const submitBtn = screen.getByRole('button', { name: /đăng nhập/i })
      fireEvent.click(submitBtn)

      // Shows email validation error
      expect(await screen.findByText('Vui lòng nhập địa chỉ email.')).toBeDefined()
      expect(mockLogin).not.toHaveBeenCalled()

      // Fill email, submit without password
      const emailInput = screen.getByLabelText(/^email$/i)
      fireEvent.change(emailInput, { target: { value: 'learner@example.com' } })
      fireEvent.click(submitBtn)

      expect(await screen.findByText('Vui lòng nhập mật khẩu.')).toBeDefined()
      expect(mockLogin).not.toHaveBeenCalled()
    })

    it('1.2. Toggle hiển thị / ẩn mật khẩu (Show/Hide Password)', () => {
      render(
        <AuthContext.Provider value={defaultAuthContext}>
          <MemoryRouter initialEntries={['/login']}>
            <LoginPage />
          </MemoryRouter>
        </AuthContext.Provider>
      )

      const pwdInput = screen.getByLabelText(/^mật khẩu$/i) as HTMLInputElement
      expect(pwdInput.type).toBe('password')

      const toggleBtn = screen.getByLabelText('Hiện mật khẩu')
      fireEvent.click(toggleBtn)
      expect(pwdInput.type).toBe('text')

      fireEvent.click(screen.getByLabelText('Ẩn mật khẩu'))
      expect(pwdInput.type).toBe('password')
    })

    it('1.3. Hiển thị thông báo lỗi trung thực khi đăng nhập thất bại', async () => {
      mockLogin.mockRejectedValueOnce(new Error('Email hoặc mật khẩu không chính xác.'))

      render(
        <AuthContext.Provider value={defaultAuthContext}>
          <MemoryRouter initialEntries={['/login']}>
            <LoginPage />
          </MemoryRouter>
        </AuthContext.Provider>
      )

      fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: 'wrong@example.com' } })
      fireEvent.change(screen.getByLabelText(/^mật khẩu$/i), { target: { value: 'wrongpass' } })
      fireEvent.click(screen.getByRole('button', { name: /đăng nhập/i }))

      expect(await screen.findByText('Email hoặc mật khẩu không chính xác.')).toBeDefined()
    })

    it('1.4. Đăng nhập thành công và chuyển hướng', async () => {
      const mockUser: AuthUser = {
        id: 'usr-1',
        email: 'learner@example.com',
        displayName: 'Học viên A',
        role: 'learner',
        createdAt: new Date().toISOString(),
      }
      mockLogin.mockResolvedValueOnce(mockUser)

      render(
        <AuthContext.Provider value={defaultAuthContext}>
          <MemoryRouter initialEntries={['/login']}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/dashboard" element={<div>Dashboard Screen</div>} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      )

      fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: 'learner@example.com' } })
      fireEvent.change(screen.getByLabelText(/^mật khẩu$/i), { target: { value: 'ValidPassword123' } })
      fireEvent.click(screen.getByRole('button', { name: /đăng nhập/i }))

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: 'learner@example.com',
          password: 'ValidPassword123',
        })
        expect(screen.getByText('Dashboard Screen')).toBeDefined()
      })
    })
  })

  /* =========================================================================
   * 2. REGISTER FORM VALIDATION & INTERACTIONS
   * ========================================================================= */
  describe('RegisterPage', () => {
    it('2.1. Kiểm tra validation form tạo tài khoản: bắt buộc tên, email, mật khẩu >= 8 ký tự, mật khẩu khớp', async () => {
      render(
        <AuthContext.Provider value={defaultAuthContext}>
          <MemoryRouter initialEntries={['/register']}>
            <RegisterPage />
          </MemoryRouter>
        </AuthContext.Provider>
      )

      const submitBtn = screen.getByRole('button', { name: /tạo tài khoản/i })

      // Empty name
      fireEvent.click(submitBtn)
      expect(await screen.findByText('Vui lòng nhập tên hiển thị.')).toBeDefined()

      // Fill name, empty email
      fireEvent.change(screen.getByLabelText(/tên hiển thị/i), { target: { value: 'Nguyễn Văn A' } })
      fireEvent.click(submitBtn)
      expect(await screen.findByText('Vui lòng nhập địa chỉ email.')).toBeDefined()

      // Fill email, password < 8
      fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: 'a@example.com' } })
      fireEvent.change(screen.getByLabelText(/^mật khẩu/i), { target: { value: '123' } })
      fireEvent.click(submitBtn)
      expect(await screen.findByText('Mật khẩu phải có ít nhất 8 ký tự.')).toBeDefined()

      // Password mismatch
      fireEvent.change(screen.getByLabelText(/^mật khẩu/i), { target: { value: 'SecurePass123' } })
      fireEvent.change(screen.getByLabelText(/xác nhận mật khẩu/i), { target: { value: 'MismatchPass123' } })
      fireEvent.click(submitBtn)
      expect(await screen.findByText('Mật khẩu xác nhận không khớp.')).toBeDefined()
      expect(mockRegister).not.toHaveBeenCalled()
    })

    it('2.2. Hiển thị lỗi khi email trùng từ server (409 Conflict)', async () => {
      mockRegister.mockRejectedValueOnce(new Error('Email đã được sử dụng.'))

      render(
        <AuthContext.Provider value={defaultAuthContext}>
          <MemoryRouter initialEntries={['/register']}>
            <RegisterPage />
          </MemoryRouter>
        </AuthContext.Provider>
      )

      fireEvent.change(screen.getByLabelText(/tên hiển thị/i), { target: { value: 'Nguyễn Văn B' } })
      fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: 'duplicate@example.com' } })
      fireEvent.change(screen.getByLabelText(/^mật khẩu/i), { target: { value: 'SecurePass123' } })
      fireEvent.change(screen.getByLabelText(/xác nhận mật khẩu/i), { target: { value: 'SecurePass123' } })
      fireEvent.click(screen.getByRole('button', { name: /tạo tài khoản/i }))

      expect(await screen.findByText('Email đã được sử dụng.')).toBeDefined()
    })

    it('2.3. Tạo tài khoản thành công và chuyển hướng', async () => {
      const mockCreatedUser: AuthUser = {
        id: 'usr-new',
        email: 'newuser@example.com',
        displayName: 'Học viên Mới',
        role: 'learner',
        grade: 'Lớp 12',
        createdAt: new Date().toISOString(),
      }
      mockRegister.mockResolvedValueOnce(mockCreatedUser)

      render(
        <AuthContext.Provider value={defaultAuthContext}>
          <MemoryRouter initialEntries={['/register']}>
            <Routes>
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/dashboard" element={<div>Dashboard Screen</div>} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      )

      fireEvent.change(screen.getByLabelText(/tên hiển thị/i), { target: { value: 'Học viên Mới' } })
      fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: 'newuser@example.com' } })
      fireEvent.change(screen.getByLabelText(/^mật khẩu/i), { target: { value: 'SecurePass123' } })
      fireEvent.change(screen.getByLabelText(/xác nhận mật khẩu/i), { target: { value: 'SecurePass123' } })
      fireEvent.click(screen.getByRole('button', { name: /tạo tài khoản/i }))

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith({
          email: 'newuser@example.com',
          password: 'SecurePass123',
          displayName: 'Học viên Mới',
          grade: 'Lớp 12',
        })
        expect(screen.getByText('Dashboard Screen')).toBeDefined()
      })
    })
  })
})

