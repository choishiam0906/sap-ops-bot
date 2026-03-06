import { useEffect, useRef } from 'react'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import type { ChatMessage } from '../../../main/contracts.js'
import { MarkdownRenderer } from '../MarkdownRenderer.js'
import { SkeletonMessage } from '../ui/Skeleton.js'
import { useChatStore } from '../../stores/chatStore.js'

interface MessageListProps {
  messages: ChatMessage[]
  onFeedback?: (messageId: string, rating: 'positive' | 'negative') => void
}

export function MessageList({ messages, onFeedback }: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null)
  const { isStreaming, streamingContent } = useChatStore()

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  if (messages.length === 0 && !isStreaming) {
    return null
  }

  return (
    <div className="chat-messages" aria-live="polite" aria-label="메시지 목록">
      {messages.map((msg) => (
        <div key={msg.id} className={`message ${msg.role} message-enter`} role="article" aria-label={`${msg.role === 'user' ? '내 메시지' : 'AI 응답'}`}>
          <div className="message-bubble">
            <div className="message-content">
              {msg.role === 'assistant' ? (
                <MarkdownRenderer content={msg.content} />
              ) : (
                msg.content
              )}
            </div>
            {msg.role === 'assistant' && onFeedback && (
              <div className="message-feedback" role="group" aria-label="응답 평가">
                <button
                  className="feedback-btn feedback-positive"
                  onClick={() => onFeedback(msg.id, 'positive')}
                  aria-label="도움이 됐어요"
                  title="도움이 됐어요"
                >
                  <ThumbsUp size={14} />
                </button>
                <button
                  className="feedback-btn feedback-negative"
                  onClick={() => onFeedback(msg.id, 'negative')}
                  aria-label="아쉬워요"
                  title="아쉬워요"
                >
                  <ThumbsDown size={14} />
                </button>
              </div>
            )}
          </div>
          <span className="message-time">
            {new Date(msg.createdAt).toLocaleTimeString('ko-KR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      ))}

      {isStreaming && streamingContent && (
        <div className="message assistant streaming" role="article" aria-label="AI 응답 생성 중">
          <div className="message-bubble">
            <div className="message-content">
              <MarkdownRenderer content={streamingContent} />
              <span className="streaming-cursor" aria-hidden="true">▊</span>
            </div>
          </div>
        </div>
      )}

      {isStreaming && !streamingContent && (
        <div className="message assistant streaming" role="status" aria-label="응답 준비 중">
          <div className="message-bubble">
            <div className="message-content">
              <SkeletonMessage />
            </div>
          </div>
        </div>
      )}

      <div ref={endRef} />
    </div>
  )
}
