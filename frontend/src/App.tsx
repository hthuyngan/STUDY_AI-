import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import DashboardPage from '@/pages/Dashboard/DashboardPage'
import DesignSystemPage from '@/pages/DesignSystem/DesignSystemPage'

function PlaceholderPage({ title, desc }: { title: string; desc: string }) {
  return (
    <AppShell>
      <div className="py-6">
        <Card title={title} subtitle="Tính năng đang được phát triển">
          <p className="text-secondary text-sm">{desc}</p>
        </Card>
      </div>
    </AppShell>
  )
}

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        {/* Main Dashboard */}
        <Route
          path="/dashboard"
          element={
            <AppShell>
              <DashboardPage />
            </AppShell>
          }
        />

        {/* Design System Page (Bảo lưu theo yêu cầu) */}
        <Route path="/design-system" element={<DesignSystemPage />} />

        {/* Feature Placeholders */}
        <Route
          path="/ai-tutor"
          element={
            <PlaceholderPage
              title="✦ Trợ lý AI Tutor"
              desc="Hỏi đáp bài tập, giải thích chi tiết từng bước và luyện đề cùng AI."
            />
          }
        />
        <Route
          path="/courses"
          element={
            <PlaceholderPage
              title="Khóa học của tôi"
              desc="Toàn bộ danh sách khóa học và bài giảng theo chương trình."
            />
          }
        />
        <Route
          path="/exercises"
          element={
            <PlaceholderPage
              title="Bài tập & Luyện đề"
              desc="Ngân hàng câu hỏi trắc nghiệm và đề thi thử đại học."
            />
          }
        />
        <Route
          path="/library"
          element={
            <PlaceholderPage
              title="Thư viện tài liệu"
              desc="Sách giáo khoa điện tử, tài liệu tóm tắt công thức và đề thi các năm."
            />
          }
        />
        <Route
          path="/subjects/:id"
          element={
            <PlaceholderPage
              title="Chi tiết môn học"
              desc="Lộ trình học tập chi tiết, các chương và bài học theo phân môn."
            />
          }
        />
        <Route
          path="/achievements"
          element={
            <PlaceholderPage
              title="Thành tích & Huy hiệu"
              desc="Huy hiệu học tập, chuỗi ngày streak và bảng vinh danh."
            />
          }
        />
        <Route
          path="/settings"
          element={
            <PlaceholderPage
              title="Cài đặt tài khoản"
              desc="Quản lý hồ sơ học sinh, mục tiêu học tập và thông báo."
            />
          }
        />

        {/* Root redirect to Dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
