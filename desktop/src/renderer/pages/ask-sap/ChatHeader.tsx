import type { CaseContext, SapSkillDefinition } from '../../../main/contracts.js'
import { Badge } from '../../components/ui/Badge.js'
import type { DomainPack } from '../../stores/workspaceStore.js'
import { DOMAIN_PACK_DETAILS } from '../../stores/workspaceStore.js'

interface ChatHeaderProps {
  domainPack: DomainPack
  selectedSkill: SapSkillDefinition | null
  caseContext: CaseContext | null
}

export function ChatHeader({ domainPack, selectedSkill, caseContext }: ChatHeaderProps) {
  const packDetail = DOMAIN_PACK_DETAILS[domainPack]

  return (
    <>
      <div className="chat-context-banner chat-context-banner--compact">
        <div className="chat-context-copy">
          <span className="chat-context-eyebrow">Active Workspace</span>
          <strong>{packDetail.label}</strong>
        </div>
        <div className="chat-context-badges">
          <Badge variant="neutral">{packDetail.label}</Badge>
          {selectedSkill && <Badge variant="info">{selectedSkill.title}</Badge>}
        </div>
      </div>

      {caseContext && (
        <div className="chat-case-banner">
          <div className="chat-case-copy">
            <span className="chat-panel-eyebrow">Case Context</span>
            <strong>{caseContext.objectName ?? caseContext.filePath?.split(/[\\/]/).pop() ?? 'Current analysis'}</strong>
            <p>
              {caseContext.filePath
                ? `현재 대화는 ${caseContext.filePath} 분석 결과를 기준으로 이어집니다.`
                : '현재 대화는 분석 결과 컨텍스트를 기준으로 이어집니다.'}
            </p>
          </div>
          <div className="chat-context-badges">
            {caseContext.runId && <Badge variant="neutral">Run {caseContext.runId}</Badge>}
            {caseContext.filePath && <Badge variant="info">source linked</Badge>}
          </div>
        </div>
      )}
    </>
  )
}
