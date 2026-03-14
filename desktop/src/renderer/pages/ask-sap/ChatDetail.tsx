import { useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { ChatSession, SapSkillDefinition } from '../../../main/contracts.js'
import {
  useChatSession,
  useChatInput,
  useChatProvider,
  useChatError,
  useChatSkillSources,
  useChatStreaming,
} from '../../stores/chatStore.js'
import { useChatUIStore } from '../../stores/chatUIStore.js'
import { useMessages } from '../../hooks/useMessages.js'
import { useSendMessage } from '../../hooks/useSendMessage.js'
import { MessageList } from '../../components/chat/MessageList.js'
import { Composer } from '../../components/chat/Composer.js'
import { useWorkspaceStore } from '../../stores/workspaceStore.js'
import { ChatHeader } from './ChatHeader.js'
import { SkillSelector } from './SkillSelector.js'
import { SourceSelector } from './SourceSelector.js'
import { ExecutionMetaPanel } from './ExecutionMetaPanel.js'
import { EmptyState } from './EmptyState.js'
import { StreamingIndicator } from './StreamingIndicator.js'

const api = window.sapOpsDesktop

interface ChatDetailProps {
  currentSession: ChatSession | null
}

export function ChatDetail({ currentSession }: ChatDetailProps) {
  const queryClient = useQueryClient()
  const { currentSessionId, setCurrentSessionId } = useChatSession()
  const { input, setInput } = useChatInput()
  const { provider, model, setProvider, setModel } = useChatProvider()
  const { error, setError, clearError } = useChatError()
  const {
    selectedSkillId, selectedSourceIds, caseContext, lastExecutionMeta,
    setSelectedSkillId, setSelectedSourceIds, toggleSourceId, setLastExecutionMeta,
  } = useChatSkillSources()
  const {
    isStreaming, streamingContent, streamingMeta, resetStreaming,
  } = useChatStreaming()
  const { skillsCollapsed, sourcesCollapsed, toggleSkillsCollapsed, toggleSourcesCollapsed } = useChatUIStore()
  const domainPack = useWorkspaceStore((state) => state.domainPack)

  const { data: messages = [] } = useMessages(currentSessionId ?? null)
  const sendMutation = useSendMessage()
  const { data: skills = [] } = useQuery({
    queryKey: ['skills', 'all'],
    queryFn: () => api.listSkills(),
    staleTime: 60_000,
  })
  const { data: recommendations = [] } = useQuery({
    queryKey: ['skills', 'recommend', domainPack],
    queryFn: () => api.recommendSkills({ domainPack, dataType: 'chat' }),
    staleTime: 30_000,
  })
  const { data: sources = [] } = useQuery({
    queryKey: ['sources', domainPack, caseContext?.runId ?? '', caseContext?.filePath ?? '', caseContext?.objectName ?? ''],
    queryFn: () =>
      api.listSources({ domainPack, dataType: 'chat', caseContext: caseContext ?? undefined }),
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
        provider, model, message: text,
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

  function handleStop() {
    api.stopGeneration()
    resetStreaming()
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
      <ChatHeader domainPack={domainPack} selectedSkill={selectedSkill} caseContext={caseContext} />

      <div className="ask-sap-toolbar">
        <button
          type="button"
          className={`ask-sap-toolbar-toggle ${!skillsCollapsed ? 'active' : ''}`}
          onClick={toggleSkillsCollapsed}
          aria-expanded={!skillsCollapsed}
        >
          {skillsCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          Skills
          <span className="ask-sap-toolbar-count">
            {recommendedSkills.length || skills.length}
          </span>
        </button>
        <button
          type="button"
          className={`ask-sap-toolbar-toggle ${!sourcesCollapsed ? 'active' : ''}`}
          onClick={toggleSourcesCollapsed}
          aria-expanded={!sourcesCollapsed}
        >
          {sourcesCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          Sources
          <span className="ask-sap-toolbar-count">{selectedSourceIds.length}</span>
        </button>
      </div>

      <div className="ask-sap-content-area">
        {!skillsCollapsed && (
          <SkillSelector
            skills={skills}
            recommendedSkills={recommendedSkills}
            selectedSkill={selectedSkill}
            onSelect={handleSelectSkill}
          />
        )}
        {!sourcesCollapsed && (
          <SourceSelector
            sources={availableSources}
            selectedIds={selectedSourceIds}
            onToggle={toggleSourceId}
          />
        )}

        {lastExecutionMeta && <ExecutionMetaPanel meta={lastExecutionMeta} />}

        {messages.length > 0 ? (
          <MessageList messages={messages} />
        ) : (
          !isStreaming && (
            <EmptyState
              domainPack={domainPack}
              selectedSkill={selectedSkill}
              onSuggestionClick={setInput}
            />
          )
        )}

        {isStreaming && (
          <StreamingIndicator
            content={streamingContent}
            meta={streamingMeta}
            onStop={handleStop}
          />
        )}
      </div>

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
          : undefined}
        onSend={handleSend}
        onRemoveSource={toggleSourceId}
      />
    </div>
  )
}
