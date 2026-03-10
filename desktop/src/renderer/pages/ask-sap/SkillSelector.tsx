import { CheckCircle2 } from 'lucide-react'
import type { SapSkillDefinition } from '../../../main/contracts.js'
import { Badge } from '../../components/ui/Badge.js'

interface SkillSelectorProps {
  skills: SapSkillDefinition[]
  recommendedSkills: SapSkillDefinition[]
  selectedSkill: SapSkillDefinition | null
  onSelect: (skill: SapSkillDefinition) => void
}

export function SkillSelector({ skills, recommendedSkills, selectedSkill, onSelect }: SkillSelectorProps) {
  const displaySkills = recommendedSkills.length > 0 ? recommendedSkills : skills

  return (
    <section className="chat-skill-panel chat-collapsible-panel" aria-label="추천 Skill">
      <div className="chat-panel-heading">
        <div>
          <span className="chat-panel-eyebrow">Recommended Skills</span>
          <h3>현재 워크스페이스에서 바로 실행할 작업</h3>
        </div>
      </div>
      <div className="chat-skill-grid">
        {displaySkills.map((skill) => (
          <button
            key={skill.id}
            type="button"
            className={`chat-skill-card ${selectedSkill?.id === skill.id ? 'active' : ''}`}
            onClick={() => onSelect(skill)}
          >
            <div className="chat-skill-card-header">
              <span className="chat-skill-title">{skill.title}</span>
              {selectedSkill?.id === skill.id && <CheckCircle2 size={16} aria-hidden="true" />}
            </div>
            <p>{skill.description}</p>
            <div className="chat-skill-chip-row">
              <Badge variant="neutral">{skill.outputFormat}</Badge>
              <Badge variant="info">{skill.supportedDomainPacks[0]}</Badge>
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}
