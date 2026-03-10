import type { SapSourceDefinition } from '../../../main/contracts.js'
import { Badge } from '../../components/ui/Badge.js'

interface SourceSelectorProps {
  sources: SapSourceDefinition[]
  selectedIds: string[]
  onToggle: (id: string) => void
}

function sourceLabel(source: SapSourceDefinition): string {
  if (source.availability === 'empty') return `${source.title} (비어 있음)`
  return source.title
}

export function SourceSelector({ sources, selectedIds, onToggle }: SourceSelectorProps) {
  return (
    <section className="chat-source-panel chat-collapsible-panel" aria-label="근거 Source">
      <div className="chat-panel-heading">
        <div>
          <span className="chat-panel-eyebrow">Evidence Sources</span>
          <h3>응답에 사용할 근거 범위</h3>
        </div>
        <Badge variant="neutral">{selectedIds.length} selected</Badge>
      </div>
      <div className="chat-source-list">
        {sources.map((source) => {
          const checked = selectedIds.includes(source.id)
          return (
            <label key={source.id} className={`chat-source-item ${checked ? 'selected' : ''}`}>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(source.id)}
              />
              <div>
                <strong>{sourceLabel(source)}</strong>
                <p>{source.description}</p>
              </div>
            </label>
          )
        })}
      </div>
    </section>
  )
}
