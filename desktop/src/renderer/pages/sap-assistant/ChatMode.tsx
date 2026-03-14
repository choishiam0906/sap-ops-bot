import { useEffect, useMemo } from 'react'
import type { ChatSession } from '../../../main/contracts.js'
import { useChatStore } from '../../stores/chatStore.js'
import { useAppShellStore } from '../../stores/appShellStore.js'
import { useAskSapStore } from '../../stores/askSapStore.js'
import type { SessionFilterTab } from '../../stores/askSapStore.js'
import { useSessions } from '../../hooks/useSessions.js'
import { SessionListPanel } from '../ask-sap/SessionListPanel.js'
import { ChatDetail } from '../ask-sap/ChatDetail.js'
import '../ChatPage.css'

interface ChatModeProps {
  chatFilter?: string
}

export function ChatMode({ chatFilter }: ChatModeProps) {
  const currentSessionId = useChatStore((state) => state.currentSessionId)
  const setCurrentSessionId = useChatStore((state) => state.setCurrentSessionId)
  const setInput = useChatStore((state) => state.setInput)
  const setCaseContext = useChatStore((state) => state.setCaseContext)

  const filterTab = useAskSapStore((state) => state.filterTab)
  const setFilterTab = useAskSapStore((state) => state.setFilterTab)

  const { data: sessions = [], isLoading: loadingSessions } = useSessions()

  const currentSession = useMemo<ChatSession | null>(
    () => sessions.find((session) => session.id === currentSessionId) ?? null,
    [currentSessionId, sessions]
  )

  // chatFilter prop → askSapStore 동기화
  useEffect(() => {
    if (chatFilter) {
      const mapped = chatFilter as SessionFilterTab
      if (mapped !== filterTab) {
        setFilterTab(mapped)
      }
    } else if (filterTab !== 'all') {
      setFilterTab('all')
    }
  }, [chatFilter, filterTab, setFilterTab])

  function selectSession(session: ChatSession) {
    setCurrentSessionId(session.id)
    setCaseContext(null)
  }

  function startNewChat() {
    setCurrentSessionId(null)
    setCaseContext(null)
    setInput('')
  }

  function handleFilterTabChange(tab: SessionFilterTab) {
    setFilterTab(tab)
    // appShellStore.subPage도 함께 동기화해야 useEffect 리셋 방지
    const sub = tab === 'all' ? 'chat' : `chat:${tab}`
    useAppShellStore.getState().setSection('sap-assistant', sub)
  }

  return (
    <div className="chat-layout">
      <SessionListPanel
        sessions={sessions}
        currentSessionId={currentSessionId}
        loading={loadingSessions}
        onSelect={selectSession}
        onNewChat={startNewChat}
        onFilterTabChange={handleFilterTabChange}
      />
      <ChatDetail currentSession={currentSession} />
    </div>
  )
}
