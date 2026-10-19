// ============================================================
// STICKER REGISTRY — STUDY_AI
// Place image/svg files into frontend/src/assets/stickers/
// and register their paths here.
// ============================================================

export type StickerName =
  | 'welcome'
  | 'study'
  | 'calendar'
  | 'streak'
  | 'progress'
  | 'aiTutor'
  | 'achievement'
  | 'review'
  | 'book'
  | 'goal'

export const STICKERS: Record<StickerName, string> = {
  welcome: '/stickers/welcome.svg',
  study: '/stickers/study.svg',
  calendar: '/stickers/calendar.svg',
  streak: '/stickers/streak.svg',
  progress: '/stickers/progress.svg',
  aiTutor: '/stickers/ai-tutor.svg',
  achievement: '/stickers/achievement.svg',
  review: '/stickers/review.svg',
  book: '/stickers/book.svg',
  goal: '/stickers/goal.svg',
} as const
