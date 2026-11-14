import React from 'react'
import './AdminDesignSystem.css'

export interface TabItem {
  id: string
  label: string
  icon?: React.ReactNode
  badge?: string | number
}

export interface AdminTabsProps {
  tabs: TabItem[]
  activeTab: string
  onTabChange: (id: string) => void
  variant?: 'underline' | 'pill'
  className?: string
}

export const AdminTabs: React.FC<AdminTabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  variant = 'underline',
  className = '',
}) => {
  return (
    <div
      className={`admin-tabs-container ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: variant === 'pill' ? '6px' : '24px',
        borderBottom: variant === 'underline' ? '1px solid var(--admin-border-default)' : 'none',
        marginBottom: '20px',
        overflowX: 'auto',
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: variant === 'pill' ? '6px 14px' : '12px 2px',
              fontSize: '14px',
              fontWeight: isActive ? 600 : 500,
              color: isActive
                ? variant === 'pill'
                  ? 'var(--admin-text-inverse)'
                  : 'var(--admin-primary)'
                : 'var(--admin-text-muted)',
              background: isActive && variant === 'pill' ? 'var(--admin-primary)' : 'transparent',
              borderRadius: variant === 'pill' ? 'var(--admin-radius-md)' : 0,
              border: 'none',
              borderBottom:
                variant === 'underline'
                  ? isActive
                    ? '2px solid var(--admin-primary)'
                    : '2px solid transparent'
                  : 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all var(--admin-transition-fast)',
              outline: 'none',
              marginBottom: variant === 'underline' ? '-1px' : '0',
            }}
          >
            {tab.icon && <span>{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '1px 6px',
                  borderRadius: 'var(--admin-radius-full)',
                  background: isActive && variant === 'pill' ? 'rgba(255,255,255,0.2)' : 'var(--admin-bg-subtle)',
                  color: isActive && variant === 'pill' ? 'var(--admin-text-inverse)' : 'var(--admin-text-muted)',
                }}
              >
                {tab.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
