import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Sparkles, Wrench, ShieldCheck } from 'lucide-react'
import { Badge } from '../components/ui/Badge.js'
import { useWorkspaceStore, DOMAIN_PACK_DETAILS } from '../stores/workspaceStore.js'
import './SkillsPage.css'

const api = window.sapOpsDesktop

export function SkillsPage() {
  const domainPack = useWorkspaceStore((state) => state.domainPack)
  const securityMode = useWorkspaceStore((state) => state.securityMode)
  const packDetail = DOMAIN_PACK_DETAILS[domainPack]

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

  return (
    <div className="skills-page">
      <div className="skills-hero">
        <div>
          <h1 className="page-title">Skills</h1>
          <p className="skills-copy">
            `sap-skills`의 개념을 SAP 데스크톱 앱에 맞는 내부 Skill Pack으로 재구성한 영역입니다. 현재는
            CBO/운영 중심 pack을 우선 제공합니다.
          </p>
        </div>
        <div className="skills-badges">
          <Badge variant="neutral">{packDetail.label}</Badge>
          <Badge variant={securityMode === 'secure-local' ? 'success' : securityMode === 'reference' ? 'info' : 'warning'}>
            {securityMode}
          </Badge>
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
            <h2>내부 schema로 정리된 SAP skill catalog</h2>
          </div>
        </div>
        <div className="skills-card-grid">
          {skills.map((skill) => (
            <article key={skill.id} className="skill-card">
              <div className="skill-card-header">
                <div>
                  <strong>{skill.title}</strong>
                  <p>{skill.description}</p>
                </div>
                <Sparkles size={16} aria-hidden="true" />
              </div>
              <div className="skill-card-meta">
                <Badge variant="neutral">{skill.outputFormat}</Badge>
                {skill.supportedDomainPacks.map((item) => (
                  <Badge key={item} variant="info">{item}</Badge>
                ))}
              </div>
              <div className="skill-card-notes">
                <div>
                  <Wrench size={14} aria-hidden="true" />
                  <span>{skill.suggestedInputs[0] ?? '입력 예시 없음'}</span>
                </div>
                <div>
                  <ShieldCheck size={14} aria-hidden="true" />
                  <span>{skill.allowedSecurityModes.join(' / ')}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
