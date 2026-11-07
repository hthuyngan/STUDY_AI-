import React, { useState } from 'react'
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
import { OverviewTab } from './components/OverviewTab'
import { CompetencyProfileTab } from './components/CompetencyProfileTab'
import { SubjectAnalyticsTab } from './components/SubjectAnalyticsTab'
import { LearningHistoryTab } from './components/LearningHistoryTab'
import './LearningAnalyticsPage.css'

type AnalyticsTab = 'personalization' | 'overview' | 'competency' | 'subjects' | 'history'

const LearningAnalyticsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview')
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

