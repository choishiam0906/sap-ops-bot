import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import type { SecurityMode, DomainPack } from '../../../main/contracts.js'
import { useSessionStats } from '../../hooks/useSessionsFiltered.js'
import { Badge } from '../../components/ui/Badge.js'
import { Button } from '../../components/ui/Button.js'
import { useAppShellStore } from '../../stores/appShellStore.js'
import { useChatStore } from '../../stores/chatStore.js'
import { useCboStore } from '../../stores/cboStore.js'
import { DOMAIN_PACK_DETAILS, useWorkspaceStore } from '../../stores/workspaceStore.js'

interface QuickWorkflow {
  id: string
  title: string
  description: string
  cta: string
  targetSection: 'ask-sap' | 'cbo'
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
    cta: 'Ask SAP 열기',
    targetSection: 'ask-sap',
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
    targetSection: 'ask-sap',
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
    targetSection: 'ask-sap',
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
    cta: 'CBO 분석 열기',
    targetSection: 'cbo',
    domainPack: 'cbo-maintenance',
    securityMode: 'secure-local',
    sourceIds: ['workspace-context', 'local-imported-files'],
    defaultPrompt: 'CBO 영향 분석 워크벤치로 이동합니다.',
    buildPrompt: (summary) =>
      summary ? `CBO 분석 준비 메모: ${summary}` : 'CBO 영향 분석 워크벤치로 이동합니다.',
  },
]

export function OverviewView() {
  const [intakeSummary, setIntakeSummary] = useState('')
  const { data: stats } = useSessionStats()
  const setSection = useAppShellStore((state) => state.setSection)
  const setDomainPack = useWorkspaceStore((state) => state.setDomainPack)
  const setSecurityMode = useWorkspaceStore((state) => state.setSecurityMode)
  const setInput = useChatStore((state) => state.setInput)
  const setCurrentSessionId = useChatStore((state) => state.setCurrentSessionId)
  const setSelectedSkillId = useChatStore((state) => state.setSelectedSkillId)
  const setSelectedSourceIds = useChatStore((state) => state.setSelectedSourceIds)
  const setLastExecutionMeta = useChatStore((state) => state.setLastExecutionMeta)

  const snapshotCards = [
    { label: '접수 세션', value: stats?.open ?? 0, tone: 'info' as const },
    { label: '분석중', value: stats?.analyzing ?? 0, tone: 'warning' as const },
    { label: '처리중', value: stats?.['in-progress'] ?? 0, tone: 'warning' as const },
    { label: '별표 항목', value: stats?.flagged ?? 0, tone: 'neutral' as const },
  ]

  function launchWorkflow(workflow: QuickWorkflow) {
    setDomainPack(workflow.domainPack)
    setSecurityMode(workflow.securityMode)

    if (workflow.targetSection === 'ask-sap') {
      setCurrentSessionId(null)
      setSelectedSkillId(workflow.skillId ?? '')
      setSelectedSourceIds(workflow.sourceIds)
      setLastExecutionMeta(null)
      setInput(
        intakeSummary.trim()
          ? workflow.buildPrompt(intakeSummary.trim())
          : workflow.defaultPrompt
      )
      setSection('ask-sap', 'all')
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
    setSection('cbo', 'new')
  }

  return (
    <>
      {/* Ops Snapshot */}
      <section className="cockpit-section">
        <div className="cockpit-section-header">
          <div>
            <span className="cockpit-eyebrow">Ops Snapshot</span>
            <h2>지금 확인할 운영 현황</h2>
          </div>
        </div>
        <div className="cockpit-snapshot-grid">
          {snapshotCards.map((card) => (
            <div key={card.label} className="cockpit-snapshot-card">
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <Badge variant={card.tone}>{card.label}</Badge>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Start */}
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
    </>
  )
}
