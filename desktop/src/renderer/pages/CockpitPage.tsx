import { useState } from 'react'
import {
  CircleDot, Search, Loader2, CheckCircle, XCircle,
  Star, Archive, ChevronDown, ChevronRight, MoreVertical, FileText, ArrowRight,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { TODO_STATES, SAP_LABELS } from '../../main/contracts'
import type {
  ChatSessionMeta, TodoStateKind, SessionFilter,
  AuditLogEntry, AuditSearchFilters, SecurityMode, AuditAction, DomainPack,
} from '../../main/contracts'
import { useCockpitStore } from '../stores/cockpitStore'
import {
  useSessionsFiltered, useSessionStats,
  useUpdateTodoState, useToggleFlag, useToggleArchive,
  useAddLabel, useRemoveLabel,
} from '../hooks/useSessionsFiltered'
import { useAuditLogs, useAuditSearch } from '../hooks/useAuditLogs'
import { Badge } from '../components/ui/Badge'
import { TodoStateMenu } from '../components/ui/TodoStateMenu'
import { Button } from '../components/ui/Button'
import { useAppShellStore } from '../stores/appShellStore'
import { useChatStore } from '../stores/chatStore'
import { useCboStore } from '../stores/cboStore'
import { DOMAIN_PACK_DETAILS, useWorkspaceStore } from '../stores/workspaceStore'
import './CockpitPage.css'

// ─── 아이콘 매핑 ───

const STATE_ICONS: Record<TodoStateKind, LucideIcon> = {
  open: CircleDot,
  analyzing: Search,
  'in-progress': Loader2,
  resolved: CheckCircle,
  closed: XCircle,
}

const STATE_ORDER: TodoStateKind[] = ['open', 'analyzing', 'in-progress', 'resolved', 'closed']

interface QuickWorkflow {
  id: string
  title: string
  description: string
  cta: string
  targetPage: 'chat' | 'cbo'
  domainPack: DomainPack
  securityMode: SecurityMode
  skillId?: string
  sourceIds: string[]
  defaultPrompt: string
  buildPrompt: (summary: string) => string
}

const QUICK_WORKFLOWS: QuickWorkflow[] = [
  {
    id: 'incident-triage',
    title: '운영 장애 트리아지',
    description: '증상 요약을 넣고 우선 점검 순서, 원인 후보, 추천 T-code를 바로 엽니다.',
    cta: 'Case Assistant 열기',
    targetPage: 'chat',
    domainPack: 'ops',
    securityMode: 'hybrid-approved',
    skillId: 'incident-triage',
    sourceIds: ['workspace-context', 'vault-reference'],
    defaultPrompt: '현재 장애 증상을 기준으로 우선 점검 순서, 원인 후보, 추천 T-code를 정리해줘.',
    buildPrompt: (summary) =>
      `다음 SAP 운영 장애 상황을 기준으로 원인 후보, 점검 순서, 운영자 액션을 정리해줘.\n\n[상황 요약]\n${summary}`,
  },
  {
    id: 'functional-explainer',
    title: '현업 문의 설명',
    description: '현업 질문이나 프로세스 이슈를 업무 언어로 다시 정리해주는 시작점입니다.',
    cta: '업무 설명 시작',
    targetPage: 'chat',
    domainPack: 'functional',
    securityMode: 'reference',
    skillId: 'sap-explainer',
    sourceIds: ['workspace-context', 'vault-reference'],
    defaultPrompt: '현업 문의를 업무 언어로 설명하고, 먼저 확인할 절차를 정리해줘.',
    buildPrompt: (summary) =>
      `다음 현업 문의 또는 업무 이슈를 비기술 사용자도 이해할 수 있게 설명하고, 먼저 확인할 절차를 정리해줘.\n\n[문의 요약]\n${summary}`,
  },
  {
    id: 'transport-review',
    title: 'Transport 리스크 리뷰',
    description: '변경 요청이나 transport 요약을 기준으로 배포 리스크와 체크리스트를 만듭니다.',
    cta: '리스크 리뷰 시작',
    targetPage: 'chat',
    domainPack: 'ops',
    securityMode: 'hybrid-approved',
    skillId: 'transport-risk-review',
    sourceIds: ['workspace-context', 'vault-confidential', 'vault-reference'],
    defaultPrompt: '이 transport 변경의 영향 범위, 배포 리스크, 승인 전 체크리스트를 정리해줘.',
    buildPrompt: (summary) =>
      `다음 SAP transport 또는 변경 요청을 기준으로 영향 범위, 배포 리스크, 승인 전 체크리스트를 정리해줘.\n\n[변경 요약]\n${summary}`,
  },
  {
    id: 'cbo-impact',
    title: 'CBO 영향 분석',
    description: '파일 또는 폴더를 선택해 CBO 변경 영향을 분석하는 워크벤치로 바로 이동합니다.',
    cta: 'Impact Analysis 열기',
    targetPage: 'cbo',
    domainPack: 'cbo-maintenance',
    securityMode: 'secure-local',
    sourceIds: ['workspace-context', 'local-imported-files'],
    defaultPrompt: 'CBO 영향 분석 워크벤치로 이동합니다.',
    buildPrompt: (summary) =>
      summary ? `CBO 분석 준비 메모: ${summary}` : 'CBO 영향 분석 워크벤치로 이동합니다.',
  },
]

// ─── 유틸리티 ───

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ko-KR', {
      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}

// ─── CockpitSidebar ───

function CockpitSidebar() {
  const { currentFilter, setFilter, statusExpanded, labelExpanded, toggleStatusExpanded, toggleLabelExpanded } = useCockpitStore()
  const { data: stats } = useSessionStats()

  const isActive = (kind: SessionFilter['kind'], value?: string) =>
    currentFilter.kind === kind && currentFilter.value === value

  return (
    <aside className="cockpit-sidebar">
      <button
        className={`cockpit-sidebar-item ${isActive('allSessions') ? 'active' : ''}`}
        onClick={() => setFilter({ kind: 'allSessions' })}
        type="button"
      >
        <FileText size={16} />
        <span>전체 세션</span>
        {stats && <span className="cockpit-sidebar-badge">{stats.all}</span>}
      </button>

      {/* 상태 섹션 */}
      <button className="cockpit-sidebar-section" onClick={toggleStatusExpanded} type="button">
        {statusExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span>상태</span>
      </button>
      {statusExpanded && STATE_ORDER.map((kind) => {
        const def = TODO_STATES[kind]
        const Icon = STATE_ICONS[kind]
        const count = stats ? stats[kind] : 0
        return (
          <button
            key={kind}
            className={`cockpit-sidebar-item sub ${isActive('state', kind) ? 'active' : ''}`}
            onClick={() => setFilter({ kind: 'state', value: kind })}
            type="button"
          >
            <Icon size={14} style={{ color: def.color }} />
            <span>{def.label}</span>
            {count > 0 && <span className="cockpit-sidebar-badge">{count}</span>}
          </button>
        )
      })}

      {/* 라벨 섹션 */}
      <button className="cockpit-sidebar-section" onClick={toggleLabelExpanded} type="button">
        {labelExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span>라벨</span>
      </button>
      {labelExpanded && SAP_LABELS.map((label) => (
        <button
          key={label}
          className={`cockpit-sidebar-item sub ${isActive('label', label) ? 'active' : ''}`}
          onClick={() => setFilter({ kind: 'label', value: label })}
          type="button"
        >
          <span className="cockpit-label-dot" />
          <span>{label}</span>
        </button>
      ))}

      {/* 별표 / 아카이브 */}
      <button
        className={`cockpit-sidebar-item ${isActive('flagged') ? 'active' : ''}`}
        onClick={() => setFilter({ kind: 'flagged' })}
        type="button"
      >
        <Star size={16} />
        <span>별표 항목</span>
        {stats && stats.flagged > 0 && <span className="cockpit-sidebar-badge">{stats.flagged}</span>}
      </button>
      <button
        className={`cockpit-sidebar-item ${isActive('archived') ? 'active' : ''}`}
        onClick={() => setFilter({ kind: 'archived' })}
        type="button"
      >
        <Archive size={16} />
        <span>아카이브</span>
        {stats && stats.archived > 0 && <span className="cockpit-sidebar-badge">{stats.archived}</span>}
      </button>
    </aside>
  )
}

// ─── SessionCard ───

function SessionCard({ session }: { session: ChatSessionMeta }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [labelMenuOpen, setLabelMenuOpen] = useState(false)
  const setCurrentPage = useAppShellStore((state) => state.setCurrentPage)
  const setCurrentSessionId = useChatStore((state) => state.setCurrentSessionId)
  const updateState = useUpdateTodoState()
  const toggleFlag = useToggleFlag()
  const toggleArchive = useToggleArchive()
  const addLabel = useAddLabel()
  const removeLabel = useRemoveLabel()

  function openSession() {
    setCurrentSessionId(session.id)
    setCurrentPage('chat')
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
          <button
            className="cockpit-icon-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            type="button"
            aria-label="더보기"
          >
            <MoreVertical size={14} />
          </button>
          {menuOpen && (
            <div className="cockpit-context-menu">
              <button
                onClick={() => { toggleArchive.mutate(session.id); setMenuOpen(false) }}
                type="button"
              >
                {session.isArchived ? '아카이브 해제' : '아카이브'}
              </button>
              <button
                onClick={() => { setLabelMenuOpen(!labelMenuOpen); }}
                type="button"
              >
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

function SnapshotSection() {
  const { data: stats } = useSessionStats()

  const cards = [
    { label: '접수 세션', value: stats?.open ?? 0, tone: 'info' as const },
    { label: '분석중', value: stats?.analyzing ?? 0, tone: 'warning' as const },
    { label: '처리중', value: stats?.['in-progress'] ?? 0, tone: 'warning' as const },
    { label: '별표 항목', value: stats?.flagged ?? 0, tone: 'neutral' as const },
  ]

  return (
    <section className="cockpit-section">
      <div className="cockpit-section-header">
        <div>
          <span className="cockpit-eyebrow">Ops Snapshot</span>
          <h2>지금 확인할 운영 현황</h2>
        </div>
      </div>
      <div className="cockpit-snapshot-grid">
        {cards.map((card) => (
          <div key={card.label} className="cockpit-snapshot-card">
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <Badge variant={card.tone}>{card.label}</Badge>
          </div>
        ))}
      </div>
    </section>
  )
}

function QuickStartSection() {
  const [intakeSummary, setIntakeSummary] = useState('')
  const setCurrentPage = useAppShellStore((state) => state.setCurrentPage)
  const setDomainPack = useWorkspaceStore((state) => state.setDomainPack)
  const setSecurityMode = useWorkspaceStore((state) => state.setSecurityMode)
  const setInput = useChatStore((state) => state.setInput)
  const setCurrentSessionId = useChatStore((state) => state.setCurrentSessionId)
  const setSelectedSkillId = useChatStore((state) => state.setSelectedSkillId)
  const setSelectedSourceIds = useChatStore((state) => state.setSelectedSourceIds)
  const setLastExecutionMeta = useChatStore((state) => state.setLastExecutionMeta)

  function launchWorkflow(workflow: QuickWorkflow) {
    setDomainPack(workflow.domainPack)
    setSecurityMode(workflow.securityMode)

    if (workflow.targetPage === 'chat') {
      setCurrentSessionId(null)
      setSelectedSkillId(workflow.skillId ?? '')
      setSelectedSourceIds(workflow.sourceIds)
      setLastExecutionMeta(null)
      setInput(
        intakeSummary.trim()
          ? workflow.buildPrompt(intakeSummary.trim())
          : workflow.defaultPrompt
      )
      setCurrentPage('chat')
      return
    }

    const cboStore = useCboStore.getState()
    cboStore.setTab('file')
    cboStore.setStatus(
      intakeSummary.trim()
        ? `CBO 영향 분석 준비: ${intakeSummary.trim()}`
        : 'CBO 영향 분석 워크스페이스가 준비되었습니다. 파일 또는 폴더를 선택하세요.'
    )
    cboStore.setError('')
    cboStore.setResult(null)
    cboStore.setDiffResult(null)
    cboStore.setProgress(null)
    cboStore.setBusy(false)
    cboStore.setUseLlm(false)
    setCurrentPage('cbo')
  }

  return (
    <section className="cockpit-section">
      <div className="cockpit-section-header">
        <div>
          <span className="cockpit-eyebrow">Quick Start</span>
          <h2>현업이 바로 시작할 수 있는 작업</h2>
        </div>
      </div>
      <div className="cockpit-intake-box">
        <label className="cockpit-intake-label" htmlFor="cockpit-intake">
          사건/요청 요약
        </label>
        <textarea
          id="cockpit-intake"
          className="cockpit-intake-textarea"
          value={intakeSummary}
          onChange={(event) => setIntakeSummary(event.target.value)}
          placeholder="예: 월말 전표 생성 중 특정 사용자만 오류가 발생하고, SU53 결과는 값이 없다고 합니다."
          rows={3}
        />
        <p className="cockpit-intake-help">
          한두 문장으로 현재 상황을 적으면 적절한 workspace와 skill을 자동으로 맞춘 뒤 해당 화면으로 이동합니다.
        </p>
      </div>
      <div className="cockpit-workflow-grid">
        {QUICK_WORKFLOWS.map((workflow) => (
          <article key={workflow.id} className="cockpit-workflow-card">
            <div className="cockpit-workflow-header">
              <div>
                <strong>{workflow.title}</strong>
                <p>{workflow.description}</p>
              </div>
              <div className="cockpit-workflow-badges">
                <Badge variant="neutral">{DOMAIN_PACK_DETAILS[workflow.domainPack].label}</Badge>
                <Badge variant={workflow.securityMode === 'secure-local' ? 'success' : workflow.securityMode === 'reference' ? 'info' : 'warning'}>
                  {workflow.securityMode}
                </Badge>
              </div>
            </div>
            <Button variant="primary" size="sm" onClick={() => launchWorkflow(workflow)}>
              {workflow.cta}
              <ArrowRight size={14} aria-hidden="true" />
            </Button>
          </article>
        ))}
      </div>
    </section>
  )
}

// ─── AuditLogSection ───

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

function AuditLogSection() {
  const [securityMode, setSecurityMode] = useState<SecurityMode | ''>('')
  const [action, setAction] = useState<AuditAction | ''>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const hasFilters = securityMode || action || dateFrom || dateTo
  const filters: AuditSearchFilters = {}
  if (securityMode) filters.securityMode = securityMode
  if (action) filters.action = action
  if (dateFrom) filters.from = dateFrom
  if (dateTo) filters.to = dateTo

  const allQuery = useAuditLogs(50)
  const searchQuery = useAuditSearch(filters, Boolean(hasFilters))
  const { data: entries = [], isLoading } = hasFilters ? searchQuery : allQuery

  return (
    <div className="cockpit-audit-section">
      <div className="audit-filters">
        <select className="audit-filter-select" value={securityMode} onChange={(e) => setSecurityMode(e.target.value as SecurityMode | '')} aria-label="보안 모드 필터">
          {SECURITY_MODE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select className="audit-filter-select" value={action} onChange={(e) => setAction(e.target.value as AuditAction | '')} aria-label="액션 필터">
          {ACTION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <input type="date" className="audit-filter-input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} aria-label="시작 날짜" />
        <input type="date" className="audit-filter-input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} aria-label="종료 날짜" />
        <button className="audit-filter-reset" onClick={() => { setSecurityMode(''); setAction(''); setDateFrom(''); setDateTo('') }} type="button">초기화</button>
      </div>
      {isLoading ? (
        <div className="audit-empty">감사 로그를 불러오는 중...</div>
      ) : entries.length === 0 ? (
        <div className="audit-empty">감사 로그가 없어요</div>
      ) : (
        <AuditTable entries={entries} />
      )}
    </div>
  )
}

function AuditTable({ entries }: { entries: AuditLogEntry[] }) {
  return (
    <table className="audit-table">
      <thead>
        <tr>
          <th>시간</th>
          <th>액션</th>
          <th>보안 모드</th>
          <th>정책 결정</th>
          <th>Provider</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <tr key={entry.id}>
            <td>{formatTimestamp(entry.timestamp)}</td>
            <td>{entry.action}</td>
            <td>
              <Badge variant={entry.securityMode === 'secure-local' ? 'success' : entry.securityMode === 'reference' ? 'info' : 'warning'}>
                {entry.securityMode}
              </Badge>
            </td>
            <td><span className={policyBadgeClass(entry.policyDecision)}>{entry.policyDecision}</span></td>
            <td>{entry.provider ?? '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ─── CockpitPage ───

export function CockpitPage() {
  const { currentFilter, showAuditLog, setShowAuditLog } = useCockpitStore()
  const { data: sessions = [], isLoading, isError } = useSessionsFiltered(currentFilter)

  return (
    <div className="cockpit-page">
      <CockpitSidebar />
      <div className="cockpit-main">
        <div className="cockpit-header">
          <div>
            <h1 className="page-title">SAP Cockpit</h1>
            <p className="cockpit-header-copy">
              반복 문의, 장애 대응, CBO 분석을 업무 시작 화면에서 바로 열 수 있도록 구성된 운영 허브입니다.
            </p>
          </div>
          <Button
            variant={showAuditLog ? 'primary' : 'secondary'}
            size="sm"
            className={`cockpit-audit-toggle ${showAuditLog ? 'active' : ''}`}
            onClick={() => setShowAuditLog(!showAuditLog)}
            type="button"
          >
            {showAuditLog ? '세션 목록' : '감사 로그'}
          </Button>
        </div>

        {showAuditLog ? (
          <AuditLogSection />
        ) : (
          <>
            <SnapshotSection />
            <QuickStartSection />
            <section className="cockpit-section">
              <div className="cockpit-section-header">
                <div>
                  <span className="cockpit-eyebrow">Work Queue</span>
                  <h2>현재 세션과 작업 목록</h2>
                </div>
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
            </section>
          </>
        )}
      </div>
    </div>
  )
}
