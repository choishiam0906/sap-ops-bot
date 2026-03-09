import { useState } from 'react'
import { X } from 'lucide-react'
import type { PlanType } from '../../../main/contracts'
import { useCreatePlan } from '../../hooks/useClosingPlans'

const PLAN_TYPES: { value: PlanType; label: string }[] = [
  { value: 'monthly', label: '월마감' },
  { value: 'quarterly', label: '분기마감' },
  { value: 'yearly', label: '연마감' },
  { value: 'custom', label: '커스텀' },
]

interface PlanCreateModalProps {
  onClose: () => void
}

export function PlanCreateModal({ onClose }: PlanCreateModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<PlanType>('monthly')
  const [targetDate, setTargetDate] = useState('')
  const createPlan = useCreatePlan()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !targetDate) return

    createPlan.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        targetDate,
      },
      { onSuccess: () => onClose() }
    )
  }

  return (
    <div className="closing-modal-backdrop" onClick={onClose}>
      <div className="closing-modal" onClick={(e) => e.stopPropagation()}>
        <div className="closing-modal-header">
          <h2>새 마감 Plan 생성</h2>
          <button type="button" className="cockpit-icon-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="closing-modal-body">
            <label className="closing-field">
              <span>제목</span>
              <input
                className="closing-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 3월 월마감"
                autoFocus
              />
            </label>
            <label className="closing-field">
              <span>설명 (선택)</span>
              <textarea
                className="closing-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="마감 프로세스 설명"
                rows={3}
              />
            </label>
            <div className="closing-field-row">
              <label className="closing-field" style={{ flex: 1 }}>
                <span>유형</span>
                <select className="closing-select" value={type} onChange={(e) => setType(e.target.value as PlanType)}>
                  {PLAN_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </label>
              <label className="closing-field" style={{ flex: 1 }}>
                <span>마감일</span>
                <input
                  className="closing-input"
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                />
              </label>
            </div>
          </div>
          <div className="closing-modal-footer">
            <button type="button" className="closing-btn" onClick={onClose}>취소</button>
            <button
              type="submit"
              className="closing-btn primary"
              disabled={!title.trim() || !targetDate || createPlan.isPending}
            >
              생성
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
