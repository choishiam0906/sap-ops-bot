import { LayoutDashboard, Clock, AlertTriangle, CalendarDays, AlertCircle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAppShellStore } from '../../stores/appShellStore.js'
import type { CockpitSubPage } from '../../stores/appShellStore.js'

interface QueueItem {
  id: CockpitSubPage
  label: string
  Icon: LucideIcon
}

const QUEUE_ITEMS: QueueItem[] = [
  { id: 'overview', label: 'Overview', Icon: LayoutDashboard },
  { id: 'pending', label: '승인 대기', Icon: Clock },
  { id: 'high-risk', label: '고위험 분석', Icon: AlertTriangle },
  { id: 'today', label: '오늘 작업', Icon: CalendarDays },
  { id: 'issues', label: '최근 이슈', Icon: AlertCircle },
]

export function CockpitSubNav() {
  const subPage = useAppShellStore((state) => state.subPage) as CockpitSubPage | null
  const setSubPage = useAppShellStore((state) => state.setSubPage)
  const activeQueue = subPage ?? 'overview'

  return (
    <aside className="cockpit-q-subnav">
      <nav aria-label="Cockpit 큐 내비게이션">
        {QUEUE_ITEMS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            className={`cockpit-q-subnav-item ${activeQueue === id ? 'active' : ''}`}
            onClick={() => setSubPage(id)}
            aria-current={activeQueue === id ? 'page' : undefined}
          >
            <Icon size={16} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </aside>
  )
}
