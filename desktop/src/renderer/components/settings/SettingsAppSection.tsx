import { Info } from 'lucide-react'
import { SettingsCard } from '../ui/SettingsCard.js'
import { ToggleSwitch } from '../ui/ToggleSwitch.js'
import { useSettingsStore } from '../../stores/settingsStore.js'

const APP_VERSION = '3.0.0'

export function SettingsAppSection() {
  const { notificationsEnabled, setNotificationsEnabled } = useSettingsStore()

  return (
    <div className="settings-panel page-enter">
      <div className="panel-header">
        <h3>App</h3>
      </div>
      <div className="settings-scroll-area">
        <div className="settings-content">
          <div className="settings-sections">

            <section className="settings-section">
              <div className="section-header-group">
                <h4 className="section-title">Notifications</h4>
              </div>
              <SettingsCard>
                <ToggleSwitch
                  checked={notificationsEnabled}
                  onChange={setNotificationsEnabled}
                  label="데스크톱 알림"
                  description="AI 작업 완료 시 데스크톱 알림을 표시해요"
                />
              </SettingsCard>
            </section>

            <section className="settings-section">
              <div className="section-header-group">
                <h4 className="section-title">About</h4>
              </div>
              <SettingsCard>
                <div className="settings-row">
                  <span className="row-label">Version</span>
                  <div className="row-right">
                    <span className="row-value">v{APP_VERSION}</span>
                  </div>
                </div>
                <div className="settings-row">
                  <span className="row-label">Runtime</span>
                  <div className="row-right">
                    <span className="row-value">Electron</span>
                  </div>
                </div>
              </SettingsCard>
            </section>

            <section className="settings-section">
              <div className="info-card">
                <Info size={16} className="info-card-icon" aria-hidden="true" />
                <p>업데이트 확인과 릴리즈 노트는 GitHub에서 확인할 수 있어요.</p>
              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  )
}
