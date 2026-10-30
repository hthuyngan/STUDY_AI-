import React from 'react'
import { Clock, ShieldCheck, AlertTriangle, XCircle } from 'lucide-react'
import type { AuditLogEntry } from '@/types/operations'

export interface AuditLogCardListProps {
  logs: AuditLogEntry[]
}

export const AuditLogCardList: React.FC<AuditLogCardListProps> = ({ logs }) => {
  const renderResultBadge = (result: AuditLogEntry['result']) => {
    switch (result) {
      case 'success':
        return (
          <span className="admin-audit-pill result-success">
            <ShieldCheck size={11} />
            <span>Thành công</span>
          </span>
        )
      case 'warning':
        return (
          <span className="admin-audit-pill result-warning">
            <AlertTriangle size={11} />
            <span>Cảnh báo</span>
          </span>
        )
      case 'failure':
        return (
          <span className="admin-audit-pill result-failure">
            <XCircle size={11} />
            <span>Thất bại</span>
          </span>
        )
    }
  }

  return (
    <div className="admin-mobile-card-list audit-mobile-card-list" role="region" aria-label="Danh sách nhật ký quản trị di động">
      {logs.map((log) => (
        <div key={log.id} className="admin-mobile-card">
          <div className="admin-mobile-header">
            <div className="admin-mobile-id-wrap" style={{ flex: 1 }}>
              <div className="admin-mobile-user-info">
                <span className="admin-mobile-name-link" style={{ fontSize: '0.88rem', fontWeight: 600 }}>
                  NK. {log.action}
                </span>
                <span className="admin-mobile-email" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={12} />
                  <span>{new Date(log.timestamp).toLocaleString('vi-VN')}</span>
                  <span>•</span>
                  <span>{log.actor}</span>
                </span>
              </div>
            </div>
            <div className="admin-mobile-status-wrap">
              {renderResultBadge(log.result)}
            </div>
          </div>

          {/* Meta row: Workspace + Target */}
          <div className="admin-mobile-meta-row" style={{ marginTop: 4 }}>
            <span className={`admin-ws-badge ws-${log.workspace}`}>
              {log.workspace.toUpperCase()}
            </span>
            <span className="admin-target-pill">
              {log.target} {log.targetId && `(#${log.targetId})`}
            </span>
          </div>

          {/* Details */}
          {log.details && (
            <p className="admin-mobile-snippet" style={{ marginTop: 6, fontStyle: 'normal' }}>
              {log.details}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
