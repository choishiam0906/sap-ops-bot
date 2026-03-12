import { useAppShellStore } from '../stores/appShellStore.js'
import type { KnowledgeSubPage } from '../stores/appShellStore.js'
import { ProcessHub } from './knowledge/ProcessHub.js'
import { SkillsCatalog } from './knowledge/SkillsCatalog.js'
import { AgentsCatalog } from './knowledge/AgentsCatalog.js'
import { VaultSection } from './knowledge/VaultSection.js'
import { CodeLabMode } from './sap-assistant/CodeLabMode.js'
import { PageHeader } from '../components/ui/PageHeader.js'
import './SourcesPage.css'
import './KnowledgeVaultPage.css'

const TAB_META: Record<string, { title: string; description: string }> = {
  process: { title: 'Process', description: 'SAP 업무 프로세스를 정의하고 단계와 자동화를 연결하세요' },
  skills: { title: 'Skills', description: '프롬프트 스킬을 관리하고 실행하세요' },
  agents: { title: 'Agents', description: 'AI 에이전트를 구성하고 관리하세요' },
  vault: { title: 'Vault', description: '지식 저장소의 문서를 관리하세요' },
  'code-lab': { title: 'Code Lab', description: '소스 관리, CBO 분석, 아카이브를 다룹니다' },
  'code-lab:sources': { title: 'Code Lab', description: '소스 관리, CBO 분석, 아카이브를 다룹니다' },
  'code-lab:analysis': { title: 'Code Lab', description: '소스 관리, CBO 분석, 아카이브를 다룹니다' },
  'code-lab:archive': { title: 'Code Lab', description: '소스 관리, CBO 분석, 아카이브를 다룹니다' },
}

export function KnowledgePage() {
  const subPage = useAppShellStore((state) => state.subPage) as KnowledgeSubPage | null
  const activeTab = subPage ?? 'code-lab'
  const meta = TAB_META[activeTab] ?? TAB_META.skills
  const isCodeLab = activeTab === 'code-lab' || activeTab.startsWith('code-lab:')

  return (
    <div className="knowledge-page">
      {!isCodeLab && (
        <PageHeader
          title={meta.title}
          description={meta.description}
        />
      )}
      <div className="knowledge-page-content">
        {activeTab === 'process' && <ProcessHub />}
        {activeTab === 'skills' && <SkillsCatalog />}
        {activeTab === 'agents' && <AgentsCatalog />}
        {activeTab === 'vault' && <VaultSection />}
        {isCodeLab && <CodeLabMode />}
      </div>
    </div>
  )
}
