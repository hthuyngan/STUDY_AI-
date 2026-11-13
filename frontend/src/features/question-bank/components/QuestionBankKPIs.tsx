import React from 'react'
import { FileText, Clock, AlertCircle, CheckCircle2, Globe, Trash2 } from 'lucide-react'
import type { QuestionStatsResponse } from '../types'

interface QuestionBankKPIsProps {
  stats: QuestionStatsResponse | null
  loading?: boolean
}

export const QuestionBankKPIs: React.FC<QuestionBankKPIsProps> = ({ stats, loading }) => {
  const items = [
    {
      label: 'Tổng câu hỏi',
      value: stats ? stats.totalQuestions.toLocaleString('vi-VN') : '0',
      icon: <FileText size={18} style={{ color: '#183B69' }} />,
      bg: 'rgba(24, 59, 105, 0.08)',
      color: '#183B69',
    },
    {
      label: 'Bản nháp',
      value: stats ? stats.draftCount.toLocaleString('vi-VN') : '0',
      icon: <Clock size={18} style={{ color: '#64748B' }} />,
      bg: 'rgba(100, 116, 139, 0.1)',
      color: '#475569',
    },
    {
      label: 'Chờ duyệt',
      value: stats ? stats.inReviewCount.toLocaleString('vi-VN') : '0',
      icon: <AlertCircle size={18} style={{ color: '#D97706' }} />,
      bg: 'rgba(217, 119, 6, 0.1)',
      color: '#D97706',
    },
    {
      label: 'Đã phê duyệt',
      value: stats ? stats.approvedCount.toLocaleString('vi-VN') : '0',
      icon: <CheckCircle2 size={18} style={{ color: '#0284C7' }} />,
      bg: 'rgba(2, 132, 199, 0.1)',
      color: '#0284C7',
    },
    {
      label: 'Đã xuất bản',
      value: stats ? stats.publishedCount.toLocaleString('vi-VN') : '0',
      icon: <Globe size={18} style={{ color: '#16A34A' }} />,
      bg: 'rgba(22, 163, 74, 0.1)',
      color: '#16A34A',
    },
    {
      label: 'Thùng rác',
      value: stats ? stats.deletedCount.toLocaleString('vi-VN') : '0',
      icon: <Trash2 size={18} style={{ color: '#DC2626' }} />,
      bg: 'rgba(220, 38, 38, 0.1)',
      color: '#DC2626',
    },
  ]

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '12px',
        marginBottom: '16px',
      }}
    >
      {items.map((it, idx) => (
        <div
          key={idx}
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '14px 16px',
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
                fontSize: '12px',
                color: '#64748B',
                fontWeight: 500,
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
                marginTop: '2px',
              }}
            >
              {loading && !stats ? '...' : it.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
