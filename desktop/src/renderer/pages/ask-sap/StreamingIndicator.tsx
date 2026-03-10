import { Square } from 'lucide-react'
import { Badge } from '../../components/ui/Badge.js'

interface StreamingMeta {
  sources: Array<{ title: string; category: string; relevance_score: number }>
  suggested_tcodes: string[]
  skill_used: string
  skill_title?: string
  source_count?: number
}

interface StreamingIndicatorProps {
  content: string
  meta: StreamingMeta | null
  onStop: () => void
}

export function StreamingIndicator({ content, meta, onStop }: StreamingIndicatorProps) {
  return (
    <div className="streaming-indicator">
      {meta && (
        <div className="streaming-meta-badges">
          {meta.skill_title && <Badge variant="info">{meta.skill_title}</Badge>}
          {meta.source_count != null && <Badge variant="neutral">{meta.source_count} sources</Badge>}
        </div>
      )}

      {content ? (
        <div className="streaming-content">
          <span>{content}</span>
          <span className="streaming-cursor" aria-hidden="true">|</span>
        </div>
      ) : (
        <div className="streaming-dots" aria-label="응답 생성 중">
          <span className="streaming-dot" />
          <span className="streaming-dot" />
          <span className="streaming-dot" />
        </div>
      )}

      <button
        type="button"
        className="streaming-stop-btn"
        onClick={onStop}
        aria-label="응답 생성 중단"
      >
        <Square size={14} aria-hidden="true" />
        중단
      </button>
    </div>
  )
}
