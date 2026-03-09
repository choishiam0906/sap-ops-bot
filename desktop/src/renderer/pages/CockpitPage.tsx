import { CockpitSubNav } from './cockpit/CockpitSubNav'
import { PlanListPanel } from './cockpit/PlanListPanel'
import { PlanDetailPanel } from './cockpit/PlanDetailPanel'
import './CockpitPage.css'

export function CockpitPage() {
  return (
    <div className="cockpit-page">
      <CockpitSubNav />
      <PlanListPanel />
      <PlanDetailPanel />
    </div>
  )
}
