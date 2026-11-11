/**
 * Frontend Prototype Mode Configuration
 *
 * In Prototype Mode (VITE_UI_PROTOTYPE_MODE === 'true'):
 * - Local mockup demonstration without live backend.
 *
 * In Production / Standard Full-Stack Mode:
 * - Real ASP.NET Core Web API + SQL Server.
 * - Real JWT authentication and role-based access control.
 */
export const FRONTEND_PROTOTYPE_MODE = false

export function isPrototypeMode(): boolean {
  if (typeof window !== 'undefined') {
    const win = window as unknown as { __STUDY_AI_PROTOTYPE_MODE__?: boolean }
    if (typeof win.__STUDY_AI_PROTOTYPE_MODE__ === 'boolean') {
      return win.__STUDY_AI_PROTOTYPE_MODE__
    }
  }
  return FRONTEND_PROTOTYPE_MODE || import.meta.env.VITE_UI_PROTOTYPE_MODE === 'true'
}

// Backward compatibility alias for preview helper
export function isStaffUiPreviewEnabled(): boolean {
  return isPrototypeMode()
}
