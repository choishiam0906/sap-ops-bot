import { Pencil, Trash2, User } from 'lucide-react'
import type { ClosingStep, DdayInfo } from '../../../main/contracts'
import { calculateDday } from '../../../main/types/closing'

function ddayLabel(info: DdayInfo): string {
  if (info.daysRemaining === 0) return 'D-Day'
  if (info.daysRemaining > 0) return `D-${info.daysRemaining}`
  return `D+${Math.abs(info.daysRemaining)}`
}

interface StepItemProps {
  step: ClosingStep
  onToggleComplete: () => void
  onEdit: () => void
  onDelete: () => void
}

export function StepItem({ step, onToggleComplete, onEdit, onDelete }: StepItemProps) {
  const dday = calculateDday(step.deadline)
  const isCompleted = step.status === 'completed'

  return (
    <div className={`closing-step-item ${isCompleted ? 'completed' : ''}`}>
      <button
        type="button"
        className="closing-step-checkbox"
        onClick={onToggleComplete}
        aria-label={isCompleted ? '미완료로 변경' : '완료로 변경'}
      >
        {isCompleted ? (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect width="18" height="18" rx="4" fill="var(--color-primary)" />
            <path d="M5 9l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="0.5" y="0.5" width="17" height="17" rx="3.5" stroke="var(--color-border)" />
          </svg>
        )}
      </button>

      <div className="closing-step-body">
        <div className="closing-step-top-row">
          <span className={`closing-step-title ${isCompleted ? 'done' : ''}`}>{step.title}</span>
          <div className="closing-step-badges">
            {step.module && (
              <span className="closing-module-badge">{step.module}</span>
            )}
            {!isCompleted && (
              <span className={`closing-dday-badge ${dday.category}`}>
                {ddayLabel(dday)}
              </span>
            )}
          </div>
        </div>
        {(step.assignee || step.description) && (
          <div className="closing-step-meta">
            {step.assignee && (
              <span className="closing-step-assignee">
                <User size={11} aria-hidden="true" />
                {step.assignee}
              </span>
            )}
            {step.description && (
              <span className="closing-step-desc">{step.description}</span>
            )}
          </div>
        )}
      </div>

      <div className="closing-step-actions">
        <button type="button" className="cockpit-icon-btn" onClick={onEdit} aria-label="수정">
          <Pencil size={14} />
        </button>
        <button type="button" className="cockpit-icon-btn" onClick={onDelete} aria-label="삭제">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}
