import { useState } from 'react'
import { Badge } from '../components/ui/Badge.js'
import { useWorkspaceStore, DOMAIN_PACK_DETAILS } from '../stores/workspaceStore.js'
import { LocalFolderTab } from './sources/LocalFolderTab.js'
import { McpSourcesTab } from './sources/McpSourcesTab.js'
import { ApiSourcesTab } from './sources/ApiSourcesTab.js'
import './SourcesPage.css'

export function SourcesPage() {
  const [activeTab, setActiveTab] = useState<'local-folder' | 'mcp' | 'api'>('local-folder')
  const domainPack = useWorkspaceStore((state) => state.domainPack)
  const packDetail = DOMAIN_PACK_DETAILS[domainPack]

  return (
    <div className="sources-page">
      <div className="sources-header">
        <div>
          <h1 className="page-title">Sources</h1>
          <p className="sources-copy">
            Local Folder와 MCP 서버를 source로 등록하고, 색인된 문서를 Chat 컨텍스트로 활용할 수 있습니다.
          </p>
        </div>
        <div className="sources-badges">
          <Badge variant="success">엔터프라이즈 보호</Badge>
          <Badge variant="neutral">{packDetail.label}</Badge>
        </div>
      </div>

      <div className="sources-tabs" role="tablist" aria-label="Sources 탭">
        {([
          ['local-folder', 'Local Folder'],
          ['mcp', 'MCPs'],
          ['api', 'APIs'],
        ] as const).map(([tab, label]) => (
          <button
            key={tab}
            type="button"
            role="tab"
            className={`sources-tab ${activeTab === tab ? 'active' : ''}`}
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'local-folder' && <LocalFolderTab />}
      {activeTab === 'mcp' && <McpSourcesTab />}
      {activeTab === 'api' && <ApiSourcesTab />}
    </div>
  )
}
