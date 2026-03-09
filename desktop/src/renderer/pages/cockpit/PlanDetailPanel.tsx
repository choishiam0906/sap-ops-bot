import { useState } from 'react'
import { Calendar, Pencil, Trash2, FileText } from 'lucide-react'
import type { ClosingStep } from '../../../main/contracts'
import { calculateDday } from '../../../main/types/closing'
import { useCockpitStore } from '../../stores/cockpitStore'
import { usePlan, useSteps, useDeletePlan, useClosingStats } from '../../hooks/useClosingPlans'
import { StepList } from './StepList'
import { StepCreateForm } from './StepCreateForm'
import { PlanEditModal } from './PlanEditModal'
import { StepEditModal } from './StepEditModal'

const PLAN_TYPE_LABEL: Record<string, string> = {
  monthly: '월마감',
  quarterly: '분기마감',
  yearly: '연마감',
  custom: '커스텀',
}

const STATUS_LABEL: Record<string, string> = {
  'in-progress': '진행 중',
  completed: '완료',
  delayed: '지연',
}

function ddayLabel(daysRemaining: number): string {
  if (daysRemaining === 0) return 'D-Day'
  if (daysRemaining > 0) return `D-${daysRemaining}`
  return `D+${Math.abs(daysRemaining)}`
}

export function PlanDetailPanel() {
  const { selectedPlanId, setSelectedPlanId } = useCockpitStore()
  const { data: plan } = usePlan(selectedPlanId)
  const { data: steps = [] } = useSteps(selectedPlanId)
  const { data: stats } = useClosingStats()
  const deletePlan = useDeletePlan()
  const [editingPlan, setEditingPlan] = useState(false)
  const [editingStep, setEditingStep] = useState<ClosingStep | null>(null)

  if (!selectedPlanId || !plan) {
    return (
      <div className="closing-detail-empty">
        <FileText size={48} strokeWidth={1} />
        <h3>Plan을 선택해 주세요</h3>
        <p>좌측 목록에서 마감 Plan을 선택하면 상세 내용을 확인할 수 있어요.</p>
        {stats && (
          <div className="closing-stats-grid">
            <div className="closing-stat-card">
              <span className="closing-stat-value">{stats.totalPlans}</span>
              <span className="closing-stat-label">전체 Plan</span>
            </div>
            <div className="closing-stat-card">
              <span className="closing-stat-value">{stats.inProgressPlans}</span>
              <span className="closing-stat-label">진행 중</span>
            </div>
            <div className="closing-stat-card">
              <span className="closing-stat-value">{stats.overdueSteps}</span>
              <span className="closing-stat-label">지연 Step</span>
            </div>
            <div className="closing-stat-card">
              <span className="closing-stat-value">{stats.imminentSteps}</span>
              <span className="closing-stat-label">긴급 Step</span>
            </div>
          </div>
        )}
      </div>
    )
  }

  // plan은 이 시점에서 non-null — 클로저에서 참조하기 위해 로컬 바인딩
  const currentPlan = plan
  const dday = calculateDday(currentPlan.targetDate)

  function handleDelete() {
    if (!confirm(`"${currentPlan.title}" Plan을 삭제할까요? 하위 Step도 모두 삭제돼요.`)) return
    deletePlan.mutate(currentPlan.id, {
      onSuccess: () => setSelectedPlanId(null),
    })
  }

  return (
    <div className="closing-detail-panel">
      <div className="closing-detail-header">
        <div className="closing-detail-title-row">
          <h2>{currentPlan.title}</h2>
          <span className={`closing-dday-badge large ${dday.category}`}>{ddayLabel(dday.daysRemaining)}</span>
        </div>
        <div className="closing-detail-meta">
          <span className={`closing-status-badge ${currentPlan.status}`}>
            {STATUS_LABEL[currentPlan.status]}
          </span>
          <span className="closing-type-badge">{PLAN_TYPE_LABEL[currentPlan.type]}</span>
          <span className="closing-detail-date">
            <Calendar size={12} aria-hidden="true" />
            {currentPlan.targetDate}
          </span>
          <div className="closing-detail-progress">
            <div className="closing-progress-bar medium">
              <div className="closing-progress-fill" style={{ width: `${currentPlan.progressPercent}%` }} />
            </div>
            <span>{currentPlan.progressPercent}%</span>
          </div>
        </div>
        {currentPlan.description && <p className="closing-detail-desc">{currentPlan.description}</p>}
        <div className="closing-detail-actions">
          <button type="button" className="closing-btn compact" onClick={() => setEditingPlan(true)}>
            <Pencil size={13} /> 수정
          </button>
          <button type="button" className="closing-btn compact danger" onClick={handleDelete}>
            <Trash2 size={13} /> 삭제
          </button>
        </div>
      </div>

      <div className="closing-detail-steps">
        <h3>
          Step 목록
          <span className="closing-step-count">{steps.filter((s) => s.status === 'completed').length}/{steps.length}</span>
        </h3>
        <StepList steps={steps} planId={currentPlan.id} onEditStep={setEditingStep} />
        <StepCreateForm planId={currentPlan.id} defaultDeadline={currentPlan.targetDate} />
      </div>

      {editingPlan && <PlanEditModal plan={currentPlan} onClose={() => setEditingPlan(false)} />}
      {editingStep && <StepEditModal step={editingStep} onClose={() => setEditingStep(null)} />}
    </div>
  )
}
