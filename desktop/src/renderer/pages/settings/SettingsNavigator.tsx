import type { SettingsCategory } from '../../components/settings/types.js'
import {
  Monitor, Sparkles, Palette, Keyboard,
  FolderCog, ShieldCheck, Tag, Command, User, Shield,
} from 'lucide-react'

const CATEGORIES: { id: SettingsCategory; label: string; desc: string; Icon: typeof Monitor }[] = [
  { id: 'app', label: 'App', desc: '알림 및 업데이트', Icon: Monitor },
  { id: 'ai', label: 'AI', desc: '모델, 사고 수준, 연결', Icon: Sparkles },
  { id: 'appearance', label: 'Appearance', desc: '테마, 폰트', Icon: Palette },
  { id: 'input', label: 'Input', desc: '전송 키, 맞춤법 검사', Icon: Keyboard },
  { id: 'workspace', label: 'Workspace', desc: '보안 모드, 도메인', Icon: FolderCog },
  { id: 'permissions', label: 'Permissions', desc: '정책 요약', Icon: ShieldCheck },
  { id: 'labels', label: 'Labels', desc: '세션 레이블 관리', Icon: Tag },
  { id: 'shortcuts', label: 'Shortcuts', desc: '키보드 단축키', Icon: Command },
  { id: 'preferences', label: 'Preferences', desc: '사용자 설정', Icon: User },
  { id: 'policy', label: 'Policy', desc: '정책 규칙 관리', Icon: Shield },
]

interface SettingsNavigatorProps {
  activeCategory: SettingsCategory
  onCategoryChange: (category: SettingsCategory) => void
}

export function SettingsNavigator({ activeCategory, onCategoryChange }: SettingsNavigatorProps) {
  return (
    <nav className="settings-nav" aria-label="설정 카테고리">
      <ul className="settings-nav-list">
        {CATEGORIES.map(({ id, label, desc, Icon }) => (
          <li key={id}>
            <button
              className={`settings-nav-item ${activeCategory === id ? 'active' : ''}`}
              onClick={() => onCategoryChange(id)}
              aria-current={activeCategory === id ? 'page' : undefined}
            >
              <Icon size={18} className="settings-nav-icon" aria-hidden="true" />
              <div className="settings-nav-text">
                <span className="settings-nav-label">{label}</span>
                <span className="settings-nav-desc">{desc}</span>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
