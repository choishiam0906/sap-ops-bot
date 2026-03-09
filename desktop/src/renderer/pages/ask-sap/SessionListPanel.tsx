import { useMemo } from 'react'
import { Plus, Star, Archive, Bookmark, MessageSquare } from 'lucide-react'
import type { ChatSession, ChatSessionMeta } from '../../../main/contracts.js'
import { Button } from '../../components/ui/Button.js'
import { Skeleton } from '../../components/ui/Skeleton.js'
import { useAskSapStore } from '../../stores/askSapStore.js'
import type { SessionFilterTab } from '../../stores/askSapStore.js'

// ChatSession이 ChatSessionMeta 필드를 가질 수 있는 유니온 타입
type SessionItem = ChatSession & Partial<Pick<ChatSessionMeta, 'isFlagged' | 'isArchived' | 'todoState'>>

interface SessionListPanelProps {
  sessions: SessionItem[]
  currentSessionId: string | null
  loading?: boolean
  onSelect: (session: SessionItem) => void
  onNewChat: () => void
}

const FILTER_TABS: { id: SessionFilterTab; label: string; Icon: typeof MessageSquare }[] = [
  { id: 'all', label: '전체 세션', Icon: MessageSquare },
  { id: 'flagged', label: '중요 세션', Icon: Star },
  { id: 'cases', label: '저장한 케이스', Icon: Bookmark },
  { id: 'archive', label: 'Archive', Icon: Archive },
]

export function SessionListPanel({
  sessions,
  currentSessionId,
  loading,
  onSelect,
  onNewChat,
}: SessionListPanelProps) {
  const { filterTab, setFilterTab, searchQuery, setSearchQuery } = useAskSapStore()

  const filteredSessions = useMemo(() => {
    let result: SessionItem[]
    switch (filterTab) {
      case 'flagged':
        result = sessions.filter((s) => s.isFlagged === true)
        break
      case 'cases':
        result = sessions.filter((s) => s.todoState != null && s.todoState !== 'closed' && s.todoState !== 'resolved')
        break
      case 'archive':
        result = sessions.filter((s) => s.isArchived === true)
        break
      default:
        result = sessions.filter((s) => s.isArchived !== true)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((s) => s.title.toLowerCase().includes(q))
    }
    return result
  }, [sessions, filterTab, searchQuery])

  return (
    <div className="ask-sap-session-panel">
      <Button variant="primary" onClick={onNewChat} className="ask-sap-new-btn" aria-label="새 세션">
        <Plus size={16} aria-hidden="true" />
        새 세션
      </Button>

      <div className="ask-sap-filter-tabs" role="tablist" aria-label="세션 필터">
        {FILTER_TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            role="tab"
            className={`ask-sap-filter-tab ${filterTab === id ? 'active' : ''}`}
            aria-selected={filterTab === id}
            onClick={() => setFilterTab(id)}
            type="button"
            title={label}
          >
            <Icon size={14} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <input
        className="ask-sap-search"
        type="text"
        placeholder="세션 검색..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        aria-label="세션 검색"
      />

      <div className="ask-sap-session-list" role="listbox" aria-label="세션 목록">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="session-item skeleton-item">
              <Skeleton variant="text" width="70%" />
              <Skeleton variant="text" width="40%" height={10} />
            </div>
          ))
        ) : (
          <>
            {filteredSessions.map((s) => (
              <button
                key={s.id}
                role="option"
                className={`session-item ${currentSessionId === s.id ? 'active' : ''}`}
                aria-selected={currentSessionId === s.id}
                onClick={() => onSelect(s)}
                type="button"
              >
                <span className="session-title">{s.title || '새 대화'}</span>
                <span className="session-date">
                  {new Date(s.updatedAt).toLocaleDateString('ko-KR')}
                </span>
                {s.isFlagged === true && <Star size={12} className="session-flag-icon" aria-label="중요" />}
              </button>
            ))}
            {filteredSessions.length === 0 && (
              <div className="session-empty">
                {filterTab === 'all' ? '대화 이력이 없어요' : '해당하는 세션이 없어요'}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
