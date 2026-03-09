import { useState } from 'react'
import {
  Star, MoreVertical,
} from 'lucide-react'
import { TODO_STATES, SAP_LABELS } from '../../../main/contracts.js'
import type { ChatSessionMeta, AuditSearchFilters, SecurityMode, AuditAction } from '../../../main/contracts.js'
import {
  useSessionsFiltered,
  useUpdateTodoState, useToggleFlag, useToggleArchive,
  useAddLabel, useRemoveLabel,
} from '../../hooks/useSessionsFiltered.js'
import { useAuditSearch } from '../../hooks/useAuditLogs.js'
import { Badge } from '../../components/ui/Badge.js'
import { TodoStateMenu } from '../../components/ui/TodoStateMenu.js'
import { Button } from '../../components/ui/Button.js'
import { useAppShellStore } from '../../stores/appShellStore.js'
import { useChatStore } from '../../stores/chatStore.js'
import type { CockpitSubPage } from '../../stores/appShellStore.js'

// ─── 유틸리티 ───

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ko-KR', {
      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}

// ─── SessionCard ───

function SessionCard({ session }: { session: ChatSessionMeta }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [labelMenuOpen, setLabelMenuOpen] = useState(false)
  const setSection = useAppShellStore((state) => state.setSection)
  const setCurrentSessionId = useChatStore((state) => state.setCurrentSessionId)
  const updateState = useUpdateTodoState()
  const toggleFlag = useToggleFlag()
  const toggleArchive = useToggleArchive()
  const addLabel = useAddLabel()
  const removeLabel = useRemoveLabel()

  function openSession() {
    setCurrentSessionId(session.id)
    setSection('ask-sap', 'all')
  }

  return (
    <div className={`cockpit-card ${session.isArchived ? 'archived' : ''}`}>
      <div className="cockpit-card-header">
        <span className="cockpit-card-title">{session.title}</span>
        <Badge variant="info">{session.provider}</Badge>
      </div>
      <div className="cockpit-card-meta">
        <span>{session.model}</span>
        <span>{formatTimestamp(session.updatedAt)}</span>
      </div>
      <div className="cockpit-card-summary">
        <span>{TODO_STATES[session.todoState].label}</span>
        <span>{session.labels.length > 0 ? session.labels.join(' · ') : '라벨 없음'}</span>
      </div>
      <div className="cockpit-card-actions">
        <Button variant="secondary" size="sm" onClick={openSession}>
          열기
        </Button>
        <TodoStateMenu
          current={session.todoState}
          onSelect={(state) => updateState.mutate({ sessionId: session.id, state })}
        />
        <div className="cockpit-card-labels">
          {session.labels.map((label) => (
            <span key={label} className="cockpit-label-chip">
              {label}
              <button
                className="cockpit-label-remove"
                onClick={() => removeLabel.mutate({ sessionId: session.id, label })}
                type="button"
                aria-label={`${label} 라벨 제거`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <button
          className={`cockpit-icon-btn ${session.isFlagged ? 'flagged' : ''}`}
          onClick={() => toggleFlag.mutate(session.id)}
          type="button"
          aria-label={session.isFlagged ? '별표 해제' : '별표'}
          title={session.isFlagged ? '별표 해제' : '별표'}
        >
          <Star size={14} />
        </button>
        <div className="cockpit-more-wrapper">
          <button className="cockpit-icon-btn" onClick={() => setMenuOpen(!menuOpen)} type="button" aria-label="더보기">
            <MoreVertical size={14} />
          </button>
          {menuOpen && (
            <div className="cockpit-context-menu">
              <button onClick={() => { toggleArchive.mutate(session.id); setMenuOpen(false) }} type="button">
                {session.isArchived ? '아카이브 해제' : '아카이브'}
              </button>
              <button onClick={() => { setLabelMenuOpen(!labelMenuOpen) }} type="button">
                라벨 추가
              </button>
              {labelMenuOpen && (
                <div className="cockpit-label-submenu">
                  {SAP_LABELS.filter((l) => !session.labels.includes(l)).map((label) => (
                    <button
                      key={label}
                      onClick={() => { addLabel.mutate({ sessionId: session.id, label }); setLabelMenuOpen(false); setMenuOpen(false) }}
                      type="button"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── PendingQueue (승인 대기) ───

const SECURITY_MODE_OPTIONS: { value: SecurityMode | ''; label: string }[] = [
  { value: '', label: '전체 모드' },
  { value: 'secure-local', label: 'Secure Local' },
  { value: 'reference', label: 'Reference' },
  { value: 'hybrid-approved', label: 'Hybrid Approved' },
]

const ACTION_OPTIONS: { value: AuditAction | ''; label: string }[] = [
  { value: '', label: '전체 액션' },
  { value: 'send_message', label: '메시지 전송' },
  { value: 'analyze_cbo', label: 'CBO 분석' },
  { value: 'sync_knowledge', label: '지식 동기화' },
  { value: 'stream_message', label: '스트림' },
]

function policyBadgeClass(decision: string): string {
  if (decision === 'ALLOWED') return 'policy-badge allowed'
  if (decision === 'BLOCKED') return 'policy-badge blocked'
  return 'policy-badge pending'
}

function PendingQueue() {
  const [securityMode, setSecurityMode] = useState<SecurityMode | ''>('')
  const [action, setAction] = useState<AuditAction | ''>('')

  const filters: AuditSearchFilters = {}
  if (securityMode) filters.securityMode = securityMode
  if (action) filters.action = action

  const { data: allEntries = [], isLoading } = useAuditSearch(filters, true)
  // 클라이언트 사이드에서 PENDING_APPROVAL 필터링
  const entries = allEntries.filter((e) => e.policyDecision === 'PENDING_APPROVAL')

  return (
    <div className="cockpit-q-content">
      <div className="cockpit-q-header">
        <h2>승인 대기 항목</h2>
        <p>정책 결정이 PENDING_APPROVAL인 감사 로그 항목입니다.</p>
      </div>
      <div className="audit-filters">
        <select className="audit-filter-select" value={securityMode} onChange={(e) => setSecurityMode(e.target.value as SecurityMode | '')} aria-label="보안 모드 필터">
          {SECURITY_MODE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select className="audit-filter-select" value={action} onChange={(e) => setAction(e.target.value as AuditAction | '')} aria-label="액션 필터">
          {ACTION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      {isLoading ? (
        <div className="audit-empty">승인 대기 항목을 불러오는 중...</div>
      ) : entries.length === 0 ? (
        <div className="audit-empty">승인 대기 중인 항목이 없어요</div>
      ) : (
        <table className="audit-table">
          <thead>
            <tr><th>시간</th><th>액션</th><th>보안 모드</th><th>정책 결정</th><th>Provider</th></tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td>{formatTimestamp(entry.timestamp)}</td>
                <td>{entry.action}</td>
                <td><Badge variant={entry.securityMode === 'secure-local' ? 'success' : entry.securityMode === 'reference' ? 'info' : 'warning'}>{entry.securityMode}</Badge></td>
                <td><span className={policyBadgeClass(entry.policyDecision)}>{entry.policyDecision}</span></td>
                <td>{entry.provider ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ─── SessionQueue (세션 기반 큐) ───

function SessionQueue({ title, description, filter }: {
  title: string
  description: string
  filter: Parameters<typeof useSessionsFiltered>[0]
}) {
  const { data: sessions = [], isLoading, isError } = useSessionsFiltered(filter)

  return (
    <div className="cockpit-q-content">
      <div className="cockpit-q-header">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div className="cockpit-session-list">
        {isLoading && <div className="audit-empty">세션을 불러오는 중...</div>}
        {isError && <div className="audit-empty" role="alert">세션 목록을 불러올 수 없어요</div>}
        {!isLoading && !isError && sessions.length === 0 && (
          <div className="audit-empty">해당하는 세션이 없어요</div>
        )}
        {sessions.map((session) => (
          <SessionCard key={session.id} session={session} />
        ))}
      </div>
    </div>
  )
}

// ─── QueueView (큐별 분기) ───

export function QueueView() {
  const subPage = useAppShellStore((state) => state.subPage) as CockpitSubPage | null
  const queue = subPage ?? 'overview'

  switch (queue) {
    case 'pending':
      return <PendingQueue />
    case 'high-risk':
      return (
        <SessionQueue
          title="고위험 분석"
          description="CBO 분석에서 고위험으로 분류된 세션을 확인합니다."
          filter={{ kind: 'label', value: 'CBO: high-risk' }}
        />
      )
    case 'today':
      return (
        <SessionQueue
          title="오늘 작업"
          description="오늘 업데이트된 활성 세션을 확인합니다."
          filter={{ kind: 'allSessions' }}
        />
      )
    case 'issues':
      return (
        <SessionQueue
          title="최근 이슈"
          description="접수 상태의 세션을 최신순으로 확인합니다."
          filter={{ kind: 'state', value: 'open' }}
        />
      )
    default:
      return null
  }
}
