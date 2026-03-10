import {
  SettingsSection,
  SettingsCard,
  SettingsRow,
} from '../../components/settings/primitives/index.js'
import { Badge } from '../../components/ui/Badge.js'
import {
  useWorkspaceStore,
  DOMAIN_PACK_DETAILS,
} from '../../stores/workspaceStore.js'

export function PermissionsSettingsPage() {
  const { domainPack } = useWorkspaceStore()

  return (
    <div className="sp-page page-enter">
      <div className="sp-page-header">
        <h3>Permissions</h3>
      </div>
      <div className="sp-page-scroll">
        <div className="sp-page-body">
          <div className="sp-page-sections">

            <SettingsSection title="현재 정책" description="인증된 엔터프라이즈 AI 서비스를 통해 안전하게 처리해요">
              <SettingsCard>
                <SettingsRow label="외부 전송">
                  <Badge variant="success">엔터프라이즈 보호</Badge>
                </SettingsRow>
                <SettingsRow label="Domain Pack">
                  <span className="row-value">{DOMAIN_PACK_DETAILS[domainPack].label}</span>
                </SettingsRow>
              </SettingsCard>
            </SettingsSection>

          </div>
        </div>
      </div>
    </div>
  )
}
