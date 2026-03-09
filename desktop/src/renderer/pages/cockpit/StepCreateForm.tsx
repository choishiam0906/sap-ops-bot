import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { SapLabel } from '../../../main/contracts'
import { SAP_LABELS } from '../../../main/types/session'
import { useCreateStep } from '../../hooks/useClosingPlans'

interface StepCreateFormProps {
  planId: string
  defaultDeadline: string
}

export function StepCreateForm({ planId, defaultDeadline }: StepCreateFormProps) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [assignee, setAssignee] = useState('')
  const [module, setModule] = useState<SapLabel | ''>('')
  const [deadline, setDeadline] = useState(defaultDeadline)
  const createStep = useCreateStep()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    createStep.mutate(
      {
        planId,
        title: title.trim(),
        assignee: assignee.trim() || undefined,
        module: module || undefined,
        deadline,
      },
      {
        onSuccess: () => {
          setTitle('')
          setAssignee('')
          setModule('')
          setDeadline(defaultDeadline)
          setOpen(false)
        },
      }
    )
  }

  if (!open) {
    return (
      <button
        type="button"
        className="closing-add-step-btn"
        onClick={() => setOpen(true)}
      >
        <Plus size={14} />
        Step 추가
      </button>
    )
  }

  return (
    <form className="closing-step-create-form" onSubmit={handleSubmit}>
      <input
        className="closing-input"
        placeholder="Step 제목"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
      />
      <div className="closing-step-create-row">
        <input
          className="closing-input"
          placeholder="담당자"
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
          style={{ flex: 1 }}
        />
        <select
          className="closing-select"
          value={module}
          onChange={(e) => setModule(e.target.value as SapLabel | '')}
        >
          <option value="">모듈</option>
          {SAP_LABELS.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
        <input
          className="closing-input"
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />
      </div>
      <div className="closing-step-create-actions">
        <button type="submit" className="closing-btn primary" disabled={!title.trim() || createStep.isPending}>
          추가
        </button>
        <button type="button" className="closing-btn" onClick={() => setOpen(false)}>
          취소
        </button>
      </div>
    </form>
  )
}
