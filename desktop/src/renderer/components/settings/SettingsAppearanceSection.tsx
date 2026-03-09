import { Sun, Moon, Monitor } from 'lucide-react'
import { SettingsCard } from '../ui/SettingsCard.js'
import { useSettingsStore } from '../../stores/settingsStore.js'

const THEME_OPTIONS = [
  { value: 'system' as const, label: '시스템', Icon: Monitor },
  { value: 'light' as const, label: '라이트', Icon: Sun },
  { value: 'dark' as const, label: '다크', Icon: Moon },
]

const FONT_OPTIONS = [
  { value: 'pretendard' as const, label: 'Pretendard' },
  { value: 'system' as const, label: 'System' },
]

export function SettingsAppearanceSection() {
  const { theme, setTheme, fontFamily, setFontFamily } = useSettingsStore()

  return (
    <div className="settings-panel page-enter">
      <div className="panel-header">
        <h3>Appearance</h3>
      </div>
      <div className="settings-scroll-area">
        <div className="settings-content">
          <div className="settings-sections">

            <section className="settings-section">
              <div className="section-header-group">
                <h4 className="section-title">Default Theme</h4>
              </div>
              <SettingsCard>
                <div className="settings-row">
                  <span className="row-label">Mode</span>
                  <div className="row-right">
                    <div className="segmented-control" role="radiogroup" aria-label="테마 선택">
                      {THEME_OPTIONS.map(({ value, label, Icon }) => (
                        <button
                          key={value}
                          type="button"
                          role="radio"
                          aria-checked={theme === value}
                          className={`segment-btn ${theme === value ? 'active' : ''}`}
                          onClick={() => setTheme(value)}
                        >
                          <Icon size={16} className="segment-btn-icon" aria-hidden="true" />
                          <span>{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="settings-row">
                  <span className="row-label">Font</span>
                  <div className="row-right">
                    <div className="segmented-control" role="radiogroup" aria-label="폰트 선택">
                      {FONT_OPTIONS.map(({ value, label }) => (
                        <button
                          key={value}
                          type="button"
                          role="radio"
                          aria-checked={fontFamily === value}
                          className={`segment-btn ${fontFamily === value ? 'active' : ''}`}
                          onClick={() => setFontFamily(value)}
                        >
                          <span>{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </SettingsCard>
            </section>

          </div>
        </div>
      </div>
    </div>
  )
}
