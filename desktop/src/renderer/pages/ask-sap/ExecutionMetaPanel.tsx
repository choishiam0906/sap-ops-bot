import { Database } from 'lucide-react'
import type { SkillExecutionMeta } from '../../../main/contracts.js'
import { Badge } from '../../components/ui/Badge.js'

interface ExecutionMetaPanelProps {
  meta: SkillExecutionMeta
}

export function ExecutionMetaPanel({ meta }: ExecutionMetaPanelProps) {
  return (
    <div className="chat-execution-meta">
      <div className="chat-panel-heading">
        <div>
          <span className="chat-panel-eyebrow">Last Execution</span>
          <h3>{meta.skillTitle}</h3>
        </div>
        <div className="chat-context-badges">
          <Badge variant="info">{meta.skillUsed}</Badge>
          <Badge variant="neutral">{meta.sourceCount} sources</Badge>
        </div>
      </div>
      {meta.suggestedTcodes.length > 0 && (
        <div className="chat-meta-inline">
          <span>T-code</span>
          {meta.suggestedTcodes.map((tcode) => (
            <Badge key={tcode} variant="neutral">{tcode}</Badge>
          ))}
        </div>
      )}
      <div className="chat-meta-source-list">
        {meta.sources.map((source) => (
          <div key={`${source.category}-${source.title}`} className="chat-meta-source">
            <Database size={14} aria-hidden="true" />
            <div>
              <strong>{source.title}</strong>
              <p>{source.description ?? source.category}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
