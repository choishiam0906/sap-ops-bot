// ─── 커스텀 에이전트 편집기 (폼 기반) ───

import { useState } from 'react'
import { Plus, Trash2, GripVertical, Save, Eye } from 'lucide-react'
import { Button } from '../ui/Button.js'
import { Badge } from '../ui/Badge.js'
import type { AgentDefinition, AgentCategory, AgentStep } from '../../../main/contracts.js'
import type { DomainPack } from '../../../main/contracts.js'

const api = window.sapOpsDesktop

const CATEGORY_OPTIONS: { value: AgentCategory; label: string }[] = [
  { value: 'analysis', label: '분석' },
  { value: 'documentation', label: '문서화' },
  { value: 'validation', label: '검증' },
  { value: 'automation', label: '자동화' },
]

const DOMAIN_PACK_OPTIONS: { value: DomainPack; label: string }[] = [
  { value: 'ops', label: 'Ops' },
  { value: 'functional', label: 'Functional' },
  { value: 'cbo-maintenance', label: 'CBO Maintenance' },
  { value: 'pi-integration', label: 'PI Integration' },
  { value: 'btp-rap-cap', label: 'BTP/RAP/CAP' },
]

interface AgentEditorProps {
  agent?: AgentDefinition
  availableSkillIds: string[]
  onSave: () => void
  onCancel: () => void
}

function createEmptyStep(index: number): AgentStep {
  return {
    id: `step-${index + 1}`,
    skillId: '',
    label: '',
    config: {},
    sortOrder: index + 1,
  }
}

export function AgentEditor({ agent, availableSkillIds, onSave, onCancel }: AgentEditorProps) {
  const [id, setId] = useState(agent?.id ?? '')
  const [title, setTitle] = useState(agent?.title ?? '')
  const [description, setDescription] = useState(agent?.description ?? '')
  const [category, setCategory] = useState<AgentCategory>(agent?.category ?? 'analysis')
  const [domainPacks, setDomainPacks] = useState<DomainPack[]>(agent?.domainPacks ?? ['ops'])
  const [estimatedDuration, setEstimatedDuration] = useState(agent?.estimatedDuration ?? 300)
  const [steps, setSteps] = useState<AgentStep[]>(
    agent?.steps.length ? agent.steps : [createEmptyStep(0)]
  )
  const [showPreview, setShowPreview] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function toggleDomainPack(dp: DomainPack) {
    setDomainPacks((prev) =>
      prev.includes(dp) ? prev.filter((d) => d !== dp) : [...prev, dp]
    )
  }

  function updateStep(index: number, patch: Partial<AgentStep>) {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }

  function removeStep(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index))
  }

  function addStep() {
    setSteps((prev) => [...prev, createEmptyStep(prev.length)])
  }

  function generateMarkdown(): string {
    const yamlSteps = steps.map((step) => {
      const lines = [
        `  - id: ${step.id}`,
        `    skillId: ${step.skillId}`,
        `    label: ${step.label}`,
        `    sortOrder: ${step.sortOrder}`,
      ]
      if (step.dependsOn && step.dependsOn.length > 0) {
        lines.push(`    dependsOn: [${step.dependsOn.join(', ')}]`)
      }
      return lines.join('\n')
    })

    return `---
id: ${id}
title: ${title}
description: ${description}
domainPacks: [${domainPacks.join(', ')}]
category: ${category}
estimatedDuration: ${estimatedDuration}
steps:
${yamlSteps.join('\n')}
---
`
  }

  async function handleSave() {
    setError('')
    if (!id.trim() || !title.trim() || steps.length === 0) {
      setError('ID, 제목, 최소 1개 스텝이 필요합니다.')
      return
    }
    for (const step of steps) {
      if (!step.id.trim() || !step.skillId.trim() || !step.label.trim()) {
        setError('모든 스텝에 ID, 스킬, 이름이 필요합니다.')
        return
      }
    }

    setSaving(true)
    try {
      const content = generateMarkdown()
      await api.saveCustomAgent(content, `${id}.agent.md`)
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
        <h2>{agent ? '에이전트 편집' : '새 에이전트 만들기'}</h2>
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
                placeholder="예: my-custom-workflow"
                disabled={!!agent}
              />
            </label>
            <label className="agent-editor-label">
              제목
              <input
                className="agent-editor-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 맞춤형 배포 검토"
              />
            </label>
          </div>

          <label className="agent-editor-label">
            설명
            <textarea
              className="agent-editor-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="이 에이전트가 하는 일을 설명하세요"
              rows={2}
            />
          </label>

          <div className="agent-editor-row">
            <label className="agent-editor-label">
              카테고리
              <select
                className="agent-editor-select"
                value={category}
                onChange={(e) => setCategory(e.target.value as AgentCategory)}
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>
            <label className="agent-editor-label">
              예상 소요 시간 (초)
              <input
                className="agent-editor-input"
                type="number"
                value={estimatedDuration}
                onChange={(e) => setEstimatedDuration(Number(e.target.value))}
                min={0}
              />
            </label>
          </div>

          <div className="agent-editor-label">
            도메인 팩
            <div className="agent-editor-checkboxes">
              {DOMAIN_PACK_OPTIONS.map((dp) => (
                <label key={dp.value} className="agent-editor-checkbox">
                  <input
                    type="checkbox"
                    checked={domainPacks.includes(dp.value)}
                    onChange={() => toggleDomainPack(dp.value)}
                  />
                  {dp.label}
                </label>
              ))}
            </div>
          </div>

          <div className="agent-editor-steps-header">
            <h3>스텝</h3>
            <Button variant="ghost" size="sm" onClick={addStep}>
              <Plus size={14} aria-hidden="true" />
              스텝 추가
            </Button>
          </div>

          {steps.map((step, index) => (
            <div key={index} className="agent-editor-step">
              <div className="agent-editor-step-grip">
                <GripVertical size={14} aria-hidden="true" />
                <Badge variant="neutral">{index + 1}</Badge>
              </div>
              <div className="agent-editor-step-fields">
                <div className="agent-editor-row">
                  <label className="agent-editor-label">
                    스텝 ID
                    <input
                      className="agent-editor-input"
                      value={step.id}
                      onChange={(e) => updateStep(index, { id: e.target.value })}
                      placeholder="예: analyze"
                    />
                  </label>
                  <label className="agent-editor-label">
                    스킬
                    <select
                      className="agent-editor-select"
                      value={step.skillId}
                      onChange={(e) => updateStep(index, { skillId: e.target.value })}
                    >
                      <option value="">스킬 선택...</option>
                      {availableSkillIds.map((skillId) => (
                        <option key={skillId} value={skillId}>{skillId}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="agent-editor-row">
                  <label className="agent-editor-label">
                    이름
                    <input
                      className="agent-editor-input"
                      value={step.label}
                      onChange={(e) => updateStep(index, { label: e.target.value })}
                      placeholder="예: Transport 리스크 분석"
                    />
                  </label>
                  <label className="agent-editor-label">
                    의존 스텝 (콤마 구분)
                    <input
                      className="agent-editor-input"
                      value={step.dependsOn?.join(', ') ?? ''}
                      onChange={(e) =>
                        updateStep(index, {
                          dependsOn: e.target.value
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                      placeholder="예: analyze, runbook"
                    />
                  </label>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeStep(index)}
                disabled={steps.length <= 1}
              >
                <Trash2 size={14} aria-hidden="true" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
