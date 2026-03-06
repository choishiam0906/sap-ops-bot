import { Plus } from 'lucide-react'
import type { ChatSession } from '../../../main/contracts.js'
import { Button } from '../ui/Button.js'
import { Skeleton } from '../ui/Skeleton.js'

interface SessionListProps {
  sessions: ChatSession[]
  currentSessionId: string | null
  loading?: boolean
  onSelect: (session: ChatSession) => void
  onNewChat: () => void
}

export function SessionList({ sessions, currentSessionId, loading, onSelect, onNewChat }: SessionListProps) {
  return (
    <div className="chat-sidebar">
      <Button variant="primary" onClick={onNewChat} className="new-chat-btn" aria-label="새 대화 시작">
        <Plus size={16} aria-hidden="true" />
        새 대화
      </Button>
      <div className="session-list" role="listbox" aria-label="대화 목록">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="session-item skeleton-item">
              <Skeleton variant="text" width="70%" />
              <Skeleton variant="text" width="40%" height={10} />
            </div>
          ))
        ) : (
          <>
            {sessions.map((s) => (
              <button
                key={s.id}
                role="option"
                className={`session-item ${currentSessionId === s.id ? 'active' : ''}`}
                aria-selected={currentSessionId === s.id}
                onClick={() => onSelect(s)}
              >
                <span className="session-title">{s.title || '새 대화'}</span>
                <span className="session-date">
                  {new Date(s.updatedAt).toLocaleDateString('ko-KR')}
                </span>
              </button>
            ))}
            {sessions.length === 0 && (
              <div className="session-empty">대화 이력이 없어요</div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
