import { useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import type { ClosingPlan } from '../../../main/contracts'
import { calculateDday } from '../../../main/types/closing'
import { useCockpitStore } from '../../stores/cockpitStore'
import { usePlans } from '../../hooks/useClosingPlans'
import { PlanItem } from './PlanItem'
import { PlanCreateModal } from './PlanCreateModal'

interface GroupedPlans {
  overdue: ClosingPlan[]
  imminent: ClosingPlan[]
  upcoming: ClosingPlan[]
  future: ClosingPlan[]
  completed: ClosingPlan[]
}

const GROUP_LABELS: Record<string, string> = {
  overdue: '지연',
  imminent: '긴급 (0-3일)',
  upcoming: '예정 (4-14일)',
  future: '여유 (15일+)',
  completed: '완료',
}

export function PlanListPanel() {
  const { data: plans = [] } = usePlans()
  const { selectedPlanId, setSelectedPlanId, filter, searchQuery, setSearchQuery } = useCockpitStore()
  const [showCreate, setShowCreate] = useState(false)

  const filteredPlans = useMemo(() => {
    let result = plans
    if (filter !== 'all') {
      result = result.filter((p) => p.status === filter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((p) => p.title.toLowerCase().includes(q))
    }
    return result
  }, [plans, filter, searchQuery])

  const groups = useMemo<GroupedPlans>(() => {
    const g: GroupedPlans = { overdue: [], imminent: [], upcoming: [], future: [], completed: [] }
    for (const plan of filteredPlans) {
      if (plan.status === 'completed') {
        g.completed.push(plan)
      } else {
        const dday = calculateDday(plan.targetDate)
        g[dday.category].push(plan)
      }
    }
    return g
  }, [filteredPlans])

  const groupOrder: (keyof GroupedPlans)[] = ['overdue', 'imminent', 'upcoming', 'future', 'completed']

  return (
    <div className="closing-plan-list-panel">
      <div className="closing-plan-list-header">
        <div className="closing-search-box">
          <Search size={14} aria-hidden="true" />
          <input
            className="closing-search-input"
            placeholder="Plan 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="closing-btn primary compact"
          onClick={() => setShowCreate(true)}
        >
          <Plus size={14} />
          새 Plan
        </button>
      </div>

      <div className="closing-plan-list-body">
        {filteredPlans.length === 0 && (
          <div className="closing-empty">
            {searchQuery ? '검색 결과가 없어요.' : 'Plan이 없어요. 새로 만들어 보세요.'}
          </div>
        )}

        {groupOrder.map((key) => {
          const items = groups[key]
          if (items.length === 0) return null
          return (
            <div key={key} className="closing-plan-group">
              <div className={`closing-plan-group-label ${key}`}>
                {GROUP_LABELS[key]}
                <span className="closing-plan-group-count">{items.length}</span>
              </div>
              {items.map((plan) => (
                <PlanItem
                  key={plan.id}
                  plan={plan}
                  isSelected={selectedPlanId === plan.id}
                  onClick={() => setSelectedPlanId(plan.id)}
                />
              ))}
            </div>
          )
        })}
      </div>

      {showCreate && <PlanCreateModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}
