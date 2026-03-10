import { useAppShellStore } from '../stores/appShellStore.js'
import type { SapAssistantSubPage } from '../stores/appShellStore.js'
import { ChatMode } from './sap-assistant/ChatMode.js'
import { AnalysisMode } from './sap-assistant/AnalysisMode.js'
import { ArchiveMode } from './sap-assistant/ArchiveMode.js'
import './sap-assistant/SapAssistantPage.css'

type Mode = 'chat' | 'analysis' | 'archive'

function parseSubPage(subPage: string | null): { mode: Mode; chatFilter?: string } {
  const sp = (subPage ?? 'chat') as SapAssistantSubPage
  if (sp === 'analysis') return { mode: 'analysis' }
  if (sp === 'archive') return { mode: 'archive' }
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
        {mode === 'analysis' && <AnalysisMode />}
        {mode === 'archive' && <ArchiveMode />}
      </div>
    </div>
  )
}
