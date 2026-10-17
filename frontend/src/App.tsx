import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import DesignSystemPage from '@/pages/DesignSystem/DesignSystemPage'

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        {/* Design System — BƯỚC 3 */}
        <Route path="/design-system" element={<DesignSystemPage />} />

        {/* Redirect root → design-system trong giai đoạn này */}
        <Route path="*" element={<Navigate to="/design-system" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
