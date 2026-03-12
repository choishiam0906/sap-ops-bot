import { useEffect, useMemo, useState } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { ArrowRight, Bot, Clock, FolderOpen, History, Plus, Search, Trash2 } from 'lucide-react'
import type {
  AgentDefinition,
  RoutineKnowledgeLink,
  RoutineExecution,
  RoutineFrequency,
  SourceDocument,
  RoutineTemplate,
  RoutineTemplateStep,
  VaultEntry,
} from '../../../main/contracts.js'
import { Button } from '../../components/ui/Button.js'
import { Badge } from '../../components/ui/Badge.js'
import {
  useCreateRoutineTemplate,
  useDeleteRoutineTemplate,
  usePinRoutineKnowledgeLink,
  useRoutineKnowledgeLinks,
  useRoutineExecutions,
  useRoutineTemplates,
  useToggleRoutineTemplate,
  useUnpinRoutineKnowledgeLink,
} from '../../hooks/useRoutineTemplates.js'
import { useAppShellStore } from '../../stores/appShellStore.js'
import { DOMAIN_PACK_DETAILS, useWorkspaceStore } from '../../stores/workspaceStore.js'
import './ProcessHub.css'

const api = window.sapOpsDesktop

type ProcessFrequencyFilter = 'all' | 'active' | RoutineFrequency

interface ProcessDetail {
  template: RoutineTemplate
  steps: RoutineTemplateStep[]
}

interface RelatedKnowledgeBundle {
  confidentialVault: VaultEntry[]
  referenceVault: VaultEntry[]
  sourceDocuments: SourceDocument[]
}

interface ProcessStepDraft {
  title: string
  description: string
  module: string
}

interface ProcessDraft {
  name: string
  frequency: RoutineFrequency
  description: string
  triggerDay: string
  triggerMonth: string
  steps: ProcessStepDraft[]
}

const MODULE_OPTIONS = ['FI', 'CO', 'MM', 'SD', 'PP', 'BC', 'PI', 'BTP']

const PROCESS_FILTERS: { value: ProcessFrequencyFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'active', label: '활성' },
  { value: 'daily', label: '일간' },
  { value: 'monthly', label: '월간' },
  { value: 'yearly', label: '연간' },
]

function createEmptyDraft(): ProcessDraft {
  return {
    name: '',
    frequency: 'monthly',
    description: '',
    triggerDay: '',
    triggerMonth: '',
    steps: [{ title: '', description: '', module: 'FI' }],
  }
}

function frequencyLabel(frequency: RoutineFrequency): string {
  switch (frequency) {
    case 'daily':
      return 'Daily'
    case 'monthly':
      return 'Monthly'
    case 'yearly':
      return 'Yearly'
  }
}

function frequencyDescription(frequency: RoutineFrequency): string {
  switch (frequency) {
    case 'daily':
      return '매일 반복되는 운영 절차예요.'
    case 'monthly':
      return '월마감이나 정산처럼 정기적인 절차에 맞아요.'
    case 'yearly':
      return '연말 결산이나 대규모 점검 프로세스에 적합해요.'
  }
}

function categoryLabel(category: AgentDefinition['category']): string {
  switch (category) {
    case 'analysis':
      return '분석'
    case 'documentation':
      return '문서화'
    case 'validation':
      return '검증'
    case 'automation':
      return '자동화'
  }
}

function durationLabel(seconds: number): string {
  if (seconds < 60) return `${seconds}초`
  return `${Math.round(seconds / 60)}분`
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  } catch {
    return iso
  }
}

function formatTrigger(template: RoutineTemplate): string {
  if (template.frequency === 'daily') return '매일 기준으로 실행돼요'
  if (template.frequency === 'monthly') {
    return template.triggerDay ? `매월 ${template.triggerDay}일 기준` : '매월 일정 기준'
  }

  const monthText = template.triggerMonth ? `${template.triggerMonth}월` : '연간'
  const dayText = template.triggerDay ? ` ${template.triggerDay}일` : ''
  return `${monthText}${dayText} 기준`
}

function summarizeModules(steps: RoutineTemplateStep[]): string {
  const modules = Array.from(new Set(steps.map((step) => step.module).filter(Boolean)))
  if (modules.length === 0) return '모듈 정보 없음'
  return modules.join(' · ')
}

function normalizeText(parts: Array<string | undefined>): string {
  return parts.filter(Boolean).join(' ').toLowerCase()
}

function buildLinkKey(targetType: string, targetId: string): string {
  return `${targetType}:${targetId}`
}

function buildKnowledgeCandidates(template: RoutineTemplate, steps: RoutineTemplateStep[]): string[] {
  return Array.from(new Set([
    template.name,
    ...steps.map((step) => step.title),
    ...steps.map((step) => step.module),
  ].map((value) => value?.trim()).filter((value): value is string => Boolean(value && value.length >= 2))))
    .slice(0, 3)
}

function scoreKnowledgeMatch(haystack: string, candidates: string[], modules: string[]): number {
  let score = 1

  candidates.forEach((candidate, index) => {
    if (haystack.includes(candidate.toLowerCase())) {
      score += Math.max(2, 5 - index)
    }
  })

  modules.forEach((module) => {
    if (haystack.includes(module.toLowerCase())) {
      score += 2
    }
  })

  return score
}

function rankUniqueItems<T extends { id: string }>(items: T[], scorer: (item: T) => number, limit: number): T[] {
  const deduped = new Map<string, T>()
  items.forEach((item) => {
    if (!deduped.has(item.id)) {
      deduped.set(item.id, item)
    }
  })

  return [...deduped.values()]
    .sort((left, right) => scorer(right) - scorer(left))
    .slice(0, limit)
}

export function ProcessHub() {
  const domainPack = useWorkspaceStore((state) => state.domainPack)
  const packDetail = DOMAIN_PACK_DETAILS[domainPack]
  const navigateToKnowledge = useAppShellStore((state) => state.setSection)

  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [frequencyFilter, setFrequencyFilter] = useState<ProcessFrequencyFilter>('all')
  const [showCreator, setShowCreator] = useState(false)
  const [draft, setDraft] = useState<ProcessDraft>(() => createEmptyDraft())
  const [formError, setFormError] = useState<string | null>(null)

  const { data: templates = [], isLoading: isTemplatesLoading } = useRoutineTemplates()
  const { data: executions = [] } = useRoutineExecutions()
  const createMutation = useCreateRoutineTemplate()
  const deleteMutation = useDeleteRoutineTemplate()
  const toggleMutation = useToggleRoutineTemplate()
  const pinKnowledgeMutation = usePinRoutineKnowledgeLink()
  const unpinKnowledgeMutation = useUnpinRoutineKnowledgeLink()

  const { data: agents = [] } = useQuery({
    queryKey: ['agents', 'list', domainPack],
    queryFn: () => api.listAgents(domainPack),
    staleTime: 60_000,
  })

  const processDetailQueries = useQueries({
    queries: templates.map((template) => ({
      queryKey: ['routine:template', template.id],
      queryFn: async (): Promise<ProcessDetail | null> => api.getRoutineTemplate(template.id),
      staleTime: 60_000,
    })),
  })

  const processDetails = useMemo(() => {
    const detailMap = new Map<string, ProcessDetail>()
    processDetailQueries.forEach((query, index) => {
      if (query.data) {
        detailMap.set(templates[index].id, query.data)
      }
    })
    return detailMap
  }, [processDetailQueries, templates])

  const filteredTemplates = useMemo(() => {
    const search = searchQuery.trim().toLowerCase()
    return templates.filter((template) => {
      if (frequencyFilter === 'active' && !template.isActive) return false
      if (frequencyFilter !== 'all' && frequencyFilter !== 'active' && template.frequency !== frequencyFilter) return false
      if (!search) return true

      const detail = processDetails.get(template.id)
      const haystack = normalizeText([
        template.name,
        template.description,
        ...(detail?.steps.map((step) => `${step.title} ${step.description ?? ''} ${step.module ?? ''}`) ?? []),
      ])
      return haystack.includes(search)
    })
  }, [frequencyFilter, processDetails, searchQuery, templates])

  useEffect(() => {
    if (filteredTemplates.length === 0) {
      if (selectedProcessId) setSelectedProcessId(null)
      return
    }

    const selectedVisible = filteredTemplates.some((template) => template.id === selectedProcessId)
    if (!selectedVisible) {
      setSelectedProcessId(filteredTemplates[0].id)
    }
  }, [filteredTemplates, selectedProcessId])

  const selectedTemplate = filteredTemplates.find((template) => template.id === selectedProcessId)
    ?? templates.find((template) => template.id === selectedProcessId)
    ?? null
  const selectedSteps = selectedTemplate ? processDetails.get(selectedTemplate.id)?.steps ?? [] : []

  const selectedExecutions = useMemo(() => {
    if (!selectedTemplate) return []
    return [...executions]
      .filter((execution) => execution.templateId === selectedTemplate.id)
      .sort((a, b) => {
        if (a.executionDate !== b.executionDate) return b.executionDate.localeCompare(a.executionDate)
        return b.createdAt.localeCompare(a.createdAt)
      })
      .slice(0, 5)
  }, [executions, selectedTemplate])

  const { data: pinnedKnowledge = [] } = useRoutineKnowledgeLinks(selectedTemplate?.id ?? null)

  const activeTemplatesCount = templates.filter((template) => template.isActive).length
  const moduleCoverageCount = useMemo(() => {
    const modules = new Set<string>()
    processDetails.forEach((detail) => {
      detail.steps.forEach((step) => {
        if (step.module) modules.add(step.module)
      })
    })
    return modules.size
  }, [processDetails])

  const recommendedAgents = useMemo(() => {
    if (!selectedTemplate) return agents.slice(0, 3)

    const processText = normalizeText([
      selectedTemplate.name,
      selectedTemplate.description,
      ...selectedSteps.map((step) => `${step.title} ${step.description ?? ''} ${step.module ?? ''}`),
    ])
    const processModules = new Set(selectedSteps.map((step) => step.module?.toLowerCase()).filter(Boolean))

    return [...agents]
      .map((agent) => {
        let score = 1
        const agentText = normalizeText([
          agent.title,
          agent.description,
          ...agent.steps.map((step) => `${step.label} ${step.description ?? ''}`),
        ])

        processModules.forEach((module) => {
          if (module && agentText.includes(module)) score += 2
        })

        processText
          .split(/\s+/)
          .map((token) => token.trim())
          .filter((token) => token.length >= 3)
          .slice(0, 12)
          .forEach((token) => {
            if (agentText.includes(token)) score += 1
          })

        return { agent, score }
      })
      .sort((left, right) => right.score - left.score || left.agent.title.localeCompare(right.agent.title))
      .slice(0, 3)
      .map((entry) => entry.agent)
  }, [agents, selectedSteps, selectedTemplate])

  const pinnedKnowledgeMap = useMemo(() => {
    const entries = pinnedKnowledge.map((link) => [buildLinkKey(link.targetType, link.targetId), link] as const)
    return new Map(entries)
  }, [pinnedKnowledge])

  const knowledgeCandidates = useMemo(
    () => (selectedTemplate ? buildKnowledgeCandidates(selectedTemplate, selectedSteps) : []),
    [selectedSteps, selectedTemplate]
  )
  const selectedModules = useMemo(
    () => Array.from(new Set(selectedSteps.map((step) => step.module).filter(Boolean))) as string[],
    [selectedSteps]
  )

  const {
    data: relatedKnowledge,
    isLoading: isLoadingRelatedKnowledge,
  } = useQuery({
    queryKey: ['process', 'knowledge', selectedTemplate?.id, domainPack, knowledgeCandidates.join('|')],
    queryFn: async (): Promise<RelatedKnowledgeBundle> => {
      const [confidentialGroups, referenceGroups, sourceGroups] = await Promise.all([
        Promise.all(knowledgeCandidates.map((query) => api.searchVaultByClassification('confidential', query, 6))),
        Promise.all(knowledgeCandidates.map((query) => api.searchVaultByClassification('reference', query, 6))),
        Promise.all(knowledgeCandidates.map((query) => api.searchSourceDocuments({
          query,
          sourceKind: 'local-folder',
          domainPack,
          limit: 6,
        }))),
      ])

      const confidentialVault = rankUniqueItems(
        confidentialGroups.flat(),
        (entry) => scoreKnowledgeMatch(
          normalizeText([entry.title, entry.excerpt ?? '', entry.filePath ?? '']),
          knowledgeCandidates,
          selectedModules
        ),
        3
      )

      const referenceVault = rankUniqueItems(
        referenceGroups.flat(),
        (entry) => scoreKnowledgeMatch(
          normalizeText([entry.title, entry.excerpt ?? '', entry.filePath ?? '']),
          knowledgeCandidates,
          selectedModules
        ),
        3
      )

      const sourceDocuments = rankUniqueItems(
        sourceGroups.flat(),
        (document) => scoreKnowledgeMatch(
          normalizeText([document.title, document.relativePath, document.excerpt ?? '', document.tags.join(' ')]),
          knowledgeCandidates,
          selectedModules
        ),
        4
      )

      return {
        confidentialVault,
        referenceVault,
        sourceDocuments,
      }
    },
    enabled: !!selectedTemplate && knowledgeCandidates.length > 0,
    staleTime: 30_000,
  })

  function updateDraft<K extends keyof ProcessDraft>(key: K, value: ProcessDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function updateStep(index: number, key: keyof ProcessStepDraft, value: string) {
    setDraft((current) => ({
      ...current,
      steps: current.steps.map((step, stepIndex) => (
        stepIndex === index ? { ...step, [key]: value } : step
      )),
    }))
  }

  function addStep() {
    setDraft((current) => ({
      ...current,
      steps: [...current.steps, { title: '', description: '', module: 'FI' }],
    }))
  }

  function removeStep(index: number) {
    setDraft((current) => ({
      ...current,
      steps: current.steps.filter((_, stepIndex) => stepIndex !== index),
    }))
  }

  async function handleCreateProcess(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const steps = draft.steps
      .map((step, index) => ({
        title: step.title.trim(),
        description: step.description.trim() || undefined,
        module: step.module.trim() || undefined,
        sortOrder: index + 1,
      }))
      .filter((step) => step.title.length > 0)

    if (!draft.name.trim()) {
      setFormError('프로세스 이름을 입력해 주세요.')
      return
    }

    if (steps.length === 0) {
      setFormError('최소 한 개 이상의 단계를 정의해 주세요.')
      return
    }

    const triggerDay = draft.triggerDay ? Number.parseInt(draft.triggerDay, 10) : undefined
    const triggerMonth = draft.triggerMonth ? Number.parseInt(draft.triggerMonth, 10) : undefined

    setFormError(null)

    await createMutation.mutateAsync({
      name: draft.name.trim(),
      frequency: draft.frequency,
      description: draft.description.trim() || undefined,
      triggerDay: Number.isNaN(triggerDay) ? undefined : triggerDay,
      triggerMonth: Number.isNaN(triggerMonth) ? undefined : triggerMonth,
      steps,
    })

    setDraft(createEmptyDraft())
    setShowCreator(false)
  }

  async function handleDeleteProcess(template: RoutineTemplate) {
    const confirmed = window.confirm(`'${template.name}' 프로세스를 삭제할까요?`)
    if (!confirmed) return

    await deleteMutation.mutateAsync(template.id)
  }

  async function handleToggleProcess(template: RoutineTemplate) {
    await toggleMutation.mutateAsync(template.id)
  }

  async function handlePinKnowledge(link: Omit<RoutineKnowledgeLink, 'id' | 'createdAt'>) {
    await pinKnowledgeMutation.mutateAsync({
      templateId: link.templateId,
      targetType: link.targetType,
      targetId: link.targetId,
      title: link.title,
      excerpt: link.excerpt,
      location: link.location,
      classification: link.classification ?? null,
      sourceType: link.sourceType ?? null,
    })
  }

  async function handleUnpinKnowledge(linkId: string, templateId: string) {
    await unpinKnowledgeMutation.mutateAsync({ linkId, templateId })
  }

  return (
    <div className="process-hub">
      <section className="process-hero">
        <div className="process-hero-copy">
          <span className="process-hero-eyebrow">Process Definition</span>
          <h2>업무 절차를 프로세스로 정의하고, 단계와 자동화를 연결하세요</h2>
          <p>
            SAP에서는 절차가 곧 품질이에요. {packDetail.label} 관점의 업무 단계를 표준화하고,
            반복 가능한 루틴과 자동화를 같은 화면에서 정리해 두세요.
          </p>
        </div>
        <div className="process-hero-actions">
          <div className="process-domain-card">
            <span className="process-domain-label">현재 Domain Pack</span>
            <strong>{packDetail.label}</strong>
            <p>{packDetail.description}</p>
          </div>
          <div className="process-hero-button-row">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowCreator((current) => !current)}
            >
              <Plus size={14} aria-hidden="true" />
              {showCreator ? '작성 닫기' : '새 프로세스'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateToKnowledge('knowledge', 'agents')}
            >
              <Bot size={14} aria-hidden="true" />
              자동화 보기
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateToKnowledge('knowledge', 'vault')}
            >
              <FolderOpen size={14} aria-hidden="true" />
              관련 문서 보기
            </Button>
          </div>
        </div>
      </section>

      {showCreator && (
        <section className="process-builder" aria-label="새 프로세스 정의">
          <div className="process-builder-header">
            <div>
              <span className="process-section-eyebrow">Process Builder</span>
              <h3>새 프로세스를 정의하세요</h3>
              <p>루틴 템플릿을 기반으로 빈도, 단계, 모듈을 바로 정리할 수 있어요.</p>
            </div>
            <Badge variant="info">{frequencyDescription(draft.frequency)}</Badge>
          </div>

          <form className="process-builder-form" onSubmit={handleCreateProcess}>
            <div className="process-builder-grid">
              <label className="process-field">
                <span>프로세스 이름</span>
                <input
                  type="text"
                  value={draft.name}
                  onChange={(event) => updateDraft('name', event.target.value)}
                  placeholder="예: 월마감 전표 검증 프로세스"
                />
              </label>

              <label className="process-field">
                <span>빈도</span>
                <select
                  value={draft.frequency}
                  onChange={(event) => updateDraft('frequency', event.target.value as RoutineFrequency)}
                >
                  <option value="daily">Daily</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </label>

              {(draft.frequency === 'monthly' || draft.frequency === 'yearly') && (
                <label className="process-field">
                  <span>기준 일자</span>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={draft.triggerDay}
                    onChange={(event) => updateDraft('triggerDay', event.target.value)}
                    placeholder="25"
                  />
                </label>
              )}

              {draft.frequency === 'yearly' && (
                <label className="process-field">
                  <span>기준 월</span>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={draft.triggerMonth}
                    onChange={(event) => updateDraft('triggerMonth', event.target.value)}
                    placeholder="12"
                  />
                </label>
              )}
            </div>

            <label className="process-field process-field-full">
              <span>설명</span>
              <textarea
                value={draft.description}
                onChange={(event) => updateDraft('description', event.target.value)}
                rows={3}
                placeholder="이 프로세스가 어떤 업무 절차를 표준화하는지 적어 주세요."
              />
            </label>

            <div className="process-steps-builder">
              <div className="process-steps-builder-header">
                <div>
                  <span className="process-section-eyebrow">Process Steps</span>
                  <h4>단계를 정의하세요</h4>
                </div>
                <Button variant="ghost" size="sm" type="button" onClick={addStep}>
                  <Plus size={14} aria-hidden="true" />
                  단계 추가
                </Button>
              </div>

              {draft.steps.map((step, index) => (
                <div key={`draft-step-${index}`} className="process-step-editor">
                  <div className="process-step-editor-index">{index + 1}</div>
                  <div className="process-step-editor-fields">
                    <label className="process-field">
                      <span>단계 이름</span>
                      <input
                        type="text"
                        value={step.title}
                        onChange={(event) => updateStep(index, 'title', event.target.value)}
                        placeholder="예: 전표 대상 추출"
                      />
                    </label>
                    <label className="process-field">
                      <span>모듈</span>
                      <select
                        value={step.module}
                        onChange={(event) => updateStep(index, 'module', event.target.value)}
                      >
                        {MODULE_OPTIONS.map((module) => (
                          <option key={module} value={module}>{module}</option>
                        ))}
                      </select>
                    </label>
                    <label className="process-field process-field-full">
                      <span>단계 설명</span>
                      <textarea
                        rows={2}
                        value={step.description}
                        onChange={(event) => updateStep(index, 'description', event.target.value)}
                        placeholder="실행 기준이나 체크 포인트를 적어 주세요."
                      />
                    </label>
                  </div>
                  <button
                    type="button"
                    className="process-step-remove"
                    onClick={() => removeStep(index)}
                    disabled={draft.steps.length === 1}
                    aria-label={`단계 ${index + 1} 삭제`}
                    title="단계 삭제"
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>

            {formError && <div className="process-form-error">{formError}</div>}

            <div className="process-builder-actions">
              <Button variant="ghost" type="button" onClick={() => setShowCreator(false)}>
                닫기
              </Button>
              <Button type="submit" loading={createMutation.isPending}>
                프로세스 저장
              </Button>
            </div>
          </form>
        </section>
      )}

      <section className="process-summary-grid" aria-label="프로세스 요약">
        <article className="process-summary-card">
          <span className="process-section-eyebrow">Defined</span>
          <strong>{templates.length}</strong>
          <p>표준화된 프로세스 수</p>
        </article>
        <article className="process-summary-card">
          <span className="process-section-eyebrow">Active</span>
          <strong>{activeTemplatesCount}</strong>
          <p>현재 활성화된 루틴 템플릿</p>
        </article>
        <article className="process-summary-card">
          <span className="process-section-eyebrow">Modules</span>
          <strong>{moduleCoverageCount}</strong>
          <p>프로세스에 반영된 업무 모듈</p>
        </article>
        <article className="process-summary-card">
          <span className="process-section-eyebrow">Automation</span>
          <strong>{agents.length}</strong>
          <p>연결 가능한 에이전트 자산</p>
        </article>
      </section>

      <div className="process-workspace">
        <section className="process-list-panel" aria-label="프로세스 목록">
          <div className="process-panel-header">
            <div>
              <span className="process-section-eyebrow">Process Library</span>
              <h3>정의된 프로세스</h3>
              <p>검색과 빈도 기준으로 업무 절차를 빠르게 정리할 수 있어요.</p>
            </div>
          </div>

          <div className="process-toolbar">
            <label className="process-search-field">
              <Search size={14} aria-hidden="true" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="프로세스, 단계, 모듈 검색"
                aria-label="프로세스 검색"
              />
            </label>

            <div className="process-filter-row" role="tablist" aria-label="프로세스 필터">
              {PROCESS_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  className={`process-filter-pill ${frequencyFilter === filter.value ? 'active' : ''}`}
                  onClick={() => setFrequencyFilter(filter.value)}
                  aria-pressed={frequencyFilter === filter.value}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {isTemplatesLoading ? (
            <div className="process-empty-state">프로세스를 불러오는 중이에요...</div>
          ) : filteredTemplates.length === 0 ? (
            <div className="process-empty-state">
              <strong>정의된 프로세스가 없어요</strong>
              <p>루틴 템플릿을 프로세스로 정리해 두면 SAP 업무 흐름을 재사용하기 쉬워져요.</p>
              <Button variant="primary" size="sm" onClick={() => setShowCreator(true)}>
                <Plus size={14} aria-hidden="true" />
                첫 프로세스 만들기
              </Button>
            </div>
          ) : (
            <div className="process-card-list">
              {filteredTemplates.map((template) => {
                const detail = processDetails.get(template.id)
                const stepCount = detail?.steps.length ?? 0
                const modules = detail ? summarizeModules(detail.steps) : '단계 로딩 중'
                const isSelected = template.id === selectedProcessId

                return (
                  <button
                    key={template.id}
                    type="button"
                    className={`process-card ${isSelected ? 'active' : ''}`}
                    onClick={() => setSelectedProcessId(template.id)}
                  >
                    <div className="process-card-header">
                      <div>
                        <h4>{template.name}</h4>
                        <p>{template.description ?? '설명이 아직 없어요.'}</p>
                      </div>
                      <Badge variant={template.isActive ? 'success' : 'neutral'}>
                        {template.isActive ? '활성' : '비활성'}
                      </Badge>
                    </div>
                    <div className="process-card-meta">
                      <Badge variant="info">{frequencyLabel(template.frequency)}</Badge>
                      <span>{stepCount}개 단계</span>
                      <span>{modules}</span>
                    </div>
                    <div className="process-card-footer">
                      <span>{formatTrigger(template)}</span>
                      <ArrowRight size={14} aria-hidden="true" />
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        <section className="process-detail-panel" aria-label="프로세스 상세">
          {!selectedTemplate ? (
            <div className="process-empty-state process-empty-state-detail">
              <strong>프로세스를 선택해 주세요</strong>
              <p>좌측에서 프로세스를 고르면 단계, 자동화, 최근 실행 흐름을 함께 볼 수 있어요.</p>
            </div>
          ) : (
            <>
              <div className="process-detail-header">
                <div>
                  <span className="process-section-eyebrow">Process Detail</span>
                  <h3>{selectedTemplate.name}</h3>
                  <p>{selectedTemplate.description ?? '설명이 아직 없어요. 프로세스 목적을 한 줄로 추가해 보세요.'}</p>
                </div>
                <div className="process-detail-actions">
                  <Badge variant="info">{frequencyLabel(selectedTemplate.frequency)}</Badge>
                  <Badge variant={selectedTemplate.isActive ? 'success' : 'neutral'}>
                    {selectedTemplate.isActive ? '활성' : '비활성'}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleProcess(selectedTemplate)}
                    loading={toggleMutation.isPending}
                  >
                    {selectedTemplate.isActive ? '비활성화' : '활성화'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteProcess(selectedTemplate)}
                    loading={deleteMutation.isPending}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                    삭제
                  </Button>
                </div>
              </div>

              <div className="process-detail-highlight">
                <div>
                  <span className="process-highlight-label">실행 기준</span>
                  <strong>{formatTrigger(selectedTemplate)}</strong>
                </div>
                <div>
                  <span className="process-highlight-label">모듈 범위</span>
                  <strong>{summarizeModules(selectedSteps)}</strong>
                </div>
              </div>

              <div className="process-detail-grid">
                <article className="process-detail-section">
                  <div className="process-detail-section-header">
                    <span className="process-section-eyebrow">Steps</span>
                    <h4>{selectedSteps.length}개 단계</h4>
                  </div>
                  {selectedSteps.length === 0 ? (
                    <p className="process-detail-empty">아직 단계 상세를 불러오지 못했어요.</p>
                  ) : (
                    <ol className="process-steps-list">
                      {selectedSteps.map((step, index) => (
                        <li key={step.id} className="process-step-card">
                          <div className="process-step-number">{index + 1}</div>
                          <div>
                            <div className="process-step-title-row">
                              <strong>{step.title}</strong>
                              {step.module && <Badge variant="neutral">{step.module}</Badge>}
                            </div>
                            <p>{step.description ?? '설명 없이 정의된 단계예요.'}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </article>

                <article className="process-detail-section">
                  <div className="process-detail-section-header">
                    <span className="process-section-eyebrow">Automation</span>
                    <h4>연결 가능한 에이전트</h4>
                  </div>
                  {recommendedAgents.length === 0 ? (
                    <p className="process-detail-empty">현재 Domain Pack에 연결된 에이전트가 없어요.</p>
                  ) : (
                    <div className="process-agent-list">
                      {recommendedAgents.map((agent) => (
                        <div key={agent.id} className="process-agent-card">
                          <div className="process-agent-card-header">
                            <div>
                              <strong>{agent.title}</strong>
                              <p>{agent.description}</p>
                            </div>
                            <Badge variant="warning">{categoryLabel(agent.category)}</Badge>
                          </div>
                          <div className="process-agent-meta">
                            <span><Clock size={12} aria-hidden="true" /> {durationLabel(agent.estimatedDuration)}</span>
                            <span><Bot size={12} aria-hidden="true" /> {agent.steps.length}개 스텝</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="process-inline-link"
                    onClick={() => navigateToKnowledge('knowledge', 'agents')}
                  >
                    에이전트 탭에서 상세 보기
                    <ArrowRight size={14} aria-hidden="true" />
                  </Button>
                </article>
              </div>

              <article className="process-detail-section process-detail-section-wide">
                <div className="process-detail-section-header">
                  <div>
                    <span className="process-section-eyebrow">Related Knowledge</span>
                    <h4>관련 지식 자산</h4>
                  </div>
                  <div className="process-knowledge-actions">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigateToKnowledge('knowledge', 'vault')}
                    >
                      Vault 보기
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigateToKnowledge('knowledge', 'code-lab:sources')}
                    >
                      Code Lab 보기
                    </Button>
                  </div>
                </div>

                {knowledgeCandidates.length > 0 && (
                  <div className="process-knowledge-chip-row">
                    {knowledgeCandidates.map((candidate) => (
                      <span key={candidate} className="process-knowledge-chip">{candidate}</span>
                    ))}
                  </div>
                )}

                <div className="process-pinned-section">
                  <div className="process-knowledge-column-header">
                    <strong>Pinned Knowledge</strong>
                    <span>이 프로세스에 명시적으로 연결해 둔 문서와 소스예요.</span>
                  </div>
                  {pinnedKnowledge.length === 0 ? (
                    <p className="process-detail-empty">아직 고정한 자산이 없어요. 아래 추천 자산을 프로세스에 연결해 보세요.</p>
                  ) : (
                    <div className="process-pinned-list">
                      {pinnedKnowledge.map((link) => (
                        <div key={link.id} className="process-knowledge-card process-knowledge-card-pinned">
                          <div className="process-knowledge-card-header">
                            <div>
                              <strong>{link.title}</strong>
                              <p>{link.excerpt ?? '설명 없이 연결된 자산이에요.'}</p>
                            </div>
                            <div className="process-knowledge-card-actions">
                              <Badge variant={link.targetType === 'vault' ? 'warning' : 'neutral'}>
                                {link.targetType === 'vault' ? 'Vault' : 'Code Lab'}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUnpinKnowledge(link.id, link.templateId)}
                                loading={unpinKnowledgeMutation.isPending}
                              >
                                연결 해제
                              </Button>
                            </div>
                          </div>
                          <div className="process-knowledge-card-meta">
                            {link.classification && <span>{link.classification}</span>}
                            {link.sourceType && <span>{link.sourceType}</span>}
                            {link.location && <span>{link.location}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="process-knowledge-grid">
                  <div className="process-knowledge-column">
                    <div className="process-knowledge-column-header">
                      <strong>Vault</strong>
                      <span>프로세스와 맞는 운영 메모와 참조 문서를 보여줘요.</span>
                    </div>
                    {isLoadingRelatedKnowledge ? (
                      <p className="process-detail-empty">관련 문서를 찾는 중이에요...</p>
                    ) : (
                      <div className="process-knowledge-list">
                        {[...(relatedKnowledge?.confidentialVault ?? []), ...(relatedKnowledge?.referenceVault ?? [])].length === 0 ? (
                          <p className="process-detail-empty">연결된 Vault 문서를 아직 찾지 못했어요.</p>
                        ) : (
                          [...(relatedKnowledge?.confidentialVault ?? []), ...(relatedKnowledge?.referenceVault ?? [])].map((entry) => (
                            <div key={entry.id} className="process-knowledge-card">
                              <div className="process-knowledge-card-header">
                                <div>
                                  <strong>{entry.title}</strong>
                                  <p>{entry.excerpt ?? '요약이 없는 문서예요.'}</p>
                                </div>
                                <div className="process-knowledge-card-actions">
                                  <Badge variant={entry.classification === 'confidential' ? 'warning' : 'info'}>
                                    {entry.classification === 'confidential' ? '기밀' : '공개'}
                                  </Badge>
                                  <Button
                                    variant={pinnedKnowledgeMap.has(buildLinkKey('vault', entry.id)) ? 'secondary' : 'ghost'}
                                    size="sm"
                                    onClick={() => {
                                      const existingLink = pinnedKnowledgeMap.get(buildLinkKey('vault', entry.id))
                                      if (!selectedTemplate) return
                                      if (existingLink) {
                                        void handleUnpinKnowledge(existingLink.id, existingLink.templateId)
                                        return
                                      }
                                      void handlePinKnowledge({
                                        templateId: selectedTemplate.id,
                                        targetType: 'vault',
                                        targetId: entry.id,
                                        title: entry.title,
                                        excerpt: entry.excerpt ?? undefined,
                                        location: entry.filePath ?? undefined,
                                        classification: entry.classification,
                                        sourceType: entry.sourceType,
                                      })
                                    }}
                                    loading={pinKnowledgeMutation.isPending || unpinKnowledgeMutation.isPending}
                                  >
                                    {pinnedKnowledgeMap.has(buildLinkKey('vault', entry.id)) ? '연결 해제' : '프로세스에 연결'}
                                  </Button>
                                </div>
                              </div>
                              <div className="process-knowledge-card-meta">
                                <span>{entry.sourceType}</span>
                                {entry.filePath && <span>{entry.filePath}</span>}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  <div className="process-knowledge-column">
                    <div className="process-knowledge-column-header">
                      <strong>Code Lab</strong>
                      <span>프로세스와 가까운 로컬 소스와 분석 기반 문서를 추천해요.</span>
                    </div>
                    {isLoadingRelatedKnowledge ? (
                      <p className="process-detail-empty">관련 소스를 찾는 중이에요...</p>
                    ) : relatedKnowledge?.sourceDocuments.length ? (
                      <div className="process-knowledge-list">
                        {relatedKnowledge.sourceDocuments.map((document) => (
                          <div key={document.id} className="process-knowledge-card">
                            <div className="process-knowledge-card-header">
                              <div>
                                <strong>{document.title}</strong>
                                <p>{document.excerpt ?? '발췌 정보가 없는 소스예요.'}</p>
                              </div>
                              <div className="process-knowledge-card-actions">
                                <Badge variant="neutral">{document.classification ?? 'mixed'}</Badge>
                                <Button
                                  variant={pinnedKnowledgeMap.has(buildLinkKey('source-document', document.id)) ? 'secondary' : 'ghost'}
                                  size="sm"
                                  onClick={() => {
                                    const existingLink = pinnedKnowledgeMap.get(buildLinkKey('source-document', document.id))
                                    if (!selectedTemplate) return
                                    if (existingLink) {
                                      void handleUnpinKnowledge(existingLink.id, existingLink.templateId)
                                      return
                                    }
                                    void handlePinKnowledge({
                                      templateId: selectedTemplate.id,
                                      targetType: 'source-document',
                                      targetId: document.id,
                                      title: document.title,
                                      excerpt: document.excerpt ?? undefined,
                                      location: document.relativePath,
                                      classification: document.classification,
                                      sourceType: 'local-folder',
                                    })
                                  }}
                                  loading={pinKnowledgeMutation.isPending || unpinKnowledgeMutation.isPending}
                                >
                                  {pinnedKnowledgeMap.has(buildLinkKey('source-document', document.id)) ? '연결 해제' : '프로세스에 연결'}
                                </Button>
                              </div>
                            </div>
                            <div className="process-knowledge-card-meta">
                              <span>{document.relativePath}</span>
                              <span>{formatDate(document.indexedAt)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="process-detail-empty">관련 Code Lab 소스를 아직 찾지 못했어요.</p>
                    )}
                  </div>
                </div>
              </article>

              <article className="process-detail-section process-detail-section-wide">
                <div className="process-detail-section-header">
                  <span className="process-section-eyebrow">Recent Execution</span>
                  <h4>최근 실행 흐름</h4>
                </div>
                {selectedExecutions.length === 0 ? (
                  <p className="process-detail-empty">이 프로세스의 실행 이력이 아직 없어요.</p>
                ) : (
                  <div className="process-history-list">
                    {selectedExecutions.map((execution: RoutineExecution) => (
                      <div key={execution.id} className="process-history-card">
                        <div className="process-history-title">
                          <History size={14} aria-hidden="true" />
                          <strong>{execution.executionDate}</strong>
                        </div>
                        <div className="process-history-meta">
                          <span>Plan ID: {execution.planId}</span>
                          <span>생성일 {formatDate(execution.createdAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
