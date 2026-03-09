import type { ClosingStep, StepStatus } from '../../../main/contracts'
import { useUpdateStep, useDeleteStep } from '../../hooks/useClosingPlans'
import { StepItem } from './StepItem'

interface StepListProps {
  steps: ClosingStep[]
  planId: string
  onEditStep: (step: ClosingStep) => void
}

export function StepList({ steps, planId, onEditStep }: StepListProps) {
  const updateStep = useUpdateStep()
  const deleteStep = useDeleteStep()

  function handleToggle(step: ClosingStep) {
    const nextStatus: StepStatus = step.status === 'completed' ? 'pending' : 'completed'
    updateStep.mutate({ stepId: step.id, update: { status: nextStatus } })
  }

  function handleDelete(step: ClosingStep) {
    deleteStep.mutate({ stepId: step.id, planId })
  }

  if (steps.length === 0) {
    return (
      <div className="closing-empty-steps">
        아직 Step이 없어요. 아래에서 추가해 보세요.
      </div>
    )
  }

  return (
    <div className="closing-step-list">
      {steps.map((step) => (
        <StepItem
          key={step.id}
          step={step}
          onToggleComplete={() => handleToggle(step)}
          onEdit={() => onEditStep(step)}
          onDelete={() => handleDelete(step)}
        />
      ))}
    </div>
  )
}
