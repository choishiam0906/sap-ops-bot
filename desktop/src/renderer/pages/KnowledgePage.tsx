import { useAppShellStore } from '../stores/appShellStore.js'
import type { KnowledgeSubPage } from '../stores/appShellStore.js'
import { SkillsCatalog } from './knowledge/SkillsCatalog.js'
import { AgentsCatalog } from './knowledge/AgentsCatalog.js'
import { VaultSection } from './knowledge/VaultSection.js'
import { PageHeader } from '../components/ui/PageHeader.js'
import './SourcesPage.css'
import './KnowledgeVaultPage.css'

const TAB_META: Record<string, { title: string; description: string }> = {
  skills: { title: 'Skills', description: '프롬프트 스킬을 관리하고 실행하세요' },
  agents: { title: 'Agents', description: 'AI 에이전트를 구성하고 관리하세요' },
  vault: { title: 'Vault', description: '지식 저장소의 문서를 관리하세요' },
}

export function KnowledgePage() {
  const subPage = useAppShellStore((state) => state.subPage) as KnowledgeSubPage | null
  const activeTab = subPage ?? 'skills'
  const meta = TAB_META[activeTab] ?? TAB_META.skills

  return (
    <div className="knowledge-page">
      <PageHeader
        title={meta.title}
        description={meta.description}
      />
      <div className="knowledge-page-content">
        {activeTab === 'skills' && <SkillsCatalog />}
        {activeTab === 'agents' && <AgentsCatalog />}
        {activeTab === 'vault' && <VaultSection />}
      </div>
    </div>
  )
}
