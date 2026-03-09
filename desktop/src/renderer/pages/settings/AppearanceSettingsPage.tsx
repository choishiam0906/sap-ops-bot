import { Sun, Moon, Monitor } from 'lucide-react'
import {
  SettingsSection,
  SettingsCard,
  SettingsRow,
  SettingsSegmentedControl,
} from '../../components/settings/primitives/index.js'
import { useSettingsStore } from '../../stores/settingsStore.js'

const THEME_OPTIONS = [
  { value: 'system' as const, label: '시스템', icon: <Monitor size={16} /> },
  { value: 'light' as const, label: '라이트', icon: <Sun size={16} /> },
  { value: 'dark' as const, label: '다크', icon: <Moon size={16} /> },
]

const FONT_OPTIONS = [
  { value: 'pretendard' as const, label: 'Pretendard' },
  { value: 'system' as const, label: 'System' },
]

export function AppearanceSettingsPage() {
  const { theme, setTheme, fontFamily, setFontFamily } = useSettingsStore()

  return (
    <div className="sp-page page-enter">
      <div className="sp-page-header">
        <h3>Appearance</h3>
      </div>
      <div className="sp-page-scroll">
        <div className="sp-page-body">
          <div className="sp-page-sections">

            <SettingsSection title="Default Theme">
              <SettingsCard>
                <SettingsRow label="Mode">
                  <SettingsSegmentedControl
                    value={theme}
                    options={THEME_OPTIONS}
                    onChange={setTheme}
                    aria-label="테마 선택"
                  />
                </SettingsRow>
                <SettingsRow label="Font">
                  <SettingsSegmentedControl
                    value={fontFamily}
                    options={FONT_OPTIONS}
                    onChange={setFontFamily}
                    aria-label="폰트 선택"
                  />
                </SettingsRow>
              </SettingsCard>
            </SettingsSection>

          </div>
        </div>
      </div>
    </div>
  )
}
