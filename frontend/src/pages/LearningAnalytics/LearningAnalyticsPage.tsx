import React, { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  BarChart3,
  Award,
  BookOpen,
  Compass,
  History,
  RotateCw,
  Sparkles,
} from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { useLearningAnalytics } from '@/hooks/useLearningAnalytics'
import { usePersonalization } from '@/hooks/usePersonalization'
import { PersonalizedAnalyticsView } from '@/components/personalization/PersonalizedAnalyticsView'
import { IntelligentAnalyticsDashboard } from '@/components/dashboard/IntelligentAnalyticsDashboard'
import { ExamRevisionDashboard } from '@/components/exam/ExamRevisionDashboard'
import { OverviewTab } from './components/OverviewTab'
import { CompetencyProfileTab } from './components/CompetencyProfileTab'
import { SubjectAnalyticsTab } from './components/SubjectAnalyticsTab'
import { LearningHistoryTab } from './components/LearningHistoryTab'
import './LearningAnalyticsPage.css'

type AnalyticsTab = 'intelligent' | 'exam_prep' | 'personalization' | 'overview' | 'competency' | 'subjects' | 'history'

const LearningAnalyticsPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const initialTab = (searchParams.get('tab') as AnalyticsTab) || 'overview'
  const [activeTab, setActiveTab] = useState<AnalyticsTab>(initialTab)
  const {
    data,
    loading,
    refresh,
    selectedSubject,
    setSelectedSubject,
    selectedCompetencyLevel,
    setSelectedCompetencyLevel,
    selectedHistoryCategory,
    setSelectedHistoryCategory,
    filteredCompetencies,
    filteredHistory,
  } = useLearningAnalytics()
  const { data: personalizationData, reload: reloadPersonalization } = usePersonalization()

  return (
    <div className="learning-analytics-root">
      {/* 1. Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Học tập', to: '/dashboard' },
          { label: 'Phân tích học tập & Hồ sơ năng lực' },
        ]}
      />

      {/* 2. Hero Header */}
      <header className="analytics-page-header">
        <div className="header-info">
          <div className="header-tag">
            <Sparkles size={14} aria-hidden /> LEARNING ANALYTICS & COMPETENCY PROFILE
          </div>
          <h1 className="analytics-page-title">Phân tích học tập & Hồ sơ năng lực</h1>
          <p className="analytics-page-desc">
            Tổng hợp minh bạch tiến độ học tập, kết quả bài thu hoạch, phân loại năng lực thực chứng và lịch sử học tập cá nhân hóa.
          </p>
        </div>

        <div className="header-actions">
          <Button
            variant="outline"
            size="sm"
            icon={RotateCw}
            onClick={refresh}
            disabled={loading}
          >
            Làm mới số liệu
          </Button>
        </div>
      </header>

      {/* 3. Main Navigation Tabs */}
      <nav className="analytics-nav-tabs" role="tablist" aria-label="Các mục phân tích học tập">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'intelligent'}
          className={`nav-tab-btn ${activeTab === 'intelligent' ? 'active' : ''}`}
          onClick={() => setActiveTab('intelligent')}
        >
          <Sparkles size={16} aria-hidden />
          <span>Đánh giá thông minh (Toán 12)</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'exam_prep'}
          className={`nav-tab-btn ${activeTab === 'exam_prep' ? 'active' : ''}`}
          onClick={() => setActiveTab('exam_prep')}
        >
          <Award size={16} aria-hidden />
          <span>Luyện thi & Ôn tập (THPT 2025)</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'personalization'}
          className={`nav-tab-btn ${activeTab === 'personalization' ? 'active' : ''}`}
          onClick={() => setActiveTab('personalization')}
        >
          <Compass size={16} aria-hidden />
          <span>Năng lực thực chứng & Cá nhân hóa</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'overview'}
          className={`nav-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <BarChart3 size={16} aria-hidden />
          <span>Tổng quan & Hoạt động</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'competency'}
          className={`nav-tab-btn ${activeTab === 'competency' ? 'active' : ''}`}
          onClick={() => setActiveTab('competency')}
        >
          <Award size={16} aria-hidden />
          <span>Hồ sơ năng lực ({data.competencies.length})</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'subjects'}
          className={`nav-tab-btn ${activeTab === 'subjects' ? 'active' : ''}`}
          onClick={() => setActiveTab('subjects')}
        >
          <BookOpen size={16} aria-hidden />
          <span>Phân tích theo môn</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'history'}
          className={`nav-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <History size={16} aria-hidden />
          <span>Lịch sử học tập ({data.historyTimeline.length})</span>
        </button>
      </nav>

      {/* 4. Tab Content Area */}
      <main className="analytics-tab-body">
        {activeTab === 'intelligent' && (
          <IntelligentAnalyticsDashboard subjectId={selectedSubject || 'sub_math12'} />
        )}

        {activeTab === 'exam_prep' && (
          <ExamRevisionDashboard subjectId={selectedSubject || 'sub_math12'} />
        )}

        {activeTab === 'personalization' && personalizationData && (
          <PersonalizedAnalyticsView
            data={personalizationData}
            onRefresh={reloadPersonalization}
          />
        )}

        {activeTab === 'overview' && (
          <OverviewTab
            summary={data.summary}
            dailyActivities={data.dailyActivities}
            assessmentTrends={data.assessmentTrends}
          />
        )}

        {activeTab === 'competency' && (
          <CompetencyProfileTab
            competencies={filteredCompetencies}
            selectedSubject={selectedSubject}
            onSelectSubject={setSelectedSubject}
            selectedLevel={selectedCompetencyLevel}
            onSelectLevel={setSelectedCompetencyLevel}
          />
        )}

        {activeTab === 'subjects' && (
          <SubjectAnalyticsTab subjects={data.subjectAnalytics} />
        )}

        {activeTab === 'history' && (
          <LearningHistoryTab
            history={filteredHistory}
            selectedCategory={selectedHistoryCategory}
            onSelectCategory={setSelectedHistoryCategory}
            selectedSubject={selectedSubject}
            onSelectSubject={setSelectedSubject}
          />
        )}
      </main>
    </div>
  )
}

export default LearningAnalyticsPage

