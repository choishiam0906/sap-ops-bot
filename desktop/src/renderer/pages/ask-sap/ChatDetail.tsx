import { useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageSquare, Sparkles, ShieldCheck, Code, Database, CheckCircle2 } from 'lucide-react'
import type { ChatSession, SapSkillDefinition, SapSourceDefinition } from '../../../main/contracts.js'
import { useChatStore } from '../../stores/chatStore.js'
import { useMessages } from '../../hooks/useMessages.js'
import { useSendMessage } from '../../hooks/useSendMessage.js'
import { Badge } from '../../components/ui/Badge.js'
import { MessageList } from '../../components/chat/MessageList.js'
import { Composer } from '../../components/chat/Composer.js'
import {
  DOMAIN_PACK_DETAILS,
  SECURITY_MODE_DETAILS,
  useWorkspaceStore,
} from '../../stores/workspaceStore.js'

const api = window.sapOpsDesktop

interface ChatDetailProps {
  currentSession: ChatSession | null
}

export function ChatDetail({ currentSession }: ChatDetailProps) {
  const queryClient = useQueryClient()
  const {
    currentSessionId,
    input,
    provider,
    model,
    error,
    selectedSkillId,
    selectedSourceIds,
    caseContext,
    lastExecutionMeta,
    setCurrentSessionId,
    setInput,
    setProvider,
    setModel,
    setError,
    clearError,
    setSelectedSkillId,
    setSelectedSourceIds,
    toggleSourceId,
    setLastExecutionMeta,
  } = useChatStore()
  const securityMode = useWorkspaceStore((state) => state.securityMode)
  const domainPack = useWorkspaceStore((state) => state.domainPack)
  const modeDetail = SECURITY_MODE_DETAILS[securityMode]
  const packDetail = DOMAIN_PACK_DETAILS[domainPack]
  const suggestionIcons = [Code, ShieldCheck, Sparkles]

  const { data: messages = [] } = useMessages(currentSessionId ?? null)
  const sendMutation = useSendMessage()
  const { data: skills = [] } = useQuery({
    queryKey: ['skills', 'all'],
    queryFn: () => api.listSkills(),
    staleTime: 60_000,
  })
  const { data: recommendations = [] } = useQuery({
    queryKey: ['skills', 'recommend', domainPack, securityMode],
    queryFn: () => api.recommendSkills({ securityMode, domainPack, dataType: 'chat' }),
    staleTime: 30_000,
  })
  const { data: sources = [] } = useQuery({
    queryKey: ['sources', domainPack, securityMode, caseContext?.runId ?? '', caseContext?.filePath ?? '', caseContext?.objectName ?? ''],
    queryFn: () =>
      api.listSources({
        securityMode,
        domainPack,
        dataType: 'chat',
        caseContext: caseContext ?? undefined,
      }),
    staleTime: 30_000,
  })

  const displayError = error
  const recommendedSkills = useMemo(
    () => recommendations.map((item) => item.skill),
    [recommendations]
  )
  const fallbackSkill = useMemo(
    () => recommendedSkills[0] ?? skills.find((skill) => skill.id === 'cbo-impact-analysis') ?? skills[0] ?? null,
    [recommendedSkills, skills]
  )
  const selectedSkill =
    skills.find((skill) => skill.id === selectedSkillId) ??
    recommendedSkills.find((skill) => skill.id === selectedSkillId) ??
    fallbackSkill
  const availableSources = useMemo(
    () => sources.filter((source) => source.availability !== 'unavailable'),
    [sources]
  )

  function handleSend() {
    const text = input.trim()
    if (!text || sendMutation.isPending) return

    clearError()
    sendMutation.mutate(
      {
        sessionId: currentSession?.id,
        provider,
        model,
        message: text,
        skillId: selectedSkill?.id,
        sourceIds: selectedSourceIds,
        caseContext: caseContext ?? undefined,
      },
      {
        onSuccess: (result) => {
          setInput('')
          setCurrentSessionId(result.session.id)
          setLastExecutionMeta(result.meta)
          queryClient.invalidateQueries({ queryKey: ['messages', result.session.id] })
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : '메시지 전송에 실패했어요')
        },
      }
    )
  }

  function handleSelectSkill(skill: SapSkillDefinition) {
    setSelectedSkillId(skill.id)
    if (skill.suggestedInputs[0] && !input.trim()) {
      setInput(skill.suggestedInputs[0])
    }
  }

  function sourceLabel(source: SapSourceDefinition): string {
    if (source.availability === 'empty') return `${source.title} (비어 있음)`
    return source.title
  }

  useEffect(() => {
    if (!selectedSkillId && fallbackSkill) {
      setSelectedSkillId(fallbackSkill.id)
    }
  }, [fallbackSkill, selectedSkillId, setSelectedSkillId])

  useEffect(() => {
    if (!selectedSkill || availableSources.length === 0) return
    const recommended = selectedSkill.requiredSources.filter((id) =>
      availableSources.some((source) => source.id === id)
    )
    const currentValid = selectedSourceIds.filter((id) =>
      availableSources.some((source) => source.id === id)
    )
    if (currentValid.length === 0 && recommended.length > 0) {
      setSelectedSourceIds(recommended)
      return
    }
    if (currentValid.length !== selectedSourceIds.length) {
      setSelectedSourceIds(currentValid)
    }
  }, [availableSources, selectedSkill, selectedSourceIds, setSelectedSourceIds])

  return (
    <div className="ask-sap-chat-detail">
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
          {selectedSkill && <Badge variant="info">{selectedSkill.title}</Badge>}
        </div>
      </div>

      {caseContext && (
        <div className="chat-case-banner">
          <div className="chat-case-copy">
            <span className="chat-panel-eyebrow">Case Context</span>
            <strong>{caseContext.objectName ?? caseContext.filePath?.split(/[\\/]/).pop() ?? 'Current analysis'}</strong>
            <p>
              {caseContext.filePath
                ? `현재 대화는 ${caseContext.filePath} 분석 결과를 기준으로 이어집니다.`
                : '현재 대화는 분석 결과 컨텍스트를 기준으로 이어집니다.'}
            </p>
          </div>
          <div className="chat-context-badges">
            {caseContext.runId && <Badge variant="neutral">Run {caseContext.runId}</Badge>}
            {caseContext.filePath && <Badge variant="info">source linked</Badge>}
          </div>
        </div>
      )}

      <div className="chat-skill-shell">
        <section className="chat-skill-panel" aria-label="추천 Skill">
          <div className="chat-panel-heading">
            <div>
              <span className="chat-panel-eyebrow">Recommended Skills</span>
              <h3>현재 워크스페이스에서 바로 실행할 작업</h3>
            </div>
          </div>
          <div className="chat-skill-grid">
            {(recommendedSkills.length > 0 ? recommendedSkills : skills).map((skill) => (
              <button
                key={skill.id}
                type="button"
                className={`chat-skill-card ${selectedSkill?.id === skill.id ? 'active' : ''}`}
                onClick={() => handleSelectSkill(skill)}
              >
                <div className="chat-skill-card-header">
                  <span className="chat-skill-title">{skill.title}</span>
                  {selectedSkill?.id === skill.id && <CheckCircle2 size={16} aria-hidden="true" />}
                </div>
                <p>{skill.description}</p>
                <div className="chat-skill-chip-row">
                  <Badge variant="neutral">{skill.outputFormat}</Badge>
                  <Badge variant="info">{skill.supportedDomainPacks[0]}</Badge>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="chat-source-panel" aria-label="근거 Source">
          <div className="chat-panel-heading">
            <div>
              <span className="chat-panel-eyebrow">Evidence Sources</span>
              <h3>응답에 사용할 근거 범위</h3>
            </div>
            <Badge variant="neutral">{selectedSourceIds.length} selected</Badge>
          </div>
          <div className="chat-source-list">
            {availableSources.map((source) => {
              const checked = selectedSourceIds.includes(source.id)
              return (
                <label key={source.id} className={`chat-source-item ${checked ? 'selected' : ''}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleSourceId(source.id)}
                  />
                  <div>
                    <strong>{sourceLabel(source)}</strong>
                    <p>{source.description}</p>
                  </div>
                </label>
              )
            })}
          </div>
        </section>
      </div>

      {lastExecutionMeta && (
        <div className="chat-execution-meta">
          <div className="chat-panel-heading">
            <div>
              <span className="chat-panel-eyebrow">Last Execution</span>
              <h3>{lastExecutionMeta.skillTitle}</h3>
            </div>
            <div className="chat-context-badges">
              <Badge variant="info">{lastExecutionMeta.skillUsed}</Badge>
              <Badge variant="neutral">{lastExecutionMeta.sourceCount} sources</Badge>
            </div>
          </div>
          {lastExecutionMeta.suggestedTcodes.length > 0 && (
            <div className="chat-meta-inline">
              <span>T-code</span>
              {lastExecutionMeta.suggestedTcodes.map((tcode) => (
                <Badge key={tcode} variant="neutral">{tcode}</Badge>
              ))}
            </div>
          )}
          <div className="chat-meta-source-list">
            {lastExecutionMeta.sources.map((source) => (
              <div key={`${source.category}-${source.title}`} className="chat-meta-source">
                <Database size={14} aria-hidden="true" />
                <div>
                  <strong>{source.title}</strong>
                  <p>{source.description ?? source.category}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <MessageList messages={messages} />

      {messages.length === 0 && !useChatStore.getState().isStreaming && (
        <div className="chat-empty page-enter">
          <MessageSquare size={48} className="empty-icon" aria-hidden="true" />
          <h2>{packDetail.chatTitle}</h2>
          <p>{packDetail.chatDescription}</p>
          <div className="chat-empty-meta">
            <Badge variant={modeDetail.badgeVariant}>{modeDetail.outboundPolicy}</Badge>
            <Badge variant="neutral">{packDetail.label}</Badge>
            {selectedSkill && <Badge variant="info">{selectedSkill.title}</Badge>}
          </div>
          <div className="chat-suggestions">
            {(selectedSkill?.suggestedInputs.length ? selectedSkill.suggestedInputs : packDetail.suggestions).map((text, index) => {
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
        selectedSources={availableSources
          .filter((s) => selectedSourceIds.includes(s.id))
          .map((s) => ({ id: s.id, title: s.title }))}
        onInputChange={setInput}
        onProviderChange={setProvider}
        onModelChange={setModel}
        placeholder={selectedSkill
          ? `${selectedSkill.title}: ${selectedSkill.description}`
          : `${packDetail.inputPlaceholder} (${modeDetail.placeholderHint})`}
        onSend={handleSend}
        onRemoveSource={toggleSourceId}
      />
    </div>
  )
}
