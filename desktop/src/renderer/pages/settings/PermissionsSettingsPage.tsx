import { Info } from 'lucide-react'
import {
  SettingsSection,
  SettingsCard,
  SettingsRow,
} from '../../components/settings/primitives/index.js'
import { Badge } from '../../components/ui/Badge.js'
import {
  useWorkspaceStore,
  SECURITY_MODE_DETAILS,
} from '../../stores/workspaceStore.js'

export function PermissionsSettingsPage() {
  const { securityMode } = useWorkspaceStore()
  const currentModeDetail = SECURITY_MODE_DETAILS[securityMode]

  const permissionSummary = {
    outbound: securityMode === 'secure-local' ? '차단' : securityMode === 'reference' ? '허용' : '승인 후 전달',
    approval: securityMode === 'hybrid-approved' ? '요약본 승인 필요' : '필요 없음',
  }

  return (
    <div className="sp-page page-enter">
      <div className="sp-page-header">
        <h3>Permissions</h3>
      </div>
      <div className="sp-page-scroll">
        <div className="sp-page-body">
          <div className="sp-page-sections">

            <SettingsSection title="현재 정책" description="현재 적용 중인 보안 정책이에요">
              <SettingsCard>
                <SettingsRow label="Security Mode">
                  <Badge variant={currentModeDetail.badgeVariant}>{currentModeDetail.label}</Badge>
                </SettingsRow>
                <SettingsRow label="외부 전송">
                  <span className="row-value">{permissionSummary.outbound}</span>
                </SettingsRow>
                <SettingsRow label="승인 필요">
                  <span className="row-value">{permissionSummary.approval}</span>
                </SettingsRow>
              </SettingsCard>
            </SettingsSection>

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
