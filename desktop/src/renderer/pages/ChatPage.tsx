import { useState, useEffect } from 'react'
import { MessageSquare, Sparkles, ShieldCheck, Code } from 'lucide-react'
import type { ChatSession, ChatMessage } from '../../main/contracts.js'
import { useChatStore } from '../stores/chatStore.js'
import { SessionList } from '../components/chat/SessionList.js'
import { MessageList } from '../components/chat/MessageList.js'
import { Composer } from '../components/chat/Composer.js'
import './ChatPage.css'

const api = window.sapOpsDesktop

export function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sending, setSending] = useState(false)

  const [loadingSessions, setLoadingSessions] = useState(true)
  const { input, provider, model, error, setInput, setProvider, setModel, setError, clearError } = useChatStore()

  useEffect(() => {
    loadSessions()
  }, [])

  async function loadSessions() {
    setLoadingSessions(true)
    try {
      const list = await api.listSessions(50)
      setSessions(Array.isArray(list) ? list : [])
    } catch {
      setSessions([])
    } finally {
      setLoadingSessions(false)
    }
  }

  async function selectSession(session: ChatSession) {
    setCurrentSession(session)
    try {
      const msgs = await api.getSessionMessages(session.id, 100)
      setMessages(Array.isArray(msgs) ? msgs : [])
    } catch {
      setMessages([])
    }
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || sending) return

    setSending(true)
    clearError()
    try {
      const result = await api.sendMessage({
        sessionId: currentSession?.id,
        provider,
        model,
        message: text,
      })
      setInput('')
      setCurrentSession(result.session)
      setMessages((prev) => [...prev, result.userMessage, result.assistantMessage])
      await loadSessions()
    } catch (err) {
      setError(err instanceof Error ? err.message : '메시지 전송에 실패했어요')
    } finally {
      setSending(false)
    }
  }

  function startNewChat() {
    setCurrentSession(null)
    setMessages([])
    setInput('')
  }

  return (
    <div className="chat-layout">
      <SessionList
        sessions={sessions}
        currentSessionId={currentSession?.id ?? null}
        loading={loadingSessions}
        onSelect={selectSession}
        onNewChat={startNewChat}
      />

      <div className="chat-main">
        <MessageList messages={messages} />

        {messages.length === 0 && !useChatStore.getState().isStreaming && (
          <div className="chat-empty page-enter">
            <MessageSquare size={48} className="empty-icon" aria-hidden="true" />
            <h2>SAP 운영에 대해 질문해보세요</h2>
            <p>T-code, 에러 분석, 권한 관리 등 무엇이든 물어보세요</p>
            <div className="chat-suggestions">
              {[
                { icon: Code, text: 'T-code SE38의 용도가 뭐예요?' },
                { icon: ShieldCheck, text: '권한 객체 S_TCODE 설정 방법' },
                { icon: Sparkles, text: 'SAP 성능 튜닝 가이드' },
              ].map(({ icon: Icon, text }) => (
                <button key={text} className="suggestion-chip" onClick={() => { setInput(text) }}>
                  <Icon size={14} aria-hidden="true" />
                  {text}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="chat-error" role="alert">
            <span>{error}</span>
            <button className="chat-error-close" onClick={clearError} aria-label="에러 닫기">&times;</button>
          </div>
        )}

        <Composer
          input={input}
          provider={provider}
          model={model}
          sending={sending}
          onInputChange={setInput}
          onProviderChange={setProvider}
          onModelChange={setModel}
          onSend={handleSend}
        />
      </div>
    </div>
  )
}
