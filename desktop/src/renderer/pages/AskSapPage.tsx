import { useMemo } from 'react'
import type { ChatSession } from '../../main/contracts.js'
import { useChatStore } from '../stores/chatStore.js'
import { useSessions } from '../hooks/useSessions.js'
import { SessionListPanel } from './ask-sap/SessionListPanel.js'
import { ChatDetail } from './ask-sap/ChatDetail.js'
import './ChatPage.css'

export function AskSapPage() {
  const currentSessionId = useChatStore((state) => state.currentSessionId)
  const setCurrentSessionId = useChatStore((state) => state.setCurrentSessionId)
  const setInput = useChatStore((state) => state.setInput)
  const setCaseContext = useChatStore((state) => state.setCaseContext)

  const { data: sessions = [], isLoading: loadingSessions } = useSessions()

  const currentSession = useMemo<ChatSession | null>(
    () => sessions.find((session) => session.id === currentSessionId) ?? null,
    [currentSessionId, sessions]
  )

  function selectSession(session: ChatSession) {
    setCurrentSessionId(session.id)
    setCaseContext(null)
  }

  function startNewChat() {
    setCurrentSessionId(null)
    setCaseContext(null)
    setInput('')
  }

  return (
    <div className="chat-layout">
      <SessionListPanel
        sessions={sessions}
        currentSessionId={currentSessionId}
        loading={loadingSessions}
        onSelect={selectSession}
        onNewChat={startNewChat}
      />
      <ChatDetail currentSession={currentSession} />
    </div>
  )
}
