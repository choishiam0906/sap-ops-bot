import { Info } from 'lucide-react'
import {
  SettingsSection,
  SettingsCard,
  SettingsToggle,
  SettingsRow,
} from '../../components/settings/primitives/index.js'
import { useSettingsStore } from '../../stores/settingsStore.js'

const APP_VERSION = '3.0.0'

export function AppSettingsPage() {
  const { notificationsEnabled, setNotificationsEnabled } = useSettingsStore()

  return (
    <div className="sp-page page-enter">
      <div className="sp-page-header">
        <h3>App</h3>
      </div>
      <div className="sp-page-scroll">
        <div className="sp-page-body">
          <div className="sp-page-sections">

            <SettingsSection title="Notifications">
              <SettingsCard>
                <SettingsToggle
                  checked={notificationsEnabled}
                  onChange={setNotificationsEnabled}
                  label="데스크톱 알림"
                  description="AI 작업 완료 시 데스크톱 알림을 표시해요"
                />
              </SettingsCard>
            </SettingsSection>

            <SettingsSection title="About">
              <SettingsCard>
                <SettingsRow label="Version">
                  <span className="row-value">v{APP_VERSION}</span>
                </SettingsRow>
                <SettingsRow label="Runtime">
                  <span className="row-value">Electron</span>
                </SettingsRow>
              </SettingsCard>
            </SettingsSection>

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
