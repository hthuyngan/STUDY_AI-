import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './index.css'
import './styles/layout.css'
import './styles/components.css'
import App from './App.tsx'

// Enforce Light Mode system-wide and clean up legacy theme/collapsed keys
if (typeof window !== 'undefined') {
  document.documentElement.setAttribute('data-theme', 'light')
  localStorage.removeItem('study_ai_theme')
  localStorage.removeItem('study_ai_sidebar_collapsed')
  localStorage.removeItem('study_ai_workspace_sidebar_collapsed')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
