import { Tag, Command } from 'lucide-react'
import type { SettingsCategory } from './types.js'
import { SettingsCard } from '../ui/SettingsCard.js'
import { ToggleSwitch } from '../ui/ToggleSwitch.js'
import { DropdownSelect } from '../ui/DropdownSelect.js'
import { useSettingsStore } from '../../stores/settingsStore.js'

const SHORTCUTS = {
  chat: [
    { keys: ['Enter'], action: '메시지 전송' },
    { keys: ['Shift', 'Enter'], action: '줄바꿈' },
  ],
  navigation: [
    { keys: ['←', '→'], action: '사이드바 접기/펼치기' },
  ],
}

interface SettingsInputSectionProps {
  activeCategory: SettingsCategory
}

export function SettingsInputSection({ activeCategory }: SettingsInputSectionProps) {
  const {
    sendKey, setSendKey,
    spellCheck, setSpellCheck,
    autoCapitalization, setAutoCapitalization,
    userName, setUserName,
    language, setLanguage,
  } = useSettingsStore()

  if (activeCategory === 'input') {
    return (
      <div className="settings-panel page-enter">
        <div className="panel-header">
          <h3>Input</h3>
        </div>
        <div className="settings-scroll-area">
          <div className="settings-content">
            <div className="settings-sections">

              <section className="settings-section">
                <div className="section-header-group">
                  <h4 className="section-title">Typing</h4>
                  <p className="section-desc">입력 방식을 설정해요</p>
                </div>
                <SettingsCard>
                  <ToggleSwitch
                    checked={autoCapitalization}
                    onChange={setAutoCapitalization}
                    label="자동 대문자"
                    description="문장 시작 시 자동으로 대문자로 변환해요"
                  />
                  <ToggleSwitch
                    checked={spellCheck}
                    onChange={setSpellCheck}
                    label="맞춤법 검사"
                    description="입력 시 맞춤법을 자동으로 검사해요"
                  />
                </SettingsCard>
              </section>

              <section className="settings-section">
                <div className="section-header-group">
                  <h4 className="section-title">Sending</h4>
                  <p className="section-desc">메시지 전송 방식을 선택해요</p>
                </div>
                <SettingsCard>
                  <div className="settings-row">
                    <span className="row-label">메시지 전송 키</span>
                    <div className="row-right">
                      <DropdownSelect
                        aria-label="메시지 전송 키"
                        value={sendKey}
                        onValueChange={(v) => setSendKey(v as 'enter' | 'ctrl-enter')}
                        options={[
                          { value: 'enter', label: 'Enter', description: 'Shift+Enter로 줄바꿈' },
                          { value: 'ctrl-enter', label: 'Ctrl + Enter', description: 'Enter로 줄바꿈' },
                        ]}
                      />
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

  if (activeCategory === 'labels') {
    return (
      <div className="settings-panel page-enter">
        <div className="panel-header">
          <h3>Labels</h3>
        </div>
        <div className="settings-scroll-area">
          <div className="settings-content">
            <div className="settings-sections">
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

  if (activeCategory === 'shortcuts') {
    return (
      <div className="settings-panel page-enter">
        <div className="panel-header">
          <h3>Shortcuts</h3>
        </div>
        <div className="settings-scroll-area">
          <div className="settings-content">
            <div className="settings-sections">

              <section className="settings-section">
                <div className="section-header-group">
                  <h4 className="section-title">채팅</h4>
                </div>
                <SettingsCard>
                  {SHORTCUTS.chat.map(({ keys, action }) => (
                    <div key={action} className="shortcut-row">
                      <span className="shortcut-action">{action}</span>
                      <div className="shortcut-keys">
                        {keys.map((key, i) => (
                          <span key={i}>
                            {i > 0 && <span className="shortcut-plus">+</span>}
                            <kbd className="kbd">{key}</kbd>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </SettingsCard>
              </section>

              <section className="settings-section">
                <div className="section-header-group">
                  <h4 className="section-title">내비게이션</h4>
                </div>
                <SettingsCard>
                  {SHORTCUTS.navigation.map(({ keys, action }) => (
                    <div key={action} className="shortcut-row">
                      <span className="shortcut-action">{action}</span>
                      <div className="shortcut-keys">
                        {keys.map((key, i) => (
                          <span key={i}>
                            {i > 0 && <span className="shortcut-plus"> / </span>}
                            <kbd className="kbd">{key}</kbd>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </SettingsCard>
              </section>

            </div>
          </div>
        </div>
      </div>
    )
  }

  // preferences
  return (
    <div className="settings-panel page-enter">
      <div className="panel-header">
        <h3>Preferences</h3>
      </div>
      <div className="settings-scroll-area">
        <div className="settings-content">
          <div className="settings-sections">

            <section className="settings-section">
              <div className="section-header-group">
                <h4 className="section-title">기본 정보</h4>
              </div>
              <SettingsCard>
                <div className="settings-row">
                  <label className="row-label" htmlFor="user-name-input">이름</label>
                  <div className="row-right">
                    <input
                      id="user-name-input"
                      type="text"
                      className="settings-input"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="이름을 입력하세요"
                    />
                  </div>
                </div>
                <div className="settings-row">
                  <span className="row-label">언어</span>
                  <div className="row-right">
                    <DropdownSelect
                      value={language}
                      onValueChange={(v) => setLanguage(v as 'ko' | 'en')}
                      options={[
                        { value: 'ko', label: '한국어' },
                        { value: 'en', label: 'English' },
                      ]}
                    />
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
