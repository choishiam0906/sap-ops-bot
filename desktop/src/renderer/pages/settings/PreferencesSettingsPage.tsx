import {
  SettingsSection,
  SettingsCard,
  SettingsInput,
  SettingsSelect,
} from '../../components/settings/primitives/index.js'
import { useSettingsStore } from '../../stores/settingsStore.js'

export function PreferencesSettingsPage() {
  const { userName, setUserName, language, setLanguage } = useSettingsStore()

  return (
    <div className="sp-page page-enter">
      <div className="sp-page-header">
        <h3>Preferences</h3>
      </div>
      <div className="sp-page-scroll">
        <div className="sp-page-body">
          <div className="sp-page-sections">

            <SettingsSection title="기본 정보">
              <SettingsCard>
                <SettingsInput
                  label="이름"
                  value={userName}
                  onChange={setUserName}
                  placeholder="이름을 입력하세요"
                  id="user-name-input"
                />
                <SettingsSelect
                  label="언어"
                  value={language}
                  onValueChange={(v) => setLanguage(v as 'ko' | 'en')}
                  options={[
                    { value: 'ko', label: '한국어' },
                    { value: 'en', label: 'English' },
                  ]}
                />
              </SettingsCard>
            </SettingsSection>

          </div>
        </div>
      </div>
    </div>
  )
}
