import React from 'react'
import { FileText, Clock, AlertCircle, CheckCircle2, Globe, Trash2 } from 'lucide-react'
import type { QuestionStatsResponse } from '../types'

interface QuestionBankKPIsProps {
  stats: QuestionStatsResponse | null
  loading?: boolean
}

export const QuestionBankKPIs: React.FC<QuestionBankKPIsProps> = ({ stats, loading }) => {
  const totalActive = stats?.totalQuestions || 0
  const totalTrash = stats?.deletedCount || 0
  const totalPhysicalSql = totalActive + totalTrash

  const items = [
    {
      label: 'Tổng câu hỏi',
      value: stats ? totalActive.toLocaleString('vi-VN') : '0',
      subtitle: stats ? `${totalPhysicalSql.toLocaleString('vi-VN')} bản ghi SQL (${totalActive.toLocaleString('vi-VN')} hoạt động)` : undefined,
      tooltip: `Gồm ${totalActive.toLocaleString('vi-VN')} câu hỏi hoạt động và ${totalTrash.toLocaleString('vi-VN')} câu hỏi trong thùng rác (Tổng ${totalPhysicalSql.toLocaleString('vi-VN')} dòng SQL).`,
      icon: <FileText size={18} style={{ color: '#183B69' }} />,
      bg: 'rgba(24, 59, 105, 0.08)',
      color: '#183B69',
    },
    {
      label: 'Bản nháp',
      value: stats ? stats.draftCount.toLocaleString('vi-VN') : '0',
      subtitle: 'Chưa gửi duyệt',
      tooltip: 'Các câu hỏi mới tạo hoặc nhập đang ở trạng thái soạn thảo.',
      icon: <Clock size={18} style={{ color: '#64748B' }} />,
      bg: 'rgba(100, 116, 139, 0.1)',
      color: '#475569',
    },
    {
      label: 'Chờ duyệt',
      value: stats ? stats.inReviewCount.toLocaleString('vi-VN') : '0',
      subtitle: 'Cần thẩm định',
      tooltip: 'Câu hỏi đã gửi và đang chờ Content Specialist kiểm tra chất lượng.',
      icon: <AlertCircle size={18} style={{ color: '#D97706' }} />,
      bg: 'rgba(217, 119, 6, 0.1)',
      color: '#D97706',
    },
    {
      label: 'Đã phê duyệt',
      value: stats ? stats.approvedCount.toLocaleString('vi-VN') : '0',
      subtitle: 'Sẵn sàng xuất bản',
      tooltip: 'Câu hỏi đạt tiêu chuẩn chuyên môn, sẵn sàng đưa lên hệ thống học tập.',
      icon: <CheckCircle2 size={18} style={{ color: '#0284C7' }} />,
      bg: 'rgba(2, 132, 199, 0.1)',
      color: '#0284C7',
    },
    {
      label: 'Đã xuất bản',
      value: stats ? stats.publishedCount.toLocaleString('vi-VN') : '0',
      subtitle: 'Đang phục vụ học tập',
      tooltip: 'Câu hỏi đang hoạt động trực tiếp trong các bài thi và đề ôn tập.',
      icon: <Globe size={18} style={{ color: '#16A34A' }} />,
      bg: 'rgba(22, 163, 74, 0.1)',
      color: '#16A34A',
    },
    {
      label: 'Thùng rác',
      value: stats ? totalTrash.toLocaleString('vi-VN') : '0',
      subtitle: 'Đã xóa mềm',
      tooltip: 'Câu hỏi đã xóa mềm khỏi danh sách chính, có thể khôi phục lại bất kỳ lúc nào.',
      icon: <Trash2 size={18} style={{ color: '#DC2626' }} />,
      bg: 'rgba(220, 38, 38, 0.1)',
      color: '#DC2626',
    },
  ]

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        gap: '12px',
        marginBottom: '16px',
      }}
    >
      {items.map((it, idx) => (
        <div
          key={idx}
          title={it.tooltip}
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: it.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {it.icon}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <span
              style={{
                fontSize: '11.5px',
                color: '#64748B',
                fontWeight: 600,
                display: 'block',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {it.label}
            </span>
            <span
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: it.color,
                display: 'block',
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
                marginTop: '1px',
              }}
            >
              {loading && !stats ? '...' : it.value}
            </span>
            {it.subtitle && (
              <span
                style={{
                  fontSize: '10px',
                  color: '#94A3B8',
                  display: 'block',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  marginTop: '1px',
                }}
              >
                {it.subtitle}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
export default QuestionBankKPIs
