import { X, CheckCircle2, Loader2, XCircle, Clock } from 'lucide-react'
import type { AgentExecution, AgentStepResult } from '../../../main/contracts.js'
import { Badge } from '../../components/ui/Badge.js'

interface AgentExecutionModalProps {
  execution: AgentExecution
  onClose: () => void
}

function formatTime(iso?: string): string {
  if (!iso) return '-'
  try {
    return new Date(iso).toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return iso
  }
}

function stepStatusIcon(status: AgentStepResult['status']) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 size={14} className="agent-status-completed" aria-label="완료" />
    case 'running':
      return <Loader2 size={14} className="agent-status-running mcp-spinner" aria-label="실행 중" />
    case 'failed':
      return <XCircle size={14} className="agent-status-failed" aria-label="실패" />
    default:
      return <Clock size={14} className="agent-status-cancelled" aria-label="대기" />
  }
}

function statusLabel(status: AgentExecution['status']): string {
  switch (status) {
    case 'running': return '실행 중'
    case 'completed': return '완료'
    case 'failed': return '실패'
    case 'cancelled': return '취소됨'
  }
}

function statusVariant(status: AgentExecution['status']): 'success' | 'warning' | 'info' | 'neutral' {
  switch (status) {
    case 'completed': return 'success'
    case 'failed': return 'warning'
    case 'running': return 'info'
    default: return 'neutral'
  }
}

export function AgentExecutionModal({ execution, onClose }: AgentExecutionModalProps) {
  return (
    <div className="agent-modal-backdrop" onClick={onClose}>
      <div
        className="agent-modal"
        role="dialog"
        aria-label="실행 결과 상세"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="agent-modal-header">
          <div>
            <h2>실행 결과</h2>
            <p>
              <Badge variant={statusVariant(execution.status)}>{statusLabel(execution.status)}</Badge>
              {' '}
              {formatTime(execution.startedAt)}
              {execution.completedAt && ` ~ ${formatTime(execution.completedAt)}`}
            </p>
          </div>
          <button
            type="button"
            className="agent-modal-close"
            onClick={onClose}
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </div>

        <div className="agent-modal-body">
          {execution.errorMessage && (
            <div className="agent-modal-step-error">
              {execution.errorMessage}
            </div>
          )}

          {execution.stepResults.map((step) => (
            <div key={step.stepId} className="agent-modal-step">
              <div className="agent-modal-step-header">
                <span>{step.stepId}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {stepStatusIcon(step.status)}
                  <Badge variant="neutral">{step.skillId}</Badge>
                </div>
              </div>

              {step.output && (
                <div className="agent-modal-step-output">{step.output}</div>
              )}

              {step.error && (
                <div className="agent-modal-step-error">{step.error}</div>
              )}

              {(step.startedAt || step.completedAt) && (
                <div className="agent-modal-step-timing">
                  {step.startedAt && <span>시작: {formatTime(step.startedAt)}</span>}
                  {step.completedAt && <span> | 완료: {formatTime(step.completedAt)}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
