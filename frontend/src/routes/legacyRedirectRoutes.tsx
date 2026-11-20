import { Route, Navigate } from 'react-router-dom'

/**
 * Lightweight route module for legacy AI Tutor redirects.
 * Redirects obsolete /ai-tutor URLs to /subjects without requiring the entire 25-page route tree.
 */
export function LegacyAiTutorRoutes() {
  return (
    <>
      <Route path="/ai-tutor" element={<Navigate to="/subjects" replace />} />
      <Route path="/ai-tutor/:conversationId" element={<Navigate to="/subjects" replace />} />
    </>
  )
}
