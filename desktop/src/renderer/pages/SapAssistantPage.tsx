import { useAppShellStore } from '../stores/appShellStore.js'
import type { SapAssistantSubPage } from '../stores/appShellStore.js'
import { ChatMode } from './sap-assistant/ChatMode.js'
import { CodeLabMode } from './sap-assistant/CodeLabMode.js'
import './sap-assistant/SapAssistantPage.css'

type Mode = 'chat' | 'code-lab'

function parseSubPage(subPage: string | null): { mode: Mode; chatFilter?: string } {
  const sp = (subPage ?? 'chat') as SapAssistantSubPage
  if (sp === 'code-lab' || sp.startsWith('code-lab:')) return { mode: 'code-lab' }
  if (sp === 'analysis' || sp === 'archive') return { mode: 'code-lab' }
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
