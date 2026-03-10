import { CheckCircle } from 'lucide-react'
import type { DomainPack } from '../../../main/contracts.js'
import type { SettingsCategory } from './types.js'
import { SettingsCard } from '../ui/SettingsCard.js'
import { Badge } from '../ui/Badge.js'
import {
  useWorkspaceStore,
  DOMAIN_PACK_DETAILS,
} from '../../stores/workspaceStore.js'

const DOMAIN_PACKS: DomainPack[] = ['ops', 'functional', 'cbo-maintenance', 'pi-integration', 'btp-rap-cap']

interface SettingsWorkspaceSectionProps {
  activeCategory: SettingsCategory
}

export function SettingsWorkspaceSection({ activeCategory }: SettingsWorkspaceSectionProps) {
  const { domainPack, setDomainPack } = useWorkspaceStore()

  if (activeCategory === 'permissions') {
    return (
      <div className="settings-panel page-enter">
        <div className="panel-header">
          <h3>Permissions</h3>
        </div>
        <div className="settings-scroll-area">
          <div className="settings-content">
            <div className="settings-sections">
              <section className="settings-section">
                <div className="section-header-group">
                  <h4 className="section-title">현재 정책</h4>
                  <p className="section-desc">인증된 엔터프라이즈 AI 서비스를 통해 안전하게 처리해요</p>
                </div>
                <SettingsCard>
                  <div className="settings-row">
                    <span className="row-label">외부 전송</span>
                    <div className="row-right">
                      <Badge variant="success">엔터프라이즈 보호</Badge>
                    </div>
                  </div>
                  <div className="settings-row">
                    <span className="row-label">Domain Pack</span>
                    <div className="row-right">
                      <span className="row-value">{DOMAIN_PACK_DETAILS[domainPack].label}</span>
                    </div>
                  </div>
                </SettingsCard>
              </section>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // workspace
  return (
    <div className="settings-panel page-enter">
      <div className="panel-header">
        <h3>Workspace</h3>
      </div>
      <div className="settings-scroll-area">
        <div className="settings-content">
          <div className="settings-sections">

            <section className="settings-section">
              <div className="section-header-group">
                <h4 className="section-title">Domain Pack</h4>
                <p className="section-desc">SAP 도메인별 최적화된 프롬프트와 지식을 선택해요</p>
              </div>
              <div className="workspace-pack-options">
                {DOMAIN_PACKS.map((pack) => {
                  const detail = DOMAIN_PACK_DETAILS[pack]
                  const isActive = domainPack === pack
                  return (
                    <button
                      key={pack}
                      className={`workspace-pack-card ${isActive ? 'active' : ''}`}
                      onClick={() => setDomainPack(pack)}
                      aria-pressed={isActive}
                    >
                      <div className="workspace-mode-check">
                        {isActive && <CheckCircle size={18} />}
                      </div>
                      <div className="workspace-mode-content">
                        <span className="workspace-pack-label">{detail.label}</span>
                        <span className="workspace-pack-desc">{detail.description}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  )
}
