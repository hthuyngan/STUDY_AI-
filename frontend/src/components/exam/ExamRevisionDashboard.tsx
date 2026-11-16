import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Award,
  BookOpen,
  Calendar,
  CheckCircle,
  Clock,
  HelpCircle,
  Play,
  RotateCcw,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { examPrepService } from '@/services/examPrep.service';
import type {
  ExamBlueprintDto,
  ExamReadinessDto,
  RevisionPlanDto,
  SpacedRepetitionQueueDto,
  SpacedRepetitionItemDto,
} from '@/types/examPrep';

interface ExamRevisionDashboardProps {
  subjectId?: string;
  onStartExam?: (blueprintId: string) => void;
}

export const ExamRevisionDashboard: React.FC<ExamRevisionDashboardProps> = ({
  subjectId = 'sub_math12',
  onStartExam,
}) => {
  const [activeTab, setActiveTab] = useState<'readiness' | 'blueprints' | 'spaced_repetition' | 'plan'>('readiness');
  const [readiness, setReadiness] = useState<ExamReadinessDto | null>(null);
  const [blueprints, setBlueprints] = useState<ExamBlueprintDto[]>([]);
  const [queue, setQueue] = useState<SpacedRepetitionQueueDto | null>(null);
  const [plan, setPlan] = useState<RevisionPlanDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, [subjectId]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [readinessData, blueprintsData, queueData, planData] = await Promise.allSettled([
        examPrepService.getReadiness(subjectId),
        examPrepService.getBlueprints(subjectId),
        examPrepService.getSpacedRepetitionQueue(subjectId),
        examPrepService.getRevisionPlan(subjectId),
      ]);

      if (readinessData.status === 'fulfilled') setReadiness(readinessData.value);
      if (blueprintsData.status === 'fulfilled') setBlueprints(blueprintsData.value);
      if (queueData.status === 'fulfilled') setQueue(queueData.value);
      if (planData.status === 'fulfilled') setPlan(planData.value);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewItem = async (item: SpacedRepetitionItemDto, qualityScore: number) => {
    try {
      const res = await examPrepService.recordSpacedRepetitionReview({
        itemId: item.itemId,
        topicName: item.topicName,
        subjectId,
        qualityScore,
      });
      setReviewMessage(`[${item.topicName}]: ${res.message}`);
      // Refresh queues
      const updatedQueue = await examPrepService.getSpacedRepetitionQueue(subjectId);
      setQueue(updatedQueue);
      setTimeout(() => setReviewMessage(null), 4000);
    } catch (err: any) {
      setReviewMessage('Lỗi khi ghi nhận ôn tập: ' + (err.message || ''));
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium">Đang tải trung tâm luyện thi thông minh...</p>
      </div>
    );
  }

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'exam_ready':
        return <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-full flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Sẵn sàng thi (Exam Ready)</span>;
      case 'progressing':
        return <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> Đang bứt phá (Progressing)</span>;
      case 'needs_reinforcement':
        return <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Cần củng cố kiến thức</span>;
      default:
        return <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full flex items-center gap-1"><HelpCircle className="w-3.5 h-3.5" /> Chưa đủ dữ liệu đề thi</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-4 pt-2 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('readiness')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'readiness' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Award className="w-4 h-4" /> Đánh giá Sẵn sàng
        </button>
        <button
          onClick={() => setActiveTab('blueprints')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'blueprints' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-4 h-4" /> Cấu trúc Đề thi Chuẩn
        </button>
        <button
          onClick={() => setActiveTab('spaced_repetition')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'spaced_repetition' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <RotateCcw className="w-4 h-4" /> Hàng đợi Ôn tập Giãn cách
          {queue && queue.dueToday.length > 0 && (
            <span className="px-1.5 py-0.5 bg-rose-500 text-white text-xs font-bold rounded-full">
              {queue.dueToday.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('plan')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'plan' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-4 h-4" /> Kế hoạch Ôn tập Cá nhân
        </button>
      </div>

      {reviewMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{reviewMessage}</span>
        </div>
      )}

      {/* 1. READINESS TAB */}
      {activeTab === 'readiness' && readiness && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-indigo-900 to-indigo-800 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded font-medium">Toán 12 • Định hướng Kỳ thi THPT</span>
                  {getTierBadge(readiness.readinessTier)}
                </div>
                <h2 className="text-2xl font-bold tracking-tight">Chỉ số Sẵn sàng & Định hướng Ôn thi THPT</h2>
                <p className="text-indigo-200 text-sm mt-1 max-w-xl">{readiness.recommendedAction}</p>
              </div>

              <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20 text-center min-w-[180px]">
                <div className="text-xs text-indigo-200 uppercase font-semibold">Ước Lượng Điểm Tham Khảo</div>
                {readiness.predictedScoreMax > 0 ? (
                  <div className="text-3xl font-extrabold text-amber-300 mt-1">
                    {readiness.predictedScoreMin} - {readiness.predictedScoreMax}
                  </div>
                ) : (
                  <div className="text-sm font-semibold text-slate-300 mt-2 px-2 py-1 bg-white/10 rounded">
                    Cần hoàn thành ≥ 2 đề thi
                  </div>
                )}
                <div className="text-xs text-indigo-200 mt-1">Thang điểm 10 (Nội bộ)</div>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/15">
              <div className="bg-white/10 rounded-lg p-3">
                <div className="text-xs text-indigo-200">Độ phủ Giáo trình</div>
                <div className="text-xl font-bold text-white mt-1">{readiness.curriculumCoveragePercent}%</div>
                <div className="w-full bg-white/20 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${readiness.curriculumCoveragePercent}%` }} />
                </div>
              </div>

              <div className="bg-white/10 rounded-lg p-3">
                <div className="text-xs text-indigo-200">Độ ổn định Điểm thi</div>
                <div className="text-xl font-bold text-white mt-1">{readiness.examScoreStabilityPercent}%</div>
                <div className="w-full bg-white/20 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-blue-400 h-full rounded-full" style={{ width: `${readiness.examScoreStabilityPercent}%` }} />
                </div>
              </div>

              <div className="bg-white/10 rounded-lg p-3">
                <div className="text-xs text-indigo-200">Chỉ số Sẵn sàng Tổng hợp</div>
                <div className="text-xl font-bold text-white mt-1">{readiness.readinessScorePercent}%</div>
                <div className="w-full bg-white/20 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-amber-400 h-full rounded-full" style={{ width: `${readiness.readinessScorePercent}%` }} />
                </div>
              </div>
            </div>

            {/* Legal / Pedagogical Disclaimer */}
            <div className="mt-4 text-xs text-indigo-300/80 italic flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{readiness.disclaimer}</span>
            </div>
          </div>

          {/* Critical High-Yield Topics */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Năng lực tại các Chuyên đề Trọng điểm Toán 12
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(readiness.criticalTopicsMastery).map(([topic, score]) => (
                <div key={topic} className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-between text-sm font-medium text-slate-800">
                    <span className="truncate pr-2">{topic}</span>
                    <span className={`font-bold ${score >= 80 ? 'text-emerald-600' : score >= 50 ? 'text-blue-600' : 'text-rose-600'}`}>
                      {score}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full mt-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-blue-500' : 'bg-rose-500'}`}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. BLUEPRINTS TAB */}
      {activeTab === 'blueprints' && (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-sm flex items-start gap-3">
            <BookOpen className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Cấu trúc Định dạng Đề thi Tốt nghiệp THPT từ năm 2025</p>
              <p className="text-xs text-blue-700 mt-1">
                Theo Quyết định số 764/QĐ-BGDĐT của Bộ GD&ĐT: Môn Toán gồm 22 câu hỏi chính (34 đơn vị chấm điểm, 90 phút) chia làm 3 phần gồm trắc nghiệm 4 lựa chọn, đúng/sai và trả lời ngắn.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {blueprints.map((bp) => (
              <div
                key={bp.blueprintId}
                className={`bg-white rounded-xl border p-6 flex flex-col justify-between shadow-sm transition-all ${
                  bp.isOfficialStandard ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    {bp.isOfficialStandard ? (
                      <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full">
                        Chuẩn Chính thức GDPT 2018 (Từ 2025)
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded-full">
                        {bp.verificationStatus === 'verified_legacy' ? 'Định dạng Cũ 2020-2024' : 'Luyện tập Chuyên đề'}
                      </span>
                    )}
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {bp.durationMinutes} phút
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900">{bp.title}</h3>
                  <p className="text-xs text-slate-600 mt-2">{bp.description}</p>

                  {/* Section Breakdown */}
                  <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
                    {bp.sections.map((sec) => (
                      <div key={sec.sectionIndex} className="text-xs text-slate-700 flex justify-between">
                        <span className="font-medium text-slate-800">{sec.title}</span>
                        <span className="font-semibold text-slate-900 shrink-0 ml-2">{sec.questionCount} câu ({sec.maxSectionScore}đ)</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-xs text-slate-500">
                    Tổng số: <span className="font-bold text-slate-800">{bp.totalQuestions} câu</span>
                  </div>
                  <button
                    onClick={() => onStartExam ? onStartExam(bp.blueprintId) : null}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                  >
                    <Play className="w-4 h-4 fill-current" /> Bắt đầu Thi thử
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. SPACED REPETITION TAB */}
      {activeTab === 'spaced_repetition' && queue && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-indigo-600" />
                Ôn tập Giãn cách (Spaced Repetition SM-2)
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Lịch ôn tập tính toán dựa trên chu kỳ lặp và tốc độ quên kiến thức toán học của cá nhân.
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500">Ước tính Tỷ lệ Ghi nhớ</div>
              <div className="text-2xl font-extrabold text-emerald-600">{queue.retentionRateEstimatePercent}%</div>
            </div>
          </div>

          {/* Due Today Queue */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-rose-500 rounded-full" />
              Cần Ôn Tập Hôm Nay ({queue.dueToday.length})
            </h4>

            {queue.dueToday.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">Tuyệt vời! Bạn không còn chuyên đề nào đến hạn ôn hôm nay.</p>
            ) : (
              <div className="space-y-3">
                {queue.dueToday.map((item) => (
                  <div key={item.itemId} className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-sm text-slate-900">{item.topicName}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Lần lặp #{item.repetitionNumber} • Khoảng cách: {item.intervalDays} ngày • Điểm: {item.masteryScore}%
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs text-slate-500 mr-2">Tự đánh giá:</span>
                      <button
                        onClick={() => handleReviewItem(item, 1)}
                        className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-semibold rounded"
                        title="Quên hoàn toàn"
                      >
                        Quên (1đ)
                      </button>
                      <button
                        onClick={() => handleReviewItem(item, 3)}
                        className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-semibold rounded"
                        title="Nhớ sau khi gợi ý"
                      >
                        Tạm được (3đ)
                      </button>
                      <button
                        onClick={() => handleReviewItem(item, 5)}
                        className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-semibold rounded"
                        title="Thuộc làu, làm nhanh"
                      >
                        Thành thạo (5đ)
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Needs Reinforcement */}
          {queue.needsReinforcement.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h4 className="text-sm font-bold text-amber-800 mb-3 flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-amber-500 rounded-full" />
                Chuyên đề Cần Củng Cố Gấp ({queue.needsReinforcement.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {queue.needsReinforcement.map((item) => (
                  <div key={item.itemId} className="p-3 bg-amber-50/50 border border-amber-200 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-xs text-slate-900">{item.topicName}</div>
                      <div className="text-xs text-amber-700">Điểm năng lực: {item.masteryScore}%</div>
                    </div>
                    <button
                      onClick={() => handleReviewItem(item, 4)}
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded shadow-sm"
                    >
                      Ôn lại
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. REVISION PLAN TAB */}
      {activeTab === 'plan' && plan && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Lộ trình Ôn tập Cá nhân hóa</span>
              <h3 className="text-xl font-bold text-slate-900 mt-1">Mục tiêu: {plan.targetScore} điểm Toán THPT Quốc gia</h3>
              <p className="text-xs text-slate-500 mt-1">
                Thời gian học: {plan.dailyStudyMinutes} phút/ngày • Còn {plan.daysRemaining} ngày đến kỳ thi
              </p>
            </div>
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-center min-w-[140px]">
              <div className="text-xs text-indigo-700 uppercase font-bold">Ngày Còn Lại</div>
              <div className="text-2xl font-black text-indigo-700 mt-0.5">{plan.daysRemaining}</div>
            </div>
          </div>

          {/* Milestones timeline */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h4 className="text-sm font-bold text-slate-900 mb-4">Các Mốc Ôn Luyện Đề Xuất</h4>
            <div className="space-y-3">
              {plan.milestones.map((m) => (
                <div key={m.dayIndex} className="p-3.5 border border-slate-200 rounded-lg flex items-start gap-3 bg-slate-50/60">
                  <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {m.dayIndex}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-slate-900">{m.title}</div>
                    <div className="text-xs text-slate-600 mt-0.5">{m.objective}</div>
                    <div className="text-xs text-indigo-600 font-medium mt-1">
                      Thời lượng: {m.allocatedMinutes} phút • Trọng tâm: {m.focusTopic}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Adjustment Reason History */}
          {plan.adjustmentHistory.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <h4 className="text-sm font-bold text-slate-800 mb-3">Lịch Sử Điều Chỉnh Tự Động của AI</h4>
              <div className="space-y-2">
                {plan.adjustmentHistory.map((h, idx) => (
                  <div key={idx} className="text-xs text-slate-600 border-l-2 border-indigo-500 pl-3 py-1">
                    <span className="font-semibold text-slate-800">{new Date(h.adjustedAt).toLocaleDateString('vi-VN')}:</span> {h.reason}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
