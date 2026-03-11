import { useAppShellStore } from '../stores/appShellStore.js'
import type { SapAssistantSubPage } from '../stores/appShellStore.js'
import { ChatMode } from './sap-assistant/ChatMode.js'
import { CodeLabMode } from './sap-assistant/CodeLabMode.js'
import './sap-assistant/SapAssistantPage.css'

type Mode = 'chat' | 'code-lab'

function parseSubPage(subPage: string | null): { mode: Mode; chatFilter?: string } {
  const sp = (subPage ?? 'chat') as SapAssistantSubPage
  // 코드 랩 모드 (통합)
  if (sp === 'code-lab' || sp.startsWith('code-lab:')) return { mode: 'code-lab' }
  // 레거시 호환: analysis, archive → code-lab으로 리다이렉트
  if (sp === 'analysis' || sp === 'archive') return { mode: 'code-lab' }
  // 채팅 필터
  if (sp.startsWith('chat:')) return { mode: 'chat', chatFilter: sp.slice(5) }
  return { mode: 'chat' }
}

export function SapAssistantPage() {
  const subPage = useAppShellStore((state) => state.subPage)

  const { mode, chatFilter } = parseSubPage(subPage)

  return (
    <div className="sap-assistant-page">
      <div className="sap-assistant-content">
        {mode === 'chat' && <ChatMode chatFilter={chatFilter} />}
        {mode === 'code-lab' && <CodeLabMode />}
      </div>
    </div>
  )
}
