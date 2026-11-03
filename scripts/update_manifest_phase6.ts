import fs from 'fs'
import path from 'path'

const manifestPath = path.join('docs', 'visual-qa', 'manifest.json')
const data = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))

const prodEntries = [
  {
    filename: 'prod_phase6_knowledge_gaps_desktop.png',
    relativePath: 'docs/visual-qa/screenshots/prod_phase6_knowledge_gaps_desktop.png',
    workspace: 'learner',
    route: '/knowledge-gaps',
    viewport: 'desktop_1440',
    width: 1440,
    height: 900,
    uiState: 'prod_phase6_knowledge_gaps_live',
    timestamp: new Date().toISOString(),
    sourceCommit: '35cbdb5',
    sourceUrl: 'https://hthuyngan.github.io/STUDY_AI-/knowledge-gaps',
    loadStatus: '200_OK',
    notes: 'Production Live: Sổ tay kiến thức cần củng cố sau khi làm bài thu hoạch'
  },
  {
    filename: 'prod_phase6_knowledge_gaps_mobile.png',
    relativePath: 'docs/visual-qa/screenshots/prod_phase6_knowledge_gaps_mobile.png',
    workspace: 'learner',
    route: '/knowledge-gaps',
    viewport: 'mobile_390',
    width: 390,
    height: 844,
    uiState: 'prod_phase6_knowledge_gaps_mobile_live',
    timestamp: new Date().toISOString(),
    sourceCommit: '35cbdb5',
    sourceUrl: 'https://hthuyngan.github.io/STUDY_AI-/knowledge-gaps',
    loadStatus: '200_OK',
    notes: 'Production Live: Sổ tay kiến thức cần củng cố trên Mobile 390px'
  },
  {
    filename: 'prod_phase6_smart_review_desktop.png',
    relativePath: 'docs/visual-qa/screenshots/prod_phase6_smart_review_desktop.png',
    workspace: 'learner',
    route: '/review',
    viewport: 'desktop_1440',
    width: 1440,
    height: 900,
    uiState: 'prod_phase6_smart_review_live',
    timestamp: new Date().toISOString(),
    sourceCommit: '35cbdb5',
    sourceUrl: 'https://hthuyngan.github.io/STUDY_AI-/review',
    loadStatus: '200_OK',
    notes: 'Production Live: Trung tâm ôn tập ngắt quãng Spaced Repetition'
  },
  {
    filename: 'prod_phase6_smart_review_mobile.png',
    relativePath: 'docs/visual-qa/screenshots/prod_phase6_smart_review_mobile.png',
    workspace: 'learner',
    route: '/review',
    viewport: 'mobile_390',
    width: 390,
    height: 844,
    uiState: 'prod_phase6_smart_review_mobile_live',
    timestamp: new Date().toISOString(),
    sourceCommit: '35cbdb5',
    sourceUrl: 'https://hthuyngan.github.io/STUDY_AI-/review',
    loadStatus: '200_OK',
    notes: 'Production Live: Trung tâm ôn tập trên Mobile 390px'
  },
  {
    filename: 'prod_phase6_dashboard_desktop.png',
    relativePath: 'docs/visual-qa/screenshots/prod_phase6_dashboard_desktop.png',
    workspace: 'learner',
    route: '/dashboard',
    viewport: 'desktop_1440',
    width: 1440,
    height: 900,
    uiState: 'prod_phase6_dashboard_live',
    timestamp: new Date().toISOString(),
    sourceCommit: '35cbdb5',
    sourceUrl: 'https://hthuyngan.github.io/STUDY_AI-/dashboard',
    loadStatus: '200_OK',
    notes: 'Production Live: Dashboard với widget Cần ôn hôm nay'
  },
  {
    filename: 'prod_phase6_assessment_gap_created.png',
    relativePath: 'docs/visual-qa/interactions/prod_phase6_assessment_gap_created.png',
    workspace: 'learner',
    route: '/subjects/math/lessons/lesson-math-08',
    viewport: 'desktop_1440',
    width: 1440,
    height: 900,
    uiState: 'prod_phase6_assessment_live',
    timestamp: new Date().toISOString(),
    sourceCommit: '35cbdb5',
    sourceUrl: 'https://hthuyngan.github.io/STUDY_AI-/subjects/math/lessons/lesson-math-08',
    loadStatus: '200_OK',
    notes: 'Production Live: Kết quả bài thu hoạch tự động kích hoạt tạo Knowledge Gaps'
  },
  {
    filename: 'prod_phase6_smart_review_session.png',
    relativePath: 'docs/visual-qa/interactions/prod_phase6_smart_review_session.png',
    workspace: 'learner',
    route: '/review',
    viewport: 'desktop_1440',
    width: 1440,
    height: 900,
    uiState: 'prod_phase6_session_live',
    timestamp: new Date().toISOString(),
    sourceCommit: '35cbdb5',
    sourceUrl: 'https://hthuyngan.github.io/STUDY_AI-/review',
    loadStatus: '200_OK',
    notes: 'Production Live: Thẻ flashcard trong phiên ôn tập đang diễn ra'
  },
  {
    filename: 'prod_phase6_smart_review_completed.png',
    relativePath: 'docs/visual-qa/interactions/prod_phase6_smart_review_completed.png',
    workspace: 'learner',
    route: '/review',
    viewport: 'desktop_1440',
    width: 1440,
    height: 900,
    uiState: 'prod_phase6_completed_live',
    timestamp: new Date().toISOString(),
    sourceCommit: '35cbdb5',
    sourceUrl: 'https://hthuyngan.github.io/STUDY_AI-/review',
    loadStatus: '200_OK',
    notes: 'Production Live: Hoàn thành phiên ôn tập và dời lịch Spaced Repetition'
  }
]

const existingFilenames = new Set(data.map((d: any) => d.filename))
for (const entry of prodEntries) {
  if (!existingFilenames.has(entry.filename)) {
    data.push(entry)
  }
}

fs.writeFileSync(manifestPath, JSON.stringify(data, null, 2), 'utf-8')
console.log('Updated manifest with Production entries. Total count:', data.length)
