import { Tag } from 'lucide-react'

export function LabelsSettingsPage() {
  return (
    <div className="sp-page page-enter">
      <div className="sp-page-header">
        <h3>Labels</h3>
      </div>
      <div className="sp-page-scroll">
        <div className="sp-page-body">
          <div className="sp-page-sections">
            <section className="settings-section">
              <div className="coming-soon-card">
                <Tag size={40} className="coming-soon-icon" aria-hidden="true" />
                <h4>준비 중이에요</h4>
                <p>세션 레이블 기능은 향후 업데이트에서 추가될 예정이에요.</p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
