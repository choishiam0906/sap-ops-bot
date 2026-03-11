import { useState } from 'react'
import { CheckCircle2, Circle, Calendar } from 'lucide-react'
import { usePlans, useSteps, useUpdateStep } from '../../hooks/useClosingPlans'
import { useRoutinePlanIds } from '../../hooks/useRoutineTemplates'
import type { ClosingPlan, ClosingStep } from '../../../main/contracts'
import { PageHeader } from '../../components/ui/PageHeader.js'

export function DailyTasksPanel() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10))
  const { data: planIds } = useRoutinePlanIds(selectedDate)
  const { data: allPlans } = usePlans()

  const dailyPlans = allPlans?.filter(
    (p) => planIds?.includes(p.id) && p.title.startsWith('[Daily]')
  ) ?? []

  return (
    <div className="cockpit-routine-panel">
      <PageHeader
        title="Daily Tasks"
        description="일일 마감 체크리스트를 확인하고 처리하세요"
        actions={
          <div className="cockpit-date-picker">
            <Calendar size={16} />
            <input
              type="date"
              className="closing-input"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        }
      />

      {dailyPlans.length === 0 ? (
        <div className="closing-empty">
          <p>{selectedDate} 에 생성된 Daily Plan이 없어요.</p>
          <p className="cockpit-empty-hint">앱 시작 시 자동으로 생성되거나, Overview에서 수동 실행할 수 있어요.</p>
        </div>
      ) : (
        dailyPlans.map((plan) => (
          <DailyPlanCard key={plan.id} plan={plan} />
        ))
      )}
    </div>
  )
}

function DailyPlanCard({ plan }: { plan: ClosingPlan }) {
  const { data: steps } = useSteps(plan.id)
  const updateStep = useUpdateStep()
  const total = steps?.length ?? 0
  const completed = steps?.filter((s) => s.status === 'completed').length ?? 0
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0

  function handleToggle(step: ClosingStep) {
    const newStatus = step.status === 'completed' ? 'pending' : 'completed'
    updateStep.mutate({ stepId: step.id, update: { status: newStatus } })
  }

  return (
    <div className="cockpit-routine-card">
      <div className="cockpit-routine-card-header">
        <span className="cockpit-routine-card-title">{plan.title}</span>
        <span className="closing-progress-text">{completed}/{total}</span>
      </div>
      <div className="closing-progress-bar medium">
        <div className="closing-progress-fill" style={{ width: `${percent}%` }} />
      </div>
      <div className="closing-step-list">
        {steps?.map((step) => (
          <div
            key={step.id}
            className={`closing-step-item ${step.status === 'completed' ? 'completed' : ''}`}
          >
            <button
              className="closing-step-checkbox"
              onClick={() => handleToggle(step)}
              aria-label={step.status === 'completed' ? '완료 해제' : '완료 처리'}
            >
              {step.status === 'completed'
                ? <CheckCircle2 size={18} className="closing-status-icon completed" />
                : <Circle size={18} className="closing-status-icon" />
              }
            </button>
            <div className="closing-step-body">
              <div className="closing-step-top-row">
                <span className={`closing-step-title ${step.status === 'completed' ? 'done' : ''}`}>
                  {step.title}
                </span>
                {step.module && (
                  <span className="closing-module-badge">{String(step.module).toUpperCase()}</span>
                )}
              </div>
              {step.description && (
                <div className="closing-step-meta">
                  <span className="closing-step-desc">{step.description}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
