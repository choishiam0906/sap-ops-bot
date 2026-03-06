import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { MessageSquare, Sparkles, ShieldCheck, Code } from 'lucide-react'
import type { ChatSession } from '../../main/contracts.js'
import { useChatStore } from '../stores/chatStore.js'
import { useSessions } from '../hooks/useSessions.js'
import { useMessages } from '../hooks/useMessages.js'
import { useSendMessage } from '../hooks/useSendMessage.js'
import { Badge } from '../components/ui/Badge.js'
import { SessionList } from '../components/chat/SessionList.js'
import { MessageList } from '../components/chat/MessageList.js'
import { Composer } from '../components/chat/Composer.js'
import {
  DOMAIN_PACK_DETAILS,
  SECURITY_MODE_DETAILS,
  useWorkspaceStore,
} from '../stores/workspaceStore.js'
import './ChatPage.css'

export function ChatPage() {
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null)
  const queryClient = useQueryClient()
  const { input, provider, model, error, setInput, setProvider, setModel, setError, clearError } = useChatStore()
  const securityMode = useWorkspaceStore((state) => state.securityMode)
  const domainPack = useWorkspaceStore((state) => state.domainPack)
  const modeDetail = SECURITY_MODE_DETAILS[securityMode]
  const packDetail = DOMAIN_PACK_DETAILS[domainPack]
  const suggestionIcons = [Code, ShieldCheck, Sparkles]

  const { data: sessions = [], isLoading: loadingSessions, error: sessionsError } = useSessions()
  const { data: messages = [] } = useMessages(currentSession?.id ?? null)
  const sendMutation = useSendMessage()

  const displayError = error || (sessionsError ? '세션 목록을 불러오지 못했어요. 잠시 후 다시 시도해주세요.' : '')

  function selectSession(session: ChatSession) {
    setCurrentSession(session)
  }

  function handleSend() {
    const text = input.trim()
    if (!text || sendMutation.isPending) return

    clearError()
    sendMutation.mutate(
      { sessionId: currentSession?.id, provider, model, message: text },
      {
        onSuccess: (result) => {
          setInput('')
          setCurrentSession(result.session)
          queryClient.invalidateQueries({ queryKey: ['messages', result.session.id] })
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : '메시지 전송에 실패했어요')
        },
      }
    )
  }

  function startNewChat() {
    setCurrentSession(null)
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
        <div className="chat-context-banner">
          <div className="chat-context-copy">
            <span className="chat-context-eyebrow">Active Workspace</span>
            <strong>{packDetail.label}</strong>
            <p>
              {packDetail.description} 현재 전송 정책은 <b>{modeDetail.outboundPolicy}</b>입니다.
            </p>
          </div>
          <div className="chat-context-badges">
            <Badge variant={modeDetail.badgeVariant}>{modeDetail.label}</Badge>
            <Badge variant="neutral">{packDetail.label}</Badge>
          </div>
        </div>

        <MessageList messages={messages} />

        {messages.length === 0 && !useChatStore.getState().isStreaming && (
          <div className="chat-empty page-enter">
            <MessageSquare size={48} className="empty-icon" aria-hidden="true" />
            <h2>{packDetail.chatTitle}</h2>
            <p>{packDetail.chatDescription}</p>
            <div className="chat-empty-meta">
              <Badge variant={modeDetail.badgeVariant}>{modeDetail.outboundPolicy}</Badge>
              <Badge variant="neutral">{packDetail.label}</Badge>
            </div>
            <div className="chat-suggestions">
              {packDetail.suggestions.map((text, index) => {
                const Icon = suggestionIcons[index % suggestionIcons.length]
                return (
                  <button key={text} className="suggestion-chip" onClick={() => { setInput(text) }}>
                    <Icon size={14} aria-hidden="true" />
                    {text}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {displayError && (
          <div className="chat-error" role="alert">
            <span>{displayError}</span>
            <button className="chat-error-close" onClick={clearError} aria-label="에러 닫기">&times;</button>
          </div>
        )}

        <Composer
          input={input}
          provider={provider}
          model={model}
          sending={sendMutation.isPending}
          onInputChange={setInput}
          onProviderChange={setProvider}
          onModelChange={setModel}
          placeholder={`${packDetail.inputPlaceholder} (${modeDetail.placeholderHint})`}
          onSend={handleSend}
        />
      </div>
    </div>
  )
}
