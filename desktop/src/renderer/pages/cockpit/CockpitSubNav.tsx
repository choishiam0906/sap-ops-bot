import { LayoutList, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useCockpitStore } from '../../stores/cockpitStore'
import type { PlanFilter } from '../../stores/cockpitStore'
import { useClosingStats } from '../../hooks/useClosingPlans'

interface FilterItem {
  id: PlanFilter
  label: string
  Icon: LucideIcon
  countKey?: keyof NonNullable<ReturnType<typeof useClosingStats>['data']>
}

const FILTER_ITEMS: FilterItem[] = [
  { id: 'all', label: '전체 Plan', Icon: LayoutList, countKey: 'totalPlans' },
  { id: 'in-progress', label: '진행 중', Icon: Loader2, countKey: 'inProgressPlans' },
  { id: 'completed', label: '완료', Icon: CheckCircle2, countKey: 'completedPlans' },
  { id: 'delayed', label: '지연', Icon: AlertTriangle, countKey: 'delayedPlans' },
]

export function CockpitSubNav() {
  const { filter, setFilter } = useCockpitStore()
  const { data: stats } = useClosingStats()

  return (
    <aside className="closing-subnav">
      <div className="closing-subnav-title">마감 관리</div>
      <nav aria-label="마감 필터 네비게이션">
        {FILTER_ITEMS.map(({ id, label, Icon, countKey }) => {
          const count = stats && countKey ? stats[countKey] : undefined
          return (
            <button
              key={id}
              type="button"
              className={`closing-subnav-item ${filter === id ? 'active' : ''}`}
              onClick={() => setFilter(id)}
              aria-current={filter === id ? 'page' : undefined}
            >
              <Icon size={15} aria-hidden="true" />
              <span>{label}</span>
              {count !== undefined && count > 0 && (
                <span className="closing-subnav-badge">{count}</span>
              )}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
