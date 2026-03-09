import { Calendar, CheckCircle2, Clock, AlertTriangle } from 'lucide-react'
import type { ClosingPlan, DdayInfo } from '../../../main/contracts'
import { calculateDday } from '../../../main/types/closing'

const PLAN_TYPE_LABEL: Record<string, string> = {
  monthly: '월마감',
  quarterly: '분기마감',
  yearly: '연마감',
  custom: '커스텀',
}

const STATUS_ICON = {
  'in-progress': Clock,
  completed: CheckCircle2,
  delayed: AlertTriangle,
} as const

function ddayBadgeClass(info: DdayInfo): string {
  switch (info.category) {
    case 'overdue': return 'closing-dday-badge overdue'
    case 'imminent': return 'closing-dday-badge imminent'
    case 'upcoming': return 'closing-dday-badge upcoming'
    case 'future': return 'closing-dday-badge future'
  }
}

function ddayLabel(info: DdayInfo): string {
  if (info.daysRemaining === 0) return 'D-Day'
  if (info.daysRemaining > 0) return `D-${info.daysRemaining}`
  return `D+${Math.abs(info.daysRemaining)}`
}

interface PlanItemProps {
  plan: ClosingPlan
  isSelected: boolean
  onClick: () => void
}

export function PlanItem({ plan, isSelected, onClick }: PlanItemProps) {
  const dday = calculateDday(plan.targetDate)
  const StatusIcon = STATUS_ICON[plan.status]

  return (
    <button
      type="button"
      className={`closing-plan-item ${isSelected ? 'active' : ''}`}
      onClick={onClick}
    >
      <div className="closing-plan-item-top">
        <StatusIcon size={14} className={`closing-status-icon ${plan.status}`} aria-hidden="true" />
        <span className="closing-plan-title">{plan.title}</span>
        <span className={ddayBadgeClass(dday)}>{ddayLabel(dday)}</span>
      </div>
      <div className="closing-plan-item-bottom">
        <span className="closing-plan-type-badge">{PLAN_TYPE_LABEL[plan.type] ?? plan.type}</span>
        <Calendar size={11} aria-hidden="true" />
        <span className="closing-plan-date">{plan.targetDate}</span>
        <div className="closing-progress-bar">
          <div
            className="closing-progress-fill"
            style={{ width: `${plan.progressPercent}%` }}
          />
        </div>
        <span className="closing-progress-text">{plan.progressPercent}%</span>
      </div>
    </button>
  )
}
