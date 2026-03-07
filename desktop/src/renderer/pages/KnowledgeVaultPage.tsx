import { useState } from 'react'
import { useVaultByClassification } from '../hooks/useVault'
import { Badge } from '../components/ui/Badge'
import type { DomainPack, VaultClassification, VaultEntry, VaultSourceType } from '../../main/contracts'
import './KnowledgeVaultPage.css'

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  } catch {
    return iso
  }
}

function VaultCard({ entry }: { entry: VaultEntry }) {
  return (
    <div className="vault-card">
      <div className="vault-card-header">
        <span className="vault-card-title">{entry.title}</span>
        <div className="vault-card-meta">
          {entry.classification === 'confidential' ? (
            <span className="vault-confidential-badge">기밀</span>
          ) : (
            <span className="vault-reference-badge">공개</span>
          )}
          {entry.domainPack && <Badge variant="neutral">{entry.domainPack}</Badge>}
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
            {formatDate(entry.indexedAt)}
          </span>
        </div>
      </div>
      {entry.excerpt && <p className="vault-card-excerpt">{entry.excerpt}</p>}
    </div>
  )
}

function VaultSection({ classification }: { classification: VaultClassification }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sourceType, setSourceType] = useState<'all' | VaultSourceType>('all')
  const [domainPack, setDomainPack] = useState<'all' | DomainPack>('all')
  const { data: entries = [], isLoading } = useVaultByClassification(
    classification,
    searchQuery || undefined,
    50
  )
  const filteredEntries = entries.filter((entry) => {
    const matchesSource = sourceType === 'all' || entry.sourceType === sourceType
    const matchesDomain = domainPack === 'all' || entry.domainPack === domainPack
    return matchesSource && matchesDomain
  })

  return (
    <div>
      <div className="vault-search">
        <input
          className="vault-search-input"
          type="text"
          placeholder={classification === 'confidential' ? '기밀 지식 검색...' : '공개 지식 검색...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label={`${classification} 검색`}
        />
        <select
          className="vault-filter-select"
          value={sourceType}
          onChange={(e) => setSourceType(e.target.value as 'all' | VaultSourceType)}
          aria-label="source type 필터"
        >
          <option value="all">모든 Source</option>
          <option value="cbo_analysis">CBO Analysis</option>
          <option value="sap_standard">SAP Standard</option>
          <option value="internal_memo">Internal Memo</option>
        </select>
        <select
          className="vault-filter-select"
          value={domainPack}
          onChange={(e) => setDomainPack(e.target.value as 'all' | DomainPack)}
          aria-label="domain pack 필터"
        >
          <option value="all">모든 Domain</option>
          <option value="ops">ops</option>
          <option value="functional">functional</option>
          <option value="cbo-maintenance">cbo-maintenance</option>
          <option value="pi-integration">pi-integration</option>
          <option value="btp-rap-cap">btp-rap-cap</option>
        </select>
      </div>
      {isLoading ? (
        <div className="vault-empty">불러오는 중...</div>
      ) : filteredEntries.length === 0 ? (
        <div className="vault-empty">
          {classification === 'confidential'
            ? '기밀 지식이 없어요. CBO 분석 후 자동으로 저장돼요.'
            : '공개 지식이 없어요'}
        </div>
      ) : (
        filteredEntries.map((entry) => <VaultCard key={entry.id} entry={entry} />)
      )}
    </div>
  )
}

export function KnowledgeVaultPage() {
  const [activeTab, setActiveTab] = useState<VaultClassification>('confidential')

  return (
    <div className="vault-page">
      <h1 className="page-title">Knowledge Vault</h1>
      <p className="settings-desc">CBO 분석 결과와 참조 지식을 분류별로 관리하세요</p>

      <div className="vault-tabs" role="tablist">
        <button
          className={`vault-tab ${activeTab === 'confidential' ? 'active' : ''}`}
          onClick={() => setActiveTab('confidential')}
          role="tab"
          aria-selected={activeTab === 'confidential'}
        >
          Confidential
        </button>
        <button
          className={`vault-tab ${activeTab === 'reference' ? 'active' : ''}`}
          onClick={() => setActiveTab('reference')}
          role="tab"
          aria-selected={activeTab === 'reference'}
        >
          Reference
        </button>
      </div>

      <VaultSection key={activeTab} classification={activeTab} />
    </div>
  )
}
