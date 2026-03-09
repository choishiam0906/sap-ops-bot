import {
  SettingsSection,
  SettingsCard,
  SettingsToggle,
  SettingsSelect,
} from '../../components/settings/primitives/index.js'
import { useSettingsStore } from '../../stores/settingsStore.js'

export function InputSettingsPage() {
  const {
    sendKey, setSendKey,
    spellCheck, setSpellCheck,
    autoCapitalization, setAutoCapitalization,
  } = useSettingsStore()

  return (
    <div className="sp-page page-enter">
      <div className="sp-page-header">
        <h3>Input</h3>
      </div>
      <div className="sp-page-scroll">
        <div className="sp-page-body">
          <div className="sp-page-sections">

            <SettingsSection title="Typing" description="입력 방식을 설정해요">
              <SettingsCard>
                <SettingsToggle
                  checked={autoCapitalization}
                  onChange={setAutoCapitalization}
                  label="자동 대문자"
                  description="문장 시작 시 자동으로 대문자로 변환해요"
                />
                <SettingsToggle
                  checked={spellCheck}
                  onChange={setSpellCheck}
                  label="맞춤법 검사"
                  description="입력 시 맞춤법을 자동으로 검사해요"
                />
              </SettingsCard>
            </SettingsSection>

            <SettingsSection title="Sending" description="메시지 전송 방식을 선택해요">
              <SettingsCard>
                <SettingsSelect
                  label="메시지 전송 키"
                  value={sendKey}
                  onValueChange={(v) => setSendKey(v as 'enter' | 'ctrl-enter')}
                  options={[
                    { value: 'enter', label: 'Enter', description: 'Shift+Enter로 줄바꿈' },
                    { value: 'ctrl-enter', label: 'Ctrl + Enter', description: 'Enter로 줄바꿈' },
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
