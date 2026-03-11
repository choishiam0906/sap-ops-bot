// ─── 커스텀 스킬 편집기 (폼 기반) ───

import { useState } from 'react'
import { Save, Eye } from 'lucide-react'
import { Button } from '../ui/Button.js'
import type { SapSkillDefinition, SkillOutputFormat } from '../../../main/contracts.js'
import type { DomainPack } from '../../../main/contracts.js'

const api = window.sapOpsDesktop

const OUTPUT_FORMAT_OPTIONS: { value: SkillOutputFormat; label: string }[] = [
  { value: 'chat-answer', label: '채팅 답변' },
  { value: 'structured-report', label: '구조화 보고서' },
  { value: 'checklist', label: '체크리스트' },
  { value: 'explanation', label: '설명' },
]

const DOMAIN_PACK_OPTIONS: { value: DomainPack; label: string }[] = [
  { value: 'ops', label: 'Ops' },
  { value: 'functional', label: 'Functional' },
  { value: 'cbo-maintenance', label: 'CBO Maintenance' },
  { value: 'pi-integration', label: 'PI Integration' },
  { value: 'btp-rap-cap', label: 'BTP/RAP/CAP' },
]

const DATA_TYPE_OPTIONS = [
  { value: 'chat' as const, label: '채팅' },
  { value: 'cbo' as const, label: 'CBO' },
]

interface SkillEditorProps {
  skill?: SapSkillDefinition
  onSave: () => void
  onCancel: () => void
}

export function SkillEditor({ skill, onSave, onCancel }: SkillEditorProps) {
  const [id, setId] = useState(skill?.id ?? '')
  const [title, setTitle] = useState(skill?.title ?? '')
  const [description, setDescription] = useState(skill?.description ?? '')
  const [supportedDomainPacks, setSupportedDomainPacks] = useState<DomainPack[]>(
    skill?.supportedDomainPacks ?? ['ops']
  )
  const [supportedDataTypes, setSupportedDataTypes] = useState<Array<'chat' | 'cbo'>>(
    skill?.supportedDataTypes ?? ['chat']
  )
  const [outputFormat, setOutputFormat] = useState<SkillOutputFormat>(
    skill?.outputFormat ?? 'chat-answer'
  )
  const [promptTemplate, setPromptTemplate] = useState(skill?.defaultPromptTemplate ?? '')
  const [requiredSources, setRequiredSources] = useState(skill?.requiredSources.join(', ') ?? '')
  const [suggestedInputs, setSuggestedInputs] = useState(skill?.suggestedInputs.join('\n') ?? '')
  const [suggestedTcodes, setSuggestedTcodes] = useState(skill?.suggestedTcodes.join(', ') ?? '')
  const [showPreview, setShowPreview] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function toggleDomainPack(dp: DomainPack) {
    setSupportedDomainPacks((prev) =>
      prev.includes(dp) ? prev.filter((d) => d !== dp) : [...prev, dp]
    )
  }

  function toggleDataType(dt: 'chat' | 'cbo') {
    setSupportedDataTypes((prev) =>
      prev.includes(dt) ? prev.filter((d) => d !== dt) : [...prev, dt]
    )
  }

  function generateMarkdown(): string {
    const sources = requiredSources
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const inputs = suggestedInputs
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
    const tcodes = suggestedTcodes
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    const suggestedInputsYaml = inputs.length > 0
      ? `suggestedInputs:\n${inputs.map((i) => `  - "${i}"`).join('\n')}`
      : 'suggestedInputs: []'

    return `---
id: ${id}
title: ${title}
description: ${description}
supportedDomainPacks: [${supportedDomainPacks.join(', ')}]
supportedDataTypes: [${supportedDataTypes.join(', ')}]
outputFormat: ${outputFormat}
requiredSources: [${sources.join(', ')}]
${suggestedInputsYaml}
suggestedTcodes: [${tcodes.join(', ')}]
defaultPromptTemplate: |
${promptTemplate.split('\n').map((line) => `  ${line}`).join('\n')}
---
`
  }

  async function handleSave() {
    setError('')
    if (!id.trim() || !title.trim() || !promptTemplate.trim()) {
      setError('ID, 제목, 프롬프트 템플릿이 필요합니다.')
      return
    }

    setSaving(true)
    try {
      const content = generateMarkdown()
      await api.saveCustomSkill(content, `${id}.skill.md`)
      onSave()
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="agent-editor">
      <div className="agent-editor-header">
        <h2>{skill ? '스킬 편집' : '새 스킬 만들기'}</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="ghost" size="sm" onClick={() => setShowPreview(!showPreview)}>
            <Eye size={14} aria-hidden="true" />
            {showPreview ? '폼' : '미리보기'}
          </Button>
          <Button variant="secondary" size="sm" onClick={onCancel}>취소</Button>
          <Button variant="primary" size="sm" onClick={handleSave} loading={saving}>
            <Save size={14} aria-hidden="true" />
            저장
          </Button>
        </div>
      </div>

      {error && <div className="agent-editor-error">{error}</div>}

      {showPreview ? (
        <pre className="agent-editor-preview">{generateMarkdown()}</pre>
      ) : (
        <div className="agent-editor-form">
          <div className="agent-editor-row">
            <label className="agent-editor-label">
              ID
              <input
                className="agent-editor-input"
                value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder="예: my-custom-analysis"
                disabled={!!skill}
              />
            </label>
            <label className="agent-editor-label">
              제목
              <input
                className="agent-editor-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 내부 정책 기반 분석"
              />
            </label>
          </div>

          <label className="agent-editor-label">
            설명
            <textarea
              className="agent-editor-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="이 스킬이 하는 일을 설명하세요"
              rows={2}
            />
          </label>

          <div className="agent-editor-row">
            <label className="agent-editor-label">
              출력 형식
              <select
                className="agent-editor-select"
                value={outputFormat}
                onChange={(e) => setOutputFormat(e.target.value as SkillOutputFormat)}
              >
                {OUTPUT_FORMAT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="agent-editor-label">
            도메인 팩
            <div className="agent-editor-checkboxes">
              {DOMAIN_PACK_OPTIONS.map((dp) => (
                <label key={dp.value} className="agent-editor-checkbox">
                  <input
                    type="checkbox"
                    checked={supportedDomainPacks.includes(dp.value)}
                    onChange={() => toggleDomainPack(dp.value)}
                  />
                  {dp.label}
                </label>
              ))}
            </div>
          </div>

          <div className="agent-editor-label">
            데이터 타입
            <div className="agent-editor-checkboxes">
              {DATA_TYPE_OPTIONS.map((dt) => (
                <label key={dt.value} className="agent-editor-checkbox">
                  <input
                    type="checkbox"
                    checked={supportedDataTypes.includes(dt.value)}
                    onChange={() => toggleDataType(dt.value)}
                  />
                  {dt.label}
                </label>
              ))}
            </div>
          </div>

          <div className="agent-editor-row">
            <label className="agent-editor-label">
              필요 소스 (콤마 구분)
              <input
                className="agent-editor-input"
                value={requiredSources}
                onChange={(e) => setRequiredSources(e.target.value)}
                placeholder="예: vault-confidential, vault-reference"
              />
            </label>
            <label className="agent-editor-label">
              추천 T-Code (콤마 구분)
              <input
                className="agent-editor-input"
                value={suggestedTcodes}
                onChange={(e) => setSuggestedTcodes(e.target.value)}
                placeholder="예: SE80, SE11"
              />
            </label>
          </div>

          <label className="agent-editor-label">
            추천 질문 (줄바꿈 구분)
            <textarea
              className="agent-editor-textarea"
              value={suggestedInputs}
              onChange={(e) => setSuggestedInputs(e.target.value)}
              placeholder={"이 변경의 위험도를 평가해줘\n배포 전 점검 체크리스트를 만들어줘"}
              rows={3}
            />
          </label>

          <label className="agent-editor-label">
            프롬프트 템플릿
            <textarea
              className="agent-editor-textarea agent-editor-prompt"
              value={promptTemplate}
              onChange={(e) => setPromptTemplate(e.target.value)}
              placeholder="당신은 SAP 전문가입니다. 다음 기준으로 분석하세요..."
              rows={8}
            />
          </label>
        </div>
      )}
    </div>
  )
}
