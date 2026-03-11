import { useState, useMemo } from 'react'
import { CheckCircle2, Circle, ChevronDown, ChevronRight } from 'lucide-react'
import { usePlans, useSteps, useUpdateStep } from '../../hooks/useClosingPlans'
import type { ClosingPlan, ClosingStep } from '../../../main/contracts'
import { PageHeader } from '../../components/ui/PageHeader.js'

export function MonthlyClosingPanel() {
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  )
  const { data: allPlans } = usePlans()

  const monthlyPlans = allPlans?.filter(
    (p) => p.title.startsWith('[Monthly]') && p.title.includes(`${Number(selectedMonth.split('-')[1])}월`)
  ) ?? []

  return (
    <div className="cockpit-routine-panel">
      <PageHeader
        title="월별 마감"
        description="월간 결산 체크리스트를 관리하세요"
        actions={
          <input
            type="month"
            className="closing-input"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
        }
      />

      {monthlyPlans.length === 0 ? (
        <div className="closing-empty">
          <p>{selectedMonth}에 해당하는 월별 마감 Plan이 없어요.</p>
          <p className="cockpit-empty-hint">매월 trigger day(기본 25일) 이후 앱 시작 시 자동 생성돼요.</p>
        </div>
      ) : (
        monthlyPlans.map((plan) => (
          <MonthlyPlanCard key={plan.id} plan={plan} />
        ))
      )}
    </div>
  )
}

function MonthlyPlanCard({ plan }: { plan: ClosingPlan }) {
  const { data: steps } = useSteps(plan.id)
  const updateStep = useUpdateStep()
  const total = steps?.length ?? 0
  const completed = steps?.filter((s) => s.status === 'completed').length ?? 0
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0

  // 모듈별 그룹핑
  const grouped = useMemo(() => {
    if (!steps) return new Map<string, ClosingStep[]>()
    const map = new Map<string, ClosingStep[]>()
    for (const step of steps) {
      const mod = step.module ? String(step.module).toUpperCase() : '기타'
      const arr = map.get(mod) ?? []
      arr.push(step)
      map.set(mod, arr)
    }
    return map
  }, [steps])

  function handleToggle(step: ClosingStep) {
    const newStatus = step.status === 'completed' ? 'pending' : 'completed'
    updateStep.mutate({ stepId: step.id, update: { status: newStatus } })
  }

  return (
    <div className="cockpit-routine-card">
      <div className="cockpit-routine-card-header">
        <span className="cockpit-routine-card-title">{plan.title}</span>
        <span className="closing-progress-text">{completed}/{total} ({percent}%)</span>
      </div>
      <div className="closing-progress-bar medium">
        <div className="closing-progress-fill" style={{ width: `${percent}%` }} />
      </div>

      {[...grouped.entries()].map(([module, moduleSteps]) => (
        <ModuleGroup
          key={module}
          module={module}
          steps={moduleSteps}
          onToggle={handleToggle}
        />
      ))}
    </div>
  )
}

function ModuleGroup({ module, steps, onToggle }: {
  module: string
  steps: ClosingStep[]
  onToggle: (step: ClosingStep) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const completed = steps.filter((s) => s.status === 'completed').length

  return (
    <div className="cockpit-module-group">
      <button
        className="cockpit-module-group-header"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <span className="closing-module-badge">{module}</span>
        <span className="cockpit-module-count">{completed}/{steps.length}</span>
      </button>
      {expanded && (
        <div className="closing-step-list">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`closing-step-item ${step.status === 'completed' ? 'completed' : ''}`}
            >
              <button
                className="closing-step-checkbox"
                onClick={() => onToggle(step)}
                aria-label={step.status === 'completed' ? '완료 해제' : '완료 처리'}
              >
                {step.status === 'completed'
                  ? <CheckCircle2 size={18} className="closing-status-icon completed" />
                  : <Circle size={18} className="closing-status-icon" />
                }
              </button>
              <div className="closing-step-body">
                <span className={`closing-step-title ${step.status === 'completed' ? 'done' : ''}`}>
                  {step.title}
                </span>
                {step.description && (
                  <div className="closing-step-meta">
                    <span className="closing-step-desc">{step.description}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
