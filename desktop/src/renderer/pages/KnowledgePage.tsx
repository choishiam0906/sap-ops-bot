import { useAppShellStore } from '../stores/appShellStore.js'
import type { KnowledgeSubPage } from '../stores/appShellStore.js'
import { SkillsCatalog } from './knowledge/SkillsCatalog.js'
import { AgentsCatalog } from './knowledge/AgentsCatalog.js'
import { VaultSection } from './knowledge/VaultSection.js'
import './SourcesPage.css'
import './KnowledgeVaultPage.css'

export function KnowledgePage() {
  const subPage = useAppShellStore((state) => state.subPage) as KnowledgeSubPage | null
  const activeTab = subPage ?? 'skills'

  return (
    <div className="knowledge-page">
      {activeTab === 'skills' && <SkillsCatalog />}
      {activeTab === 'agents' && <AgentsCatalog />}
      {activeTab === 'vault' && <VaultSection />}
    </div>
  )
}
