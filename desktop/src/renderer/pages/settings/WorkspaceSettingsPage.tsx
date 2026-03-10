import type { DomainPack } from '../../../main/contracts.js'
import {
  SettingsSection,
  SettingsRadioCard,
} from '../../components/settings/primitives/index.js'
import {
  useWorkspaceStore,
  DOMAIN_PACK_DETAILS,
} from '../../stores/workspaceStore.js'

const DOMAIN_PACK_OPTIONS: { value: DomainPack; label: string; description: string }[] =
  (['ops', 'functional', 'cbo-maintenance', 'pi-integration', 'btp-rap-cap'] as const).map((pack) => ({
    value: pack,
    label: DOMAIN_PACK_DETAILS[pack].label,
    description: DOMAIN_PACK_DETAILS[pack].description,
  }))

export function WorkspaceSettingsPage() {
  const { domainPack, setDomainPack } = useWorkspaceStore()

  return (
    <div className="sp-page page-enter">
      <div className="sp-page-header">
        <h3>Workspace</h3>
      </div>
      <div className="sp-page-scroll">
        <div className="sp-page-body">
          <div className="sp-page-sections">

            <SettingsSection title="Domain Pack" description="SAP 도메인별 최적화된 프롬프트와 지식을 선택해요">
              <SettingsRadioCard
                value={domainPack}
                options={DOMAIN_PACK_OPTIONS}
                onChange={setDomainPack}
                variant="grid"
                showCheck={false}
              />
            </SettingsSection>

          </div>
        </div>
      </div>
    </div>
  )
}
