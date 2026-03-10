import { useAppShellStore } from '../stores/appShellStore.js'
import type { KnowledgeSubPage } from '../stores/appShellStore.js'
import { SourcesPage } from './knowledge/SourcesPage.js'
import { SkillsCatalog } from './knowledge/SkillsCatalog.js'
import { VaultSection } from './knowledge/VaultSection.js'
import './SourcesPage.css'
import './KnowledgeVaultPage.css'

export function KnowledgePage() {
  const subPage = useAppShellStore((state) => state.subPage) as KnowledgeSubPage | null
  const activeTab = subPage ?? 'sources'

  return (
    <div className="knowledge-page">
      {activeTab === 'sources' && <SourcesPage />}
      {activeTab === 'skills' && <SkillsCatalog />}
      {activeTab === 'vault' && <VaultSection />}
    </div>
  )
}
