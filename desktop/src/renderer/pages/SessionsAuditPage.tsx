import { useSessions } from '../hooks/useSessions'
import { useAuditLogs, useAuditSearch } from '../hooks/useAuditLogs'
import { useAuditStore } from '../stores/auditStore'
import { Badge } from '../components/ui/Badge'
import type { AuditLogEntry, AuditSearchFilters, AuditAction } from '../../main/contracts'
import './SessionsAuditPage.css'

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

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function SessionsTab() {
  const { data: sessions = [], isLoading, isError } = useSessions()

  if (isLoading) return <div className="audit-empty">세션 목록을 불러오는 중...</div>
  if (isError) return <div className="audit-empty" role="alert">세션 목록을 불러올 수 없어요</div>
  if (sessions.length === 0) return <div className="audit-empty">아직 세션이 없어요</div>

  return (
    <div>
      {sessions.map((session) => (
        <div key={session.id} className="session-card">
          <span className="session-card-title">{session.title}</span>
          <div className="session-card-meta">
            <Badge variant="info">{session.provider}</Badge>
            <span>{session.model}</span>
            <span>{formatTimestamp(session.updatedAt)}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function AuditFilters() {
  const {
    filterAction,
    filterDateFrom,
    filterDateTo,
    setFilterAction,
    setFilterDateFrom,
    setFilterDateTo,
    resetFilters,
  } = useAuditStore()

  return (
    <div className="audit-filters">
      <select
        className="audit-filter-select"
        value={filterAction}
        onChange={(e) => setFilterAction(e.target.value as AuditAction | '')}
        aria-label="액션 필터"
      >
        {ACTION_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <input
        type="date"
        className="audit-filter-input"
        value={filterDateFrom}
        onChange={(e) => setFilterDateFrom(e.target.value)}
        aria-label="시작 날짜"
      />
      <input
        type="date"
        className="audit-filter-input"
        value={filterDateTo}
        onChange={(e) => setFilterDateTo(e.target.value)}
        aria-label="종료 날짜"
      />
      <button className="audit-filter-reset" onClick={resetFilters} type="button">
        초기화
      </button>
    </div>
  )
}

function AuditTable({ entries }: { entries: AuditLogEntry[] }) {
  if (entries.length === 0) {
    return <div className="audit-empty">감사 로그가 없어요</div>
  }

  return (
    <table className="audit-table">
      <thead>
        <tr>
          <th>시간</th>
          <th>액션</th>
          <th>Skill</th>
          <th>도메인 팩</th>
          <th>정책 결정</th>
          <th>외부 전송</th>
          <th>Provider</th>
          <th>Sources</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <tr key={entry.id}>
            <td>{formatTimestamp(entry.timestamp)}</td>
            <td>{entry.action}</td>
            <td>{entry.skillId ?? '-'}</td>
            <td>{entry.domainPack}</td>
            <td>
              <span className={policyBadgeClass(entry.policyDecision)}>
                {entry.policyDecision}
              </span>
            </td>
            <td>{entry.externalTransfer ? '예' : '아니오'}</td>
            <td>{entry.provider ?? '-'}</td>
            <td>{entry.sourceCount ?? entry.sourceIds?.length ?? 0}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function AuditTab() {
  const { filterAction, filterDateFrom, filterDateTo } = useAuditStore()

  const hasFilters = filterAction || filterDateFrom || filterDateTo
  const filters: AuditSearchFilters = {}
  if (filterAction) filters.action = filterAction
  if (filterDateFrom) filters.from = filterDateFrom
  if (filterDateTo) filters.to = filterDateTo

  const allQuery = useAuditLogs(50)
  const searchQuery = useAuditSearch(filters, Boolean(hasFilters))

  const { data: entries = [], isLoading } = hasFilters ? searchQuery : allQuery

  return (
    <div>
      <AuditFilters />
      {isLoading ? (
        <div className="audit-empty">감사 로그를 불러오는 중...</div>
      ) : (
        <AuditTable entries={entries} />
      )}
    </div>
  )
}

export function SessionsAuditPage() {
  const { tab, setTab } = useAuditStore()

  return (
    <div className="audit-page">
      <h1 className="page-title">Sessions &amp; Audit</h1>
      <p className="settings-desc">세션 이력과 정책 감사 로그를 확인하세요</p>

      <div className="audit-tabs" role="tablist">
        <button
          className={`audit-tab ${tab === 'sessions' ? 'active' : ''}`}
          onClick={() => setTab('sessions')}
          role="tab"
          aria-selected={tab === 'sessions'}
        >
          세션 이력
        </button>
        <button
          className={`audit-tab ${tab === 'audit' ? 'active' : ''}`}
          onClick={() => setTab('audit')}
          role="tab"
          aria-selected={tab === 'audit'}
        >
          감사 로그
        </button>
      </div>

      {tab === 'sessions' && <SessionsTab />}
      {tab === 'audit' && <AuditTab />}
    </div>
  )
}
