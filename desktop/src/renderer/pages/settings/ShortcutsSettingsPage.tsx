import { SettingsSection, SettingsCard } from '../../components/settings/primitives/index.js'

const SHORTCUTS = {
  chat: [
    { keys: ['Enter'], action: '메시지 전송' },
    { keys: ['Shift', 'Enter'], action: '줄바꿈' },
  ],
  navigation: [
    { keys: ['←', '→'], action: '사이드바 접기/펼치기' },
  ],
}

function ShortcutRow({ keys, action, separator = '+' }: { keys: string[]; action: string; separator?: string }) {
  return (
    <div className="shortcut-row">
      <span className="shortcut-action">{action}</span>
      <div className="shortcut-keys">
        {keys.map((key, i) => (
          <span key={i}>
            {i > 0 && <span className="shortcut-plus">{separator}</span>}
            <kbd className="kbd">{key}</kbd>
          </span>
        ))}
      </div>
    </div>
  )
}

export function ShortcutsSettingsPage() {
  return (
    <div className="sp-page page-enter">
      <div className="sp-page-header">
        <h3>Shortcuts</h3>
      </div>
      <div className="sp-page-scroll">
        <div className="sp-page-body">
          <div className="sp-page-sections">

            <SettingsSection title="채팅">
              <SettingsCard>
                {SHORTCUTS.chat.map(({ keys, action }) => (
                  <ShortcutRow key={action} keys={keys} action={action} />
                ))}
              </SettingsCard>
            </SettingsSection>

            <SettingsSection title="내비게이션">
              <SettingsCard>
                {SHORTCUTS.navigation.map(({ keys, action }) => (
                  <ShortcutRow key={action} keys={keys} action={action} separator=" / " />
                ))}
              </SettingsCard>
            </SettingsSection>

          </div>
        </div>
      </div>
    </div>
  )
}
