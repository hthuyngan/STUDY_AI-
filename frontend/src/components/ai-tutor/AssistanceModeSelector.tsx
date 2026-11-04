import React from 'react'
import type { LearningAssistanceMode } from '@/types/aiTutor'
import { ASSISTANCE_MODES } from '@/services/learningContext.service'
import './AssistanceModeSelector.css'

export interface AssistanceModeSelectorProps {
  activeMode: LearningAssistanceMode
  onSelectMode: (mode: LearningAssistanceMode) => void
  disabled?: boolean
}

export const AssistanceModeSelector: React.FC<AssistanceModeSelectorProps> = ({
  activeMode,
  onSelectMode,
  disabled = false,
}) => {
  return (
    <div
      className="assistance-mode-selector"
      role="radiogroup"
      aria-label="Chọn chế độ hỗ trợ học tập"
    >
      <span className="mode-selector-label" id="mode-selector-heading">
        Chế độ hỗ trợ:
      </span>

      <div className="mode-pills-row" role="presentation">
        {ASSISTANCE_MODES.map((mode) => {
          const isSelected = activeMode === mode.id
          return (
            <button
              key={mode.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              className={`mode-pill-btn ${isSelected ? 'active' : ''}`}
              onClick={() => onSelectMode(mode.id)}
              title={mode.description}
            >
              <span className="mode-pill-icon" aria-hidden>
                {mode.icon}
              </span>
              <span className="mode-pill-name">{mode.shortLabel}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
