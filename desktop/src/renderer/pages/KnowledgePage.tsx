import { FolderSearch, Globe, PlugZap, Database } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Badge } from '../components/ui/Badge.js'
import { useAppShellStore } from '../stores/appShellStore.js'
import type { KnowledgeSubPage } from '../stores/appShellStore.js'
import { useWorkspaceStore, DOMAIN_PACK_DETAILS, SECURITY_MODE_DETAILS } from '../stores/workspaceStore.js'
import { SourcesSection } from './knowledge/SourcesSection.js'
import { VaultSection } from './knowledge/VaultSection.js'
import './SourcesPage.css'
import './KnowledgeVaultPage.css'

const KNOWLEDGE_TABS: { id: KnowledgeSubPage; label: string; Icon: LucideIcon }[] = [
  { id: 'local-folders', label: 'Local Folders', Icon: FolderSearch },
  { id: 'apis', label: 'APIs', Icon: Globe },
  { id: 'mcps', label: 'MCPs', Icon: PlugZap },
  { id: 'vault', label: 'Vault', Icon: Database },
]

export function KnowledgePage() {
  const subPage = useAppShellStore((state) => state.subPage) as KnowledgeSubPage | null
  const setSubPage = useAppShellStore((state) => state.setSubPage)
  const activeTab = subPage ?? 'local-folders'

  const domainPack = useWorkspaceStore((state) => state.domainPack)
  const securityMode = useWorkspaceStore((state) => state.securityMode)
  const packDetail = DOMAIN_PACK_DETAILS[domainPack]
  const modeDetail = SECURITY_MODE_DETAILS[securityMode]

  return (
    <div className="sources-page">
      <div className="sources-header">
        <div>
          <h1 className="page-title">Knowledge</h1>
          <p className="sources-copy">
            Local Folder, MCP 서버, Vault를 통합 관리하고, 색인된 문서를 Chat 컨텍스트로 활용할 수 있습니다.
          </p>
        </div>
        <div className="sources-badges">
          <Badge variant={modeDetail.badgeVariant}>{modeDetail.label}</Badge>
          <Badge variant="neutral">{packDetail.label}</Badge>
        </div>
      </div>

      <div className="sources-tabs" role="tablist" aria-label="Knowledge 탭">
        {KNOWLEDGE_TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            className={`sources-tab ${activeTab === id ? 'active' : ''}`}
            aria-selected={activeTab === id}
            onClick={() => setSubPage(id)}
          >
            <Icon size={14} aria-hidden="true" style={{ marginRight: 6 }} />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'vault' ? <VaultSection /> : <SourcesSection />}
    </div>
  )
}
