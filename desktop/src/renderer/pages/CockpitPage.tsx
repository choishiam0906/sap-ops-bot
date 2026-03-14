import { useEffect } from 'react'
import { useAppShellStore } from '../stores/appShellStore'
import { useCockpitStore } from '../stores/cockpitStore'
import type { CockpitViewMode } from '../stores/cockpitStore'
import { OverviewPanel } from './cockpit/OverviewPanel'
import { DailyTasksPanel } from './cockpit/DailyTasksPanel'
import { MonthlyClosingPanel } from './cockpit/MonthlyClosingPanel'
import { YearlyClosingPanel } from './cockpit/YearlyClosingPanel'
import { CockpitSubNav } from './cockpit/CockpitSubNav'
import { PlanListPanel } from './cockpit/PlanListPanel'
import { PlanDetailPanel } from './cockpit/PlanDetailPanel'
import { SchedulePanel } from './cockpit/SchedulePanel'
import './CockpitPage.css'

const VALID_VIEW_MODES: CockpitViewMode[] = ['overview', 'daily', 'monthly', 'yearly', 'all-plans', 'schedule']

export function CockpitPage() {
  const subPage = useAppShellStore((s) => s.subPage)
  const viewMode = useCockpitStore((s) => s.viewMode)
  const setViewMode = useCockpitStore((s) => s.setViewMode)

  // Sidebar subPage → cockpitStore.viewMode 동기화
  useEffect(() => {
    const mapped = VALID_VIEW_MODES.includes(subPage as CockpitViewMode)
      ? (subPage as CockpitViewMode)
      : 'overview'
    if (viewMode !== mapped) {
      setViewMode(mapped)
    }
  }, [subPage, viewMode, setViewMode])

  return (
    <div className="cockpit-page">
      {viewMode === 'overview' && <OverviewPanel />}
      {viewMode === 'daily' && <DailyTasksPanel />}
      {viewMode === 'monthly' && <MonthlyClosingPanel />}
      {viewMode === 'yearly' && <YearlyClosingPanel />}
      {viewMode === 'schedule' && <SchedulePanel />}
      {viewMode === 'all-plans' && (
        <>
          <CockpitSubNav />
          <PlanListPanel />
          <PlanDetailPanel />
        </>
      )}
    </div>
  )
}
