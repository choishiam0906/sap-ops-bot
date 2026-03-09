import { CheckCircle, Info } from 'lucide-react'
import type { SecurityMode, DomainPack } from '../../../main/contracts.js'
import type { SettingsCategory } from './types.js'
import { SettingsCard } from '../ui/SettingsCard.js'
import { Badge } from '../ui/Badge.js'
import {
  useWorkspaceStore,
  SECURITY_MODE_DETAILS,
  DOMAIN_PACK_DETAILS,
} from '../../stores/workspaceStore.js'

const SECURITY_MODES: SecurityMode[] = ['secure-local', 'reference', 'hybrid-approved']
const DOMAIN_PACKS: DomainPack[] = ['ops', 'functional', 'cbo-maintenance', 'pi-integration', 'btp-rap-cap']

interface SettingsWorkspaceSectionProps {
  activeCategory: SettingsCategory
}

export function SettingsWorkspaceSection({ activeCategory }: SettingsWorkspaceSectionProps) {
  const { securityMode, setSecurityMode, domainPack, setDomainPack } = useWorkspaceStore()
  const currentModeDetail = SECURITY_MODE_DETAILS[securityMode]

  if (activeCategory === 'permissions') {
    const permissionSummary = {
      outbound: securityMode === 'secure-local' ? '차단' : securityMode === 'reference' ? '허용' : '승인 후 전달',
      approval: securityMode === 'hybrid-approved' ? '요약본 승인 필요' : '필요 없음',
    }

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
                  <p className="section-desc">현재 적용 중인 보안 정책이에요</p>
                </div>
                <SettingsCard>
                  <div className="settings-row">
                    <span className="row-label">Security Mode</span>
                    <div className="row-right">
                      <Badge variant={currentModeDetail.badgeVariant}>{currentModeDetail.label}</Badge>
                    </div>
                  </div>
                  <div className="settings-row">
                    <span className="row-label">외부 전송</span>
                    <div className="row-right">
                      <span className="row-value">{permissionSummary.outbound}</span>
                    </div>
                  </div>
                  <div className="settings-row">
                    <span className="row-label">승인 필요</span>
                    <div className="row-right">
                      <span className="row-value">{permissionSummary.approval}</span>
                    </div>
                  </div>
                </SettingsCard>
              </section>

              <section className="settings-section">
                <div className="info-card">
                  <Info size={16} className="info-card-icon" aria-hidden="true" />
                  <p>정책은 Workspace 카테고리에서 변경할 수 있어요.</p>
                </div>
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
                <h4 className="section-title">Security Mode</h4>
                <p className="section-desc">데이터 처리 방식과 외부 전송 정책을 설정해요</p>
              </div>
              <div className="workspace-mode-options">
                {SECURITY_MODES.map((mode) => {
                  const detail = SECURITY_MODE_DETAILS[mode]
                  const isActive = securityMode === mode
                  return (
                    <button
                      key={mode}
                      className={`workspace-mode-card ${isActive ? 'active' : ''}`}
                      onClick={() => setSecurityMode(mode)}
                      aria-pressed={isActive}
                    >
                      <div className="workspace-mode-check">
                        {isActive && <CheckCircle size={18} />}
                      </div>
                      <div className="workspace-mode-content">
                        <span className="workspace-mode-name">{detail.label}</span>
                        <span className="workspace-mode-desc">{detail.description}</span>
                        <span className="workspace-mode-policy">{detail.outboundPolicy}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>

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
                      <span className="workspace-pack-label">{detail.label}</span>
                      <span className="workspace-pack-desc">{detail.description}</span>
                    </button>
                  )
                })}
              </div>
              {DOMAIN_PACK_DETAILS[domainPack].recommendedSecurityMode !== securityMode && (
                <div className="workspace-recommend-banner">
                  <Info size={14} aria-hidden="true" />
                  <span>
                    이 Domain Pack의 권장 Security Mode는 <strong>{SECURITY_MODE_DETAILS[DOMAIN_PACK_DETAILS[domainPack].recommendedSecurityMode].label}</strong>이에요.
                  </span>
                </div>
              )}
            </section>

          </div>
        </div>
      </div>
    </div>
  )
}
