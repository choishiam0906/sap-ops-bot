import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Sparkles, Wrench, ShieldCheck, X, FileCode, BookOpen, CheckCircle2, AlertCircle } from 'lucide-react'
import type { SapSkillDefinition } from '../../main/contracts.js'
import { Badge } from '../components/ui/Badge.js'
import { useWorkspaceStore, DOMAIN_PACK_DETAILS } from '../stores/workspaceStore.js'
import './SkillsPage.css'

const api = window.sapOpsDesktop

export function SkillsPage() {
  const domainPack = useWorkspaceStore((state) => state.domainPack)
  const packDetail = DOMAIN_PACK_DETAILS[domainPack]
  const [filterMode, setFilterMode] = useState<'compatible' | 'all'>('compatible')
  const [selectedSkill, setSelectedSkill] = useState<SapSkillDefinition | null>(null)

  const { data: skillPacks = [] } = useQuery({
    queryKey: ['skills', 'packs'],
    queryFn: () => api.listSkillPacks(),
    staleTime: 60_000,
  })

  const { data: skills = [] } = useQuery({
    queryKey: ['skills', 'all'],
    queryFn: () => api.listSkills(),
    staleTime: 60_000,
  })

  const visiblePacks = useMemo(
    () => skillPacks.filter((pack) => pack.domainPacks.includes(domainPack)),
    [domainPack, skillPacks]
  )

  const filteredSkills = useMemo(() => {
    if (filterMode === 'all') return skills
    return skills.filter(
      (skill) => skill.supportedDomainPacks.includes(domainPack)
    )
  }, [skills, domainPack, filterMode])

  function isCompatible(skill: SapSkillDefinition): boolean {
    return skill.supportedDomainPacks.includes(domainPack)
  }

  return (
    <div className="skills-page">
      <div className="skills-hero">
        <div>
          <h1 className="page-title">Skills</h1>
          <p className="skills-copy">
            워크스페이스 설정에 맞는 SAP Skill을 확인하고, 각 Skill의 상세 정보를 살펴볼 수 있습니다.
          </p>
        </div>
        <div className="skills-badges">
          <Badge variant="neutral">{packDetail.label}</Badge>
          <Badge variant="success">엔터프라이즈 보호</Badge>
        </div>
      </div>

      <section className="skills-section">
        <div className="skills-section-header">
          <div>
            <span className="skills-eyebrow">Skill Packs</span>
            <h2>현재 워크스페이스에서 활성인 pack</h2>
          </div>
        </div>
        <div className="skills-pack-grid">
          {visiblePacks.map((pack) => (
            <article key={pack.id} className="skills-pack-card">
              <div className="skills-pack-header">
                <div>
                  <strong>{pack.title}</strong>
                  <p>{pack.description}</p>
                </div>
                <Badge variant="info">{pack.audience}</Badge>
              </div>
              <div className="skills-pack-meta">
                {pack.domainPacks.map((item) => (
                  <Badge key={item} variant="neutral">{item}</Badge>
                ))}
                <Badge variant="neutral">{pack.skillIds.length} skills</Badge>
              </div>
            </article>
          ))}
          {visiblePacks.length === 0 && (
            <div className="skills-empty">현재 Domain Pack에 맞는 Skill Pack이 없습니다.</div>
          )}
        </div>
      </section>

      <section className="skills-section">
        <div className="skills-section-header">
          <div>
            <span className="skills-eyebrow">Curated Skills</span>
            <h2>SAP Skill Catalog</h2>
          </div>
          <div className="skills-filter-group">
            <button
              type="button"
              className={`skills-filter-btn ${filterMode === 'compatible' ? 'active' : ''}`}
              onClick={() => setFilterMode('compatible')}
            >
              호환 가능
            </button>
            <button
              type="button"
              className={`skills-filter-btn ${filterMode === 'all' ? 'active' : ''}`}
              onClick={() => setFilterMode('all')}
            >
              전체 보기
            </button>
            <Badge variant="neutral">{filteredSkills.length}개</Badge>
          </div>
        </div>
        <div className="skills-card-grid">
          {filteredSkills.map((skill) => {
            const compatible = isCompatible(skill)
            return (
              <article
                key={skill.id}
                className={`skill-card ${compatible ? '' : 'skill-card--incompatible'}`}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedSkill(skill)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setSelectedSkill(skill)
                  }
                }}
              >
                <div className="skill-card-header">
                  <div>
                    <strong>{skill.title}</strong>
                    <p>{skill.description}</p>
                  </div>
                  {compatible ? (
                    <CheckCircle2 size={16} className="skill-compat-icon" aria-label="호환 가능" />
                  ) : (
                    <AlertCircle size={16} className="skill-incompat-icon" aria-label="비호환" />
                  )}
                </div>
                <div className="skill-card-meta">
                  <Badge variant="neutral">{skill.outputFormat}</Badge>
                  {skill.supportedDomainPacks.map((item) => (
                    <Badge key={item} variant={item === domainPack ? 'info' : 'neutral'}>{item}</Badge>
                  ))}
                </div>
                <div className="skill-card-notes">
                  <div>
                    <Wrench size={14} aria-hidden="true" />
                    <span>{skill.suggestedInputs[0] ?? '입력 예시 없음'}</span>
                  </div>
                  {skill.suggestedTcodes.length > 0 && (
                    <div>
                      <FileCode size={14} aria-hidden="true" />
                      <span>{skill.suggestedTcodes.join(', ')}</span>
                    </div>
                  )}
                </div>
              </article>
            )
          })}
          {filteredSkills.length === 0 && (
            <div className="skills-empty">
              {filterMode === 'compatible'
                ? '현재 워크스페이스 설정과 호환되는 Skill이 없습니다. "전체 보기"를 눌러 확인하세요.'
                : '등록된 Skill이 없습니다.'}
            </div>
          )}
        </div>
      </section>

      {selectedSkill && (
        <div className="skill-modal-backdrop" onClick={() => setSelectedSkill(null)}>
          <div
            className="skill-modal"
            role="dialog"
            aria-label={`${selectedSkill.title} 상세`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="skill-modal-header">
              <div>
                <h2>{selectedSkill.title}</h2>
                <p>{selectedSkill.description}</p>
              </div>
              <button
                type="button"
                className="skill-modal-close"
                onClick={() => setSelectedSkill(null)}
                aria-label="닫기"
              >
                <X size={18} />
              </button>
            </div>

            <div className="skill-modal-body">
              <div className="skill-modal-section">
                <h3>
                  <CheckCircle2 size={14} aria-hidden="true" />
                  호환성
                </h3>
                <div className="skill-modal-compat">
                  <div>
                    <span className="skill-modal-label">Domain Pack</span>
                    <div className="skills-badges">
                      {selectedSkill.supportedDomainPacks.map((item) => (
                        <Badge key={item} variant={item === domainPack ? 'success' : 'neutral'}>{item}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="skill-modal-label">Data Type</span>
                    <div className="skills-badges">
                      {selectedSkill.supportedDataTypes.map((dt) => (
                        <Badge key={dt} variant="neutral">{dt}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="skill-modal-section">
                <h3>
                  <Wrench size={14} aria-hidden="true" />
                  입력 예시
                </h3>
                <ul className="skill-modal-list">
                  {selectedSkill.suggestedInputs.map((input) => (
                    <li key={input}>{input}</li>
                  ))}
                </ul>
              </div>

              {selectedSkill.suggestedTcodes.length > 0 && (
                <div className="skill-modal-section">
                  <h3>
                    <FileCode size={14} aria-hidden="true" />
                    관련 T-Code
                  </h3>
                  <div className="skills-badges">
                    {selectedSkill.suggestedTcodes.map((tcode) => (
                      <Badge key={tcode} variant="info">{tcode}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="skill-modal-section">
                <h3>
                  <BookOpen size={14} aria-hidden="true" />
                  필요 소스
                </h3>
                <div className="skills-badges">
                  {selectedSkill.requiredSources.map((src) => (
                    <Badge key={src} variant="neutral">{src}</Badge>
                  ))}
                </div>
              </div>

              <div className="skill-modal-section">
                <h3>
                  <ShieldCheck size={14} aria-hidden="true" />
                  출력 형식
                </h3>
                <Badge variant="info">{selectedSkill.outputFormat}</Badge>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
