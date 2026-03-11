import { AlertTriangle, CheckCircle2, Clock, ListTodo, Play } from 'lucide-react'
import { useClosingStats, usePlans, useSteps } from '../../hooks/useClosingPlans'
import { useExecuteRoutinesNow, useRoutinePlanIds } from '../../hooks/useRoutineTemplates'
import { calculateDday } from '../../../main/types/closing'
import type { ClosingStep } from '../../../main/contracts'
import { PageHeader } from '../../components/ui/PageHeader.js'
import { Button } from '../../components/ui/Button.js'

const today = new Date().toISOString().slice(0, 10)

export function OverviewPanel() {
  const { data: stats } = useClosingStats()
  const { data: plans } = usePlans()
  const executeNow = useExecuteRoutinesNow()
  const { data: todayPlanIds } = useRoutinePlanIds(today)

  // 오늘의 Daily Plan 찾기
  const todayPlans = plans?.filter((p) => todayPlanIds?.includes(p.id)) ?? []

  // 긴급 Step 계산 (D-day ≤ 3일)
  const imminentPlans = plans?.filter((p) => {
    if (p.status === 'completed') return false
    const dday = calculateDday(p.targetDate)
    return dday.category === 'imminent' || dday.category === 'overdue'
  }) ?? []

  const completionRate = stats && stats.totalSteps > 0
    ? Math.round((stats.completedSteps / stats.totalSteps) * 100)
    : 0

  return (
    <div className="cockpit-overview-panel">
      <PageHeader
        title="Overview"
        description="운영 현황과 일일 체크리스트를 한눈에 확인하세요"
        actions={
          <Button
            variant="secondary"
            size="sm"
            loading={executeNow.isPending}
            onClick={() => executeNow.mutate()}
          >
            <Play size={14} />
            루틴 수동 실행
          </Button>
        }
      />

      {/* 통계 카드 */}
      <div className="cockpit-overview-stats">
        <StatCard
          icon={<ListTodo size={20} />}
          value={stats?.inProgressPlans ?? 0}
          label="진행 중인 Plan"
          color="var(--color-info)"
        />
        <StatCard
          icon={<Clock size={20} />}
          value={stats?.overdueSteps ?? 0}
          label="지연된 Step"
          color="var(--color-error)"
        />
        <StatCard
          icon={<AlertTriangle size={20} />}
          value={stats?.imminentSteps ?? 0}
          label="임박 (D-3 이내)"
          color="var(--color-warning)"
        />
        <StatCard
          icon={<CheckCircle2 size={20} />}
          value={`${completionRate}%`}
          label="전체 완료율"
          color="var(--color-success)"
        />
      </div>

      {/* 오늘의 Daily Plan */}
      {todayPlans.length > 0 && (
        <section className="cockpit-overview-section">
          <h3>오늘의 체크리스트</h3>
          {todayPlans.map((plan) => (
            <TodayPlanSummary key={plan.id} planId={plan.id} title={plan.title} />
          ))}
        </section>
      )}

      {/* 긴급 알림 */}
      {imminentPlans.length > 0 && (
        <section className="cockpit-overview-section">
          <h3>긴급 알림</h3>
          <div className="cockpit-overview-alerts">
            {imminentPlans.slice(0, 5).map((plan) => {
              const dday = calculateDday(plan.targetDate)
              return (
                <div key={plan.id} className="cockpit-alert-item">
                  <span className={`closing-dday-badge ${dday.category}`}>
                    {dday.isOverdue ? `D+${Math.abs(dday.daysRemaining)}` : `D-${dday.daysRemaining}`}
                  </span>
                  <span className="cockpit-alert-title">{plan.title}</span>
                  <span className="cockpit-alert-progress">{plan.progressPercent}%</span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {executeNow.isSuccess && (
        <div className="cockpit-overview-toast">
          생성 {executeNow.data.created}건, 스킵 {executeNow.data.skipped}건
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, value, label, color }: {
  icon: React.ReactNode
  value: number | string
  label: string
  color: string
}) {
  return (
    <div className="cockpit-stat-card">
      <div className="cockpit-stat-icon" style={{ color }}>{icon}</div>
      <div className="cockpit-stat-value">{value}</div>
      <div className="cockpit-stat-label">{label}</div>
    </div>
  )
}

function TodayPlanSummary({ planId, title }: { planId: string; title: string }) {
  const { data: steps } = useSteps(planId)
  const pending = steps?.filter((s: ClosingStep) => s.status !== 'completed') ?? []
  const total = steps?.length ?? 0
  const done = total - pending.length

  return (
    <div className="cockpit-today-plan">
      <div className="cockpit-today-plan-header">
        <span className="cockpit-today-plan-title">{title}</span>
        <span className="closing-progress-text">{done}/{total}</span>
      </div>
      <div className="closing-progress-bar medium">
        <div
          className="closing-progress-fill"
          style={{ width: total > 0 ? `${(done / total) * 100}%` : '0%' }}
        />
      </div>
      {pending.slice(0, 3).map((step: ClosingStep) => (
        <div key={step.id} className="cockpit-today-step">
          <span className="cockpit-today-step-dot" />
          <span>{step.title}</span>
          {step.module && <span className="closing-module-badge">{step.module.toUpperCase()}</span>}
        </div>
      ))}
      {pending.length > 3 && (
        <div className="cockpit-today-more">외 {pending.length - 3}건</div>
      )}
    </div>
  )
}
