import { Info } from 'lucide-react'
import type { SecurityMode, DomainPack } from '../../../main/contracts.js'
import {
  SettingsSection,
  SettingsRadioCard,
} from '../../components/settings/primitives/index.js'
import {
  useWorkspaceStore,
  SECURITY_MODE_DETAILS,
  DOMAIN_PACK_DETAILS,
} from '../../stores/workspaceStore.js'

const SECURITY_MODE_OPTIONS: { value: SecurityMode; label: string; description: string; meta: string }[] =
  (['secure-local', 'reference', 'hybrid-approved'] as const).map((mode) => ({
    value: mode,
    label: SECURITY_MODE_DETAILS[mode].label,
    description: SECURITY_MODE_DETAILS[mode].description,
    meta: SECURITY_MODE_DETAILS[mode].outboundPolicy,
  }))

const DOMAIN_PACK_OPTIONS: { value: DomainPack; label: string; description: string }[] =
  (['ops', 'functional', 'cbo-maintenance', 'pi-integration', 'btp-rap-cap'] as const).map((pack) => ({
    value: pack,
    label: DOMAIN_PACK_DETAILS[pack].label,
    description: DOMAIN_PACK_DETAILS[pack].description,
  }))

export function WorkspaceSettingsPage() {
  const { securityMode, setSecurityMode, domainPack, setDomainPack } = useWorkspaceStore()

  return (
    <div className="sp-page page-enter">
      <div className="sp-page-header">
        <h3>Workspace</h3>
      </div>
      <div className="sp-page-scroll">
        <div className="sp-page-body">
          <div className="sp-page-sections">

            <SettingsSection title="Security Mode" description="데이터 처리 방식과 외부 전송 정책을 설정해요">
              <SettingsRadioCard
                value={securityMode}
                options={SECURITY_MODE_OPTIONS}
                onChange={setSecurityMode}
                variant="stacked"
              />
            </SettingsSection>

            <SettingsSection title="Domain Pack" description="SAP 도메인별 최적화된 프롬프트와 지식을 선택해요">
              <SettingsRadioCard
                value={domainPack}
                options={DOMAIN_PACK_OPTIONS}
                onChange={setDomainPack}
                variant="grid"
                showCheck={false}
              />
              {DOMAIN_PACK_DETAILS[domainPack].recommendedSecurityMode !== securityMode && (
                <div className="workspace-recommend-banner">
                  <Info size={14} aria-hidden="true" />
                  <span>
                    이 Domain Pack의 권장 Security Mode는 <strong>{SECURITY_MODE_DETAILS[DOMAIN_PACK_DETAILS[domainPack].recommendedSecurityMode].label}</strong>이에요.
                  </span>
                </div>
              )}
            </SettingsSection>

          </div>
        </div>
      </div>
    </div>
  )
}
