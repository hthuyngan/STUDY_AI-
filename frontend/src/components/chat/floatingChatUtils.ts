/**
 * Centrally determines whether the floating AI chatbot should be displayed based on route & environment.
 */
export function shouldShowFloatingChat(pathname: string): boolean {
  // 1. Strictly forbid on auth pages
  if (pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/unauthorized')) {
    return false
  }

  // 2. Strictly forbid on admin/staff management portals
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/teacher') ||
    pathname.startsWith('/content') ||
    pathname.startsWith('/support')
  ) {
    return false
  }

  // 3. Strictly forbid on settings / configuration pages
  if (pathname === '/settings' || pathname.startsWith('/settings/')) {
    return false
  }

  // 4. Strictly forbid in formal exam mode / active quizzes where AI assistance is prohibited
  if (pathname.startsWith('/quiz/') && !pathname.includes('/result')) {
    return false
  }

  if (pathname.includes('/exam') || pathname.includes('/formal-test')) {
    return false
  }

  // 5. Allowed across learner workspaces: dashboard, subjects, lessons, practice, reviews, notes, library, etc.
  return true
}
