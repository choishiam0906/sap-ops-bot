import { useState } from 'react'
import { X } from 'lucide-react'
import type { ClosingStep, SapLabel, StepStatus } from '../../../main/contracts'
import { SAP_LABELS } from '../../../main/types/session'
import { useUpdateStep } from '../../hooks/useClosingPlans'

const STEP_STATUSES: { value: StepStatus; label: string }[] = [
  { value: 'pending', label: '대기' },
  { value: 'in-progress', label: '진행 중' },
  { value: 'completed', label: '완료' },
]

interface StepEditModalProps {
  step: ClosingStep
  onClose: () => void
}

export function StepEditModal({ step, onClose }: StepEditModalProps) {
  const [title, setTitle] = useState(step.title)
  const [description, setDescription] = useState(step.description ?? '')
  const [assignee, setAssignee] = useState(step.assignee ?? '')
  const [module, setModule] = useState<SapLabel | ''>(step.module ?? '')
  const [deadline, setDeadline] = useState(step.deadline)
  const [status, setStatus] = useState<StepStatus>(step.status)
  const updateStep = useUpdateStep()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !deadline) return

    updateStep.mutate(
      {
        stepId: step.id,
        update: {
          title: title.trim(),
          description: description.trim() || undefined,
          assignee: assignee.trim() || undefined,
          module: module || undefined,
          deadline,
          status,
        },
      },
      { onSuccess: () => onClose() }
    )
  }

  return (
    <div className="closing-modal-backdrop" onClick={onClose}>
      <div className="closing-modal" onClick={(e) => e.stopPropagation()}>
        <div className="closing-modal-header">
          <h2>Step 수정</h2>
          <button type="button" className="cockpit-icon-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="closing-modal-body">
            <label className="closing-field">
              <span>제목</span>
              <input className="closing-input" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
            </label>
            <label className="closing-field">
              <span>설명 (선택)</span>
              <textarea
                className="closing-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </label>
            <div className="closing-field-row">
              <label className="closing-field" style={{ flex: 1 }}>
                <span>담당자</span>
                <input className="closing-input" value={assignee} onChange={(e) => setAssignee(e.target.value)} />
              </label>
              <label className="closing-field" style={{ flex: 1 }}>
                <span>모듈</span>
                <select className="closing-select" value={module} onChange={(e) => setModule(e.target.value as SapLabel | '')}>
                  <option value="">없음</option>
                  {SAP_LABELS.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="closing-field-row">
              <label className="closing-field" style={{ flex: 1 }}>
                <span>마감일</span>
                <input className="closing-input" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              </label>
              <label className="closing-field" style={{ flex: 1 }}>
                <span>상태</span>
                <select className="closing-select" value={status} onChange={(e) => setStatus(e.target.value as StepStatus)}>
                  {STEP_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <div className="closing-modal-footer">
            <button type="button" className="closing-btn" onClick={onClose}>취소</button>
            <button
              type="submit"
              className="closing-btn primary"
              disabled={!title.trim() || !deadline || updateStep.isPending}
            >
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
