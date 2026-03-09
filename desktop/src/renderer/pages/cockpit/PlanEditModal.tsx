import { useState } from 'react'
import { X } from 'lucide-react'
import type { ClosingPlan, PlanType, PlanStatus } from '../../../main/contracts'
import { useUpdatePlan } from '../../hooks/useClosingPlans'

const PLAN_TYPES: { value: PlanType; label: string }[] = [
  { value: 'monthly', label: '월마감' },
  { value: 'quarterly', label: '분기마감' },
  { value: 'yearly', label: '연마감' },
  { value: 'custom', label: '커스텀' },
]

const PLAN_STATUSES: { value: PlanStatus; label: string }[] = [
  { value: 'in-progress', label: '진행 중' },
  { value: 'completed', label: '완료' },
  { value: 'delayed', label: '지연' },
]

interface PlanEditModalProps {
  plan: ClosingPlan
  onClose: () => void
}

export function PlanEditModal({ plan, onClose }: PlanEditModalProps) {
  const [title, setTitle] = useState(plan.title)
  const [description, setDescription] = useState(plan.description ?? '')
  const [type, setType] = useState<PlanType>(plan.type)
  const [targetDate, setTargetDate] = useState(plan.targetDate)
  const [status, setStatus] = useState<PlanStatus>(plan.status)
  const updatePlan = useUpdatePlan()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !targetDate) return

    updatePlan.mutate(
      {
        planId: plan.id,
        update: {
          title: title.trim(),
          description: description.trim() || undefined,
          type,
          targetDate,
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
          <h2>Plan 수정</h2>
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
                <span>상태</span>
                <select className="closing-select" value={status} onChange={(e) => setStatus(e.target.value as PlanStatus)}>
                  {PLAN_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="closing-field">
              <span>마감일</span>
              <input
                className="closing-input"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </label>
          </div>
          <div className="closing-modal-footer">
            <button type="button" className="closing-btn" onClick={onClose}>취소</button>
            <button
              type="submit"
              className="closing-btn primary"
              disabled={!title.trim() || !targetDate || updatePlan.isPending}
            >
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
