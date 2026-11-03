import fs from 'fs'
import path from 'path'

const manifestPath = path.join('docs', 'visual-qa', 'manifest.json')
const data = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))

const phase6Entries = [
  {
    filename: 'learner_knowledge_gaps_desktop.png',
    relativePath: 'docs/visual-qa/screenshots/learner_knowledge_gaps_desktop.png',
    workspace: 'learner',
    route: '/knowledge-gaps',
    viewport: 'desktop_1440',
    width: 1440,
    height: 900,
    uiState: 'phase6_knowledge_gaps_default',
    timestamp: new Date().toISOString(),
    sourceCommit: 'HEAD',
    sourceUrl: 'https://hthuyngan.github.io/STUDY_AI-/knowledge-gaps',
    loadStatus: '200_OK',
    notes: 'Phase 6: Sổ tay kiến thức cần củng cố với 4 KPI, bộ lọc môn học, tabs trạng thái và danh sách cards'
  },
  {
    filename: 'learner_knowledge_gaps_mobile_390.png',
    relativePath: 'docs/visual-qa/screenshots/learner_knowledge_gaps_mobile_390.png',
    workspace: 'learner',
    route: '/knowledge-gaps',
    viewport: 'mobile_390',
    width: 390,
    height: 844,
    uiState: 'phase6_knowledge_gaps_mobile',
    timestamp: new Date().toISOString(),
    sourceCommit: 'HEAD',
    sourceUrl: 'https://hthuyngan.github.io/STUDY_AI-/knowledge-gaps',
    loadStatus: '200_OK',
    notes: 'Phase 6: Sổ tay kiến thức cần củng cố trên Mobile 390px, bố cục dọc tối ưu cảm ứng'
  },
  {
    filename: 'learner_smart_review_home_desktop.png',
    relativePath: 'docs/visual-qa/screenshots/learner_smart_review_home_desktop.png',
    workspace: 'learner',
    route: '/review',
    viewport: 'desktop_1440',
    width: 1440,
    height: 900,
    uiState: 'phase6_smart_review_home',
    timestamp: new Date().toISOString(),
    sourceCommit: 'HEAD',
    sourceUrl: 'https://hthuyngan.github.io/STUDY_AI-/review',
    loadStatus: '200_OK',
    notes: 'Phase 6: Trung tâm ôn tập ngắt quãng Spaced Repetition với các mục đến hạn hôm nay'
  },
  {
    filename: 'learner_smart_review_session_desktop.png',
    relativePath: 'docs/visual-qa/interactions/learner_smart_review_session_desktop.png',
    workspace: 'learner',
    route: '/review',
    viewport: 'desktop_1440',
    width: 1440,
    height: 900,
    uiState: 'phase6_smart_review_active_card',
    timestamp: new Date().toISOString(),
    sourceCommit: 'HEAD',
    sourceUrl: 'https://hthuyngan.github.io/STUDY_AI-/review',
    loadStatus: '200_OK',
    notes: 'Phase 6: Thẻ ôn tập chủ động hiển thị câu hỏi và nút Xem giải thích & Đáp án'
  },
  {
    filename: 'learner_smart_review_revealed_desktop.png',
    relativePath: 'docs/visual-qa/interactions/learner_smart_review_revealed_desktop.png',
    workspace: 'learner',
    route: '/review',
    viewport: 'desktop_1440',
    width: 1440,
    height: 900,
    uiState: 'phase6_smart_review_revealed_card',
    timestamp: new Date().toISOString(),
    sourceCommit: 'HEAD',
    sourceUrl: 'https://hthuyngan.github.io/STUDY_AI-/review',
    loadStatus: '200_OK',
    notes: 'Phase 6: Thẻ sau khi lật hiển thị lời giải và 3 nút tự đánh giá Spaced Repetition'
  },
  {
    filename: 'learner_smart_review_completed_desktop.png',
    relativePath: 'docs/visual-qa/interactions/learner_smart_review_completed_desktop.png',
    workspace: 'learner',
    route: '/review',
    viewport: 'desktop_1440',
    width: 1440,
    height: 900,
    uiState: 'phase6_smart_review_completed',
    timestamp: new Date().toISOString(),
    sourceCommit: 'HEAD',
    sourceUrl: 'https://hthuyngan.github.io/STUDY_AI-/review',
    loadStatus: '200_OK',
    notes: 'Phase 6: Màn hình hoàn thành phiên ôn tập với thống kê XP, số mục đã củng cố và điều hướng'
  },
  {
    filename: 'learner_dashboard_review_widget_desktop.png',
    relativePath: 'docs/visual-qa/screenshots/learner_dashboard_review_widget_desktop.png',
    workspace: 'learner',
    route: '/dashboard',
    viewport: 'desktop_1440',
    width: 1440,
    height: 900,
    uiState: 'phase6_dashboard_smart_review_widget',
    timestamp: new Date().toISOString(),
    sourceCommit: 'HEAD',
    sourceUrl: 'https://hthuyngan.github.io/STUDY_AI-/dashboard',
    loadStatus: '200_OK',
    notes: 'Phase 6: Widget Cần ôn hôm nay tích hợp ngay trên Dashboard học viên với CTA ôn tập nhanh'
  },
  {
    filename: 'learner_gap_to_lesson_anchor_desktop.png',
    relativePath: 'docs/visual-qa/interactions/learner_gap_to_lesson_anchor_desktop.png',
    workspace: 'learner',
    route: '/subjects/toan-hoc/lessons/les-math-12-01#section-2',
    viewport: 'desktop_1440',
    width: 1440,
    height: 900,
    uiState: 'phase6_gap_lesson_anchor',
    timestamp: new Date().toISOString(),
    sourceCommit: 'HEAD',
    sourceUrl: 'https://hthuyngan.github.io/STUDY_AI-/subjects/toan-hoc/lessons/les-math-12-01#section-2',
    loadStatus: '200_OK',
    notes: 'Phase 6: Điều hướng từ Sổ tay kiến thức yếu quay lại đúng section tương ứng trong bài học'
  }
]

const existingFilenames = new Set(data.map((d: any) => d.filename))
for (const entry of phase6Entries) {
  if (!existingFilenames.has(entry.filename)) {
    data.push(entry)
  }
}

fs.writeFileSync(manifestPath, JSON.stringify(data, null, 2), 'utf-8')
console.log('Updated manifest with Phase 6 entries. Total count:', data.length)
