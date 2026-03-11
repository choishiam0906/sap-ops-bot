// ─── 🧪 코드 랩 (Code Lab): Sources + CBO 분석 + Archive 통합 ───

import { useState, useEffect } from 'react'
import { FlaskConical, BookOpen, Search, Archive } from 'lucide-react'
import { useAppShellStore } from '../../stores/appShellStore.js'
import { SourcesPage } from '../knowledge/SourcesPage.js'
import { AnalysisMode } from './AnalysisMode.js'
import { ArchiveMode } from './ArchiveMode.js'
import './CodeLabMode.css'

type CodeLabTab = 'sources' | 'analysis' | 'archive'

const TAB_ITEMS: { id: CodeLabTab; label: string; Icon: typeof FlaskConical }[] = [
  { id: 'sources', label: '소스 관리', Icon: BookOpen },
  { id: 'analysis', label: 'CBO 분석', Icon: Search },
  { id: 'archive', label: '아카이브', Icon: Archive },
]

function parseCodeLabTab(subPage: string | null): CodeLabTab {
  if (subPage === 'code-lab:sources') return 'sources'
  if (subPage === 'code-lab:analysis') return 'analysis'
  if (subPage === 'code-lab:archive') return 'archive'
  // 레거시 호환
  if (subPage === 'analysis') return 'analysis'
  if (subPage === 'archive') return 'archive'
  return 'sources' // 기본값
}

export function CodeLabMode() {
  const subPage = useAppShellStore((state) => state.subPage)
  const setSubPage = useAppShellStore((state) => state.setSubPage)
  const [activeTab, setActiveTab] = useState<CodeLabTab>(() => parseCodeLabTab(subPage))

  // subPage 변경 시 탭 동기화
  useEffect(() => {
    const parsed = parseCodeLabTab(subPage)
    if (parsed !== activeTab) {
      setActiveTab(parsed)
    }
  }, [subPage]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleTabChange(tab: CodeLabTab) {
    setActiveTab(tab)
    setSubPage(`code-lab:${tab}`)
  }

  return (
    <div className="code-lab">
      <div className="code-lab-header">
        <div className="code-lab-title">
          <FlaskConical size={20} aria-hidden="true" />
          <h1>코드 랩</h1>
        </div>
        <div className="code-lab-tabs" role="tablist" aria-label="코드 랩 탭">
          {TAB_ITEMS.map(({ id, label, Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={activeTab === id}
              className={`code-lab-tab ${activeTab === id ? 'active' : ''}`}
              onClick={() => handleTabChange(id)}
            >
              <Icon size={14} aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="code-lab-content">
        {activeTab === 'sources' && <SourcesPage />}
        {activeTab === 'analysis' && <AnalysisMode />}
        {activeTab === 'archive' && <ArchiveMode />}
      </div>
    </div>
  )
}
