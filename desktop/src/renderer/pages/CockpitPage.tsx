import { useAppShellStore } from '../stores/appShellStore'
import type { CockpitSubPage } from '../stores/appShellStore'
import { CockpitSubNav } from './cockpit/CockpitSubNav'
import { OverviewView } from './cockpit/OverviewView'
import { QueueView } from './cockpit/QueueView'
import './CockpitPage.css'

export function CockpitPage() {
  const subPage = useAppShellStore((state) => state.subPage) as CockpitSubPage | null
  const queue = subPage ?? 'overview'

  return (
    <div className="cockpit-page">
      <CockpitSubNav />
      <div className="cockpit-main">
        <div className="cockpit-header">
          <div>
            <h1 className="page-title">SAP Cockpit</h1>
            <p className="cockpit-header-copy">
              반복 문의, 장애 대응, CBO 분석을 업무 시작 화면에서 바로 열 수 있도록 구성된 운영 허브입니다.
            </p>
          </div>
        </div>

        {queue === 'overview' ? <OverviewView /> : <QueueView />}
      </div>
    </div>
  )
}
