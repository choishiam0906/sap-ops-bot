import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Bot, Play, XCircle, CheckCircle2, Loader2, Clock,
  ArrowRight, History, Plus, Pencil, Trash2, FolderOpen,
} from 'lucide-react'
import type {
  AgentDefinition,
  AgentExecution,
  AgentExecutionSummary,
} from '../../../main/contracts.js'
import { Badge } from '../../components/ui/Badge.js'
import { Button } from '../../components/ui/Button.js'
import { useWorkspaceStore, DOMAIN_PACK_DETAILS } from '../../stores/workspaceStore.js'
import { AgentExecutionModal } from './AgentExecutionModal.js'
import { AgentEditor } from '../../components/knowledge/AgentEditor.js'
import '../../components/knowledge/AgentEditor.css'
import './AgentsCatalog.css'

const api = window.sapOpsDesktop

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ko-KR', {
      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}

function categoryLabel(category: AgentDefinition['category']): string {
  switch (category) {
    case 'analysis': return '분석'
    case 'documentation': return '문서화'
    case 'validation': return '검증'
    case 'automation': return '자동화'
  }
}

function durationLabel(seconds: number): string {
  if (seconds < 60) return `${seconds}초`
  return `${Math.round(seconds / 60)}분`
}

function executionStatusIcon(status: AgentExecutionSummary['status']) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 size={14} className="agent-status-completed" />
    case 'running':
      return <Loader2 size={14} className="agent-status-running mcp-spinner" />
    case 'failed':
      return <XCircle size={14} className="agent-status-failed" />
    default:
      return <Clock size={14} className="agent-status-cancelled" />
  }
}

export function AgentsCatalog() {
  const queryClient = useQueryClient()
  const domainPack = useWorkspaceStore((state) => state.domainPack)
  const packDetail = DOMAIN_PACK_DETAILS[domainPack]

  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [activeExecutionId, setActiveExecutionId] = useState<string | null>(null)
  const [modalExecution, setModalExecution] = useState<AgentExecution | null>(null)
  const [editorMode, setEditorMode] = useState<'hidden' | 'new' | 'edit'>('hidden')
  const [editingAgent, setEditingAgent] = useState<AgentDefinition | null>(null)

  // ─── 에이전트 목록 조회 ───
  const { data: agents = [] } = useQuery({
    queryKey: ['agents', 'list', domainPack],
    queryFn: () => api.listAgents(domainPack),
    staleTime: 60_000,
  })

  // ─── 스킬 목록 (에디터용) ───
  const { data: skills = [] } = useQuery({
    queryKey: ['skills', 'list'],
    queryFn: () => api.listSkills(),
    staleTime: 60_000,
  })

  const presetAgents = agents.filter((a) => !a.isCustom)
  const customAgents = agents.filter((a) => a.isCustom)

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) ?? null

  // ─── 실행 이력 조회 ───
  const { data: executions = [] } = useQuery({
    queryKey: ['agents', 'executions', selectedAgentId],
    queryFn: () => api.listAgentExecutions({ agentId: selectedAgentId ?? undefined, limit: 10 }),
    enabled: !!selectedAgentId,
    staleTime: 5_000,
  })

  // ─── 실행 중 상태 폴링 ───
  const { data: activeExecution } = useQuery({
    queryKey: ['agents', 'execution', activeExecutionId],
    queryFn: () => api.getAgentExecution(activeExecutionId!),
    enabled: !!activeExecutionId,
    refetchInterval: (query) => {
      const data = query.state.data
      if (data && data.status !== 'running') return false
      return 2000
    },
  })

  // 실행 완료 시 이력 갱신 & 폴링 중단
  if (activeExecution && activeExecution.status !== 'running') {
    if (activeExecutionId) {
      setActiveExecutionId(null)
      void queryClient.invalidateQueries({ queryKey: ['agents', 'executions'] })
    }
  }

  // ─── 실행 mutation ───
  const executeMutation = useMutation({
    mutationFn: (agentId: string) => api.executeAgent(agentId, domainPack),
    onSuccess: (executionId) => {
      setActiveExecutionId(executionId)
      void queryClient.invalidateQueries({ queryKey: ['agents', 'executions'] })
    },
  })

  // ─── 취소 mutation ───
  const cancelMutation = useMutation({
    mutationFn: (execId: string) => api.cancelAgentExecution(execId),
    onSuccess: () => {
      setActiveExecutionId(null)
      void queryClient.invalidateQueries({ queryKey: ['agents', 'executions'] })
    },
  })

  // ─── 이력 클릭 → 상세 모달 ───
  async function handleViewExecution(execId: string) {
    const exec = await api.getAgentExecution(execId)
    if (exec) setModalExecution(exec)
  }

  return (
    <div className="agents-page">
      <div className="agents-action-bar">
        <div className="agents-badges">
          <Badge variant="success">엔터프라이즈 보호</Badge>
          <Badge variant="neutral">{packDetail.label}</Badge>
        </div>
        <div className="agents-actions">
          <Button variant="ghost" size="sm" onClick={() => api.openAgentFolder()}>
            <FolderOpen size={14} aria-hidden="true" />
            폴더
          </Button>
          <Button variant="primary" size="sm" onClick={() => { setEditorMode('new'); setEditingAgent(null) }}>
            <Plus size={14} aria-hidden="true" />
            새 에이전트
          </Button>
        </div>
      </div>

      {/* ─── 에디터 모드 ─── */}
      {editorMode !== 'hidden' && (
        <AgentEditor
          agent={editingAgent ?? undefined}
          availableSkillIds={skills.map((s) => s.id)}
          onSave={() => {
            setEditorMode('hidden')
            setEditingAgent(null)
            void queryClient.invalidateQueries({ queryKey: ['agents'] })
          }}
          onCancel={() => {
            setEditorMode('hidden')
            setEditingAgent(null)
          }}
        />
      )}

      {editorMode === 'hidden' && (
      <div className="agents-grid">
        {/* ── 왼쪽: 에이전트 카드 목록 ── */}
        <section>
          {/* 프리셋 에이전트 */}
          {presetAgents.length > 0 && (
            <div className="agents-section-label">프리셋</div>
          )}
          <div className="agents-card-list">
            {agents.length === 0 && (
              <div className="agents-empty">
                현재 Domain Pack에 호환되는 에이전트가 없습니다.
              </div>
            )}
            {presetAgents.map((agent) => (
              <article
                key={agent.id}
                className={`agent-card ${selectedAgentId === agent.id ? 'active' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedAgentId(agent.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setSelectedAgentId(agent.id)
                  }
                }}
              >
                <div className="agent-card-header">
                  <div>
                    <strong>
                      <Bot size={14} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} aria-hidden="true" />
                      {agent.title}
                    </strong>
                    <p>{agent.description}</p>
                  </div>
                </div>
                <div className="agent-card-meta">
                  <Badge variant="info">{categoryLabel(agent.category)}</Badge>
                  <Badge variant="neutral">{durationLabel(agent.estimatedDuration)}</Badge>
                  <Badge variant="neutral">{agent.steps.length} steps</Badge>
                  {agent.domainPacks.map((dp) => (
                    <Badge key={dp} variant={dp === domainPack ? 'success' : 'neutral'}>{dp}</Badge>
                  ))}
                </div>
              </article>
            ))}
          </div>

          {/* 커스텀 에이전트 */}
          {customAgents.length > 0 && (
            <>
              <div className="agents-section-label" style={{ marginTop: 16 }}>내가 만든 에이전트</div>
              <div className="agents-card-list">
                {customAgents.map((agent) => (
                  <article
                    key={agent.id}
                    className={`agent-card agent-card--custom ${selectedAgentId === agent.id ? 'active' : ''}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedAgentId(agent.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setSelectedAgentId(agent.id)
                      }
                    }}
                  >
                    <div className="agent-card-header">
                      <div>
                        <strong>
                          <Bot size={14} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} aria-hidden="true" />
                          {agent.title}
                        </strong>
                        <p>{agent.description}</p>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          className="agent-card-action-btn"
                          onClick={(e) => { e.stopPropagation(); setEditingAgent(agent); setEditorMode('edit') }}
                          aria-label="편집"
                          title="편집"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          className="agent-card-action-btn"
                          onClick={async (e) => {
                            e.stopPropagation()
                            await api.deleteCustomAgent(`${agent.id}.agent.md`)
                            void queryClient.invalidateQueries({ queryKey: ['agents'] })
                          }}
                          aria-label="삭제"
                          title="삭제"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    <div className="agent-card-meta">
                      <Badge variant="info">{categoryLabel(agent.category)}</Badge>
                      <Badge variant="warning">커스텀</Badge>
                      <Badge variant="neutral">{agent.steps.length} steps</Badge>
                      {agent.domainPacks.map((dp) => (
                        <Badge key={dp} variant={dp === domainPack ? 'success' : 'neutral'}>{dp}</Badge>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>

        {/* ── 오른쪽: 상세 패널 ── */}
        <section>
          {!selectedAgent ? (
            <div className="agent-detail-panel">
              <div className="agents-detail-empty">
                왼쪽에서 에이전트를 선택하면 상세 정보를 확인할 수 있어요.
              </div>
            </div>
          ) : (
            <div className="agent-detail-panel">
              <div className="agent-detail-header">
                <div>
                  <h2>{selectedAgent.title}</h2>
                  <p>{selectedAgent.description}</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {activeExecutionId && activeExecution?.status === 'running' ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => cancelMutation.mutate(activeExecutionId)}
                      loading={cancelMutation.isPending}
                    >
                      <XCircle size={14} aria-hidden="true" />
                      취소
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => executeMutation.mutate(selectedAgent.id)}
                      loading={executeMutation.isPending}
                    >
                      <Play size={14} aria-hidden="true" />
                      실행
                    </Button>
                  )}
                </div>
              </div>

              {/* 파이프라인 스텝 시각화 */}
              <div className="agent-pipeline">
                {selectedAgent.steps
                  .slice()
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((step, index) => {
                    const runningResult = activeExecution?.stepResults.find(
                      (r) => r.stepId === step.id
                    )
                    const stepStatus = runningResult?.status ?? 'pending'

                    return (
                      <div key={step.id} className="agent-step">
                        <div className={`agent-step-icon ${stepStatus}`}>
                          {stepStatus === 'completed' ? (
                            <CheckCircle2 size={14} />
                          ) : stepStatus === 'running' ? (
                            <Loader2 size={14} className="mcp-spinner" />
                          ) : stepStatus === 'failed' ? (
                            <XCircle size={14} />
                          ) : (
                            index + 1
                          )}
                        </div>
                        <div className="agent-step-content">
                          <div className="agent-step-label">
                            {step.label}
                            {step.dependsOn && step.dependsOn.length > 0 && (
                              <span style={{ marginLeft: 8, color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)' }}>
                                <ArrowRight size={10} style={{ verticalAlign: 'middle' }} /> {step.dependsOn.join(', ')}
                              </span>
                            )}
                          </div>
                          <div className="agent-step-skill">{step.skillId}</div>
                        </div>
                      </div>
                    )
                  })}
              </div>

              {/* 실행 히스토리 */}
              <div className="agent-history-section">
                <div className="agent-history-header">
                  <h3>
                    <History size={14} style={{ verticalAlign: 'text-bottom', marginRight: 4 }} aria-hidden="true" />
                    실행 이력
                  </h3>
                  <Badge variant="neutral">{executions.length}건</Badge>
                </div>

                <div className="agent-history-list">
                  {executions.length === 0 && (
                    <div className="agents-empty">아직 실행 이력이 없습니다.</div>
                  )}
                  {executions.map((exec) => (
                    <div
                      key={exec.id}
                      className="agent-history-row"
                      role="button"
                      tabIndex={0}
                      onClick={() => handleViewExecution(exec.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          void handleViewExecution(exec.id)
                        }
                      }}
                    >
                      <div className="agent-history-row-info">
                        {executionStatusIcon(exec.status)}
                        <span>{formatTimestamp(exec.startedAt)}</span>
                      </div>
                      <div className="agent-history-row-meta">
                        <span>{exec.completedSteps}/{exec.stepCount} steps</span>
                        <Badge variant={
                          exec.status === 'completed' ? 'success' :
                          exec.status === 'failed' ? 'warning' :
                          exec.status === 'running' ? 'info' : 'neutral'
                        }>
                          {exec.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
      )}

      {/* 실행 결과 상세 모달 */}
      {modalExecution && (
        <AgentExecutionModal
          execution={modalExecution}
          onClose={() => setModalExecution(null)}
        />
      )}
    </div>
  )
}
