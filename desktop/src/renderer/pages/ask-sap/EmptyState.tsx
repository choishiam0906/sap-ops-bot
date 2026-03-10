import { Sparkles, Code, ShieldCheck } from 'lucide-react'
import type { SapSkillDefinition } from '../../../main/contracts.js'
import { Badge } from '../../components/ui/Badge.js'
import type { DomainPack } from '../../stores/workspaceStore.js'
import { DOMAIN_PACK_DETAILS } from '../../stores/workspaceStore.js'

interface EmptyStateProps {
  domainPack: DomainPack
  selectedSkill: SapSkillDefinition | null
  onSuggestionClick: (text: string) => void
}

const SUGGESTION_ICONS = [Code, ShieldCheck, Sparkles]

const QUICK_START_CARDS = [
  { label: 'CBO 분석', description: '커스텀 코드 품질 점검' },
  { label: '운영 트리아지', description: 'ST22/SM21 기반 진단' },
  { label: '설명 보조', description: '현업 문의 응답 작성' },
]

const FREQUENT_TASKS = [
  'Transport 리스크 검토',
  'CBO 변경 영향 분석',
  'SAP 에러 메시지 설명',
]

export function EmptyState({ domainPack, selectedSkill, onSuggestionClick }: EmptyStateProps) {
  const packDetail = DOMAIN_PACK_DETAILS[domainPack]
  const suggestions = selectedSkill?.suggestedInputs.length
    ? selectedSkill.suggestedInputs
    : packDetail.suggestions

  return (
    <div className="chat-empty chat-empty--redesigned page-enter">
      <Sparkles size={40} className="empty-icon" aria-hidden="true" />
      <h2>새로운 대화를 시작하세요</h2>
      <p>SAP 업무를 효율적으로 지원해 드릴게요</p>

      <div className="chat-empty-meta">
        <Badge variant="neutral">{packDetail.label}</Badge>
        {selectedSkill && <Badge variant="info">{selectedSkill.title}</Badge>}
      </div>

      <div className="chat-empty-quickstart">
        <span className="chat-empty-section-label">빠른 시작</span>
        <div className="chat-empty-card-row">
          {QUICK_START_CARDS.map((card) => (
            <button
              key={card.label}
              type="button"
              className="chat-empty-card"
              onClick={() => onSuggestionClick(card.description)}
            >
              <strong>{card.label}</strong>
              <span>{card.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="chat-empty-frequent">
        <span className="chat-empty-section-label">자주 하는 작업</span>
        <div className="chat-suggestions">
          {suggestions.map((text, index) => {
            const Icon = SUGGESTION_ICONS[index % SUGGESTION_ICONS.length]
            return (
              <button key={text} className="suggestion-chip" onClick={() => onSuggestionClick(text)}>
                <Icon size={14} aria-hidden="true" />
                {text}
              </button>
            )
          })}
        </div>
      </div>

      <div className="chat-empty-frequent">
        <span className="chat-empty-section-label">추천 작업</span>
        <div className="chat-suggestions">
          {FREQUENT_TASKS.map((task, index) => {
            const Icon = SUGGESTION_ICONS[index % SUGGESTION_ICONS.length]
            return (
              <button key={task} className="suggestion-chip" onClick={() => onSuggestionClick(task)}>
                <Icon size={14} aria-hidden="true" />
                {task}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
