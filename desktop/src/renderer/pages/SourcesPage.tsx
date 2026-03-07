import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FolderSearch, Database, RefreshCw, PlugZap, Globe } from 'lucide-react'
import type { ConfiguredSource, VaultClassification } from '../../main/contracts.js'
import { Badge } from '../components/ui/Badge.js'
import { Button } from '../components/ui/Button.js'
import { useWorkspaceStore, DOMAIN_PACK_DETAILS, SECURITY_MODE_DETAILS } from '../stores/workspaceStore.js'
import './SourcesPage.css'

const api = window.sapOpsDesktop

function formatTimestamp(iso: string | null): string {
  if (!iso) return '아직 없음'
  try {
    return new Date(iso).toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export function SourcesPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'local-folder' | 'mcp' | 'api'>('local-folder')
  const [newTitle, setNewTitle] = useState('')
  const [classification, setClassification] = useState<VaultClassification>('confidential')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSourceId, setSelectedSourceId] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [reindexingId, setReindexingId] = useState<string | null>(null)
  const domainPack = useWorkspaceStore((state) => state.domainPack)
  const securityMode = useWorkspaceStore((state) => state.securityMode)
  const packDetail = DOMAIN_PACK_DETAILS[domainPack]
  const modeDetail = SECURITY_MODE_DETAILS[securityMode]

  const { data: configuredSources = [] } = useQuery({
    queryKey: ['sources', 'configured'],
    queryFn: () => api.listConfiguredSources(),
    staleTime: 15_000,
  })

  const localSources = useMemo(
    () => configuredSources.filter((source) => source.kind === 'local-folder'),
    [configuredSources]
  )

  const { data: documents = [] } = useQuery({
    queryKey: ['sources', 'documents', selectedSourceId, searchQuery, domainPack],
    queryFn: () =>
      api.searchSourceDocuments({
        query: searchQuery.trim() || undefined,
        sourceId: selectedSourceId || undefined,
        sourceKind: 'local-folder',
        domainPack,
        limit: 20,
      }),
    enabled: activeTab === 'local-folder',
    staleTime: 10_000,
  })

  async function handleAddLocalFolder() {
    setIsAdding(true)
    setStatusMessage('')
    try {
      const result = await api.pickAndAddLocalFolderSource({
        title: newTitle.trim() || undefined,
        domainPack,
        classificationDefault: classification,
        includeGlobs: ['**/*.txt', '**/*.md', '**/*.log'],
      })
      if (result.canceled || !result.source) {
        setStatusMessage('폴더 선택이 취소되었습니다.')
        return
      }
      setSelectedSourceId(result.source.id)
      setNewTitle('')
      setStatusMessage(`등록 완료: ${result.source.title} (${result.summary?.indexed ?? 0}개 색인)`)
      await queryClient.invalidateQueries({ queryKey: ['sources', 'configured'] })
      await queryClient.invalidateQueries({ queryKey: ['sources', 'documents'] })
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : '폴더 등록에 실패했습니다.')
    } finally {
      setIsAdding(false)
    }
  }

  async function handleReindex(source: ConfiguredSource) {
    setReindexingId(source.id)
    setStatusMessage('')
    try {
      const result = await api.reindexSource(source.id)
      setStatusMessage(`${result.source?.title ?? source.title} 재색인 완료 (${result.summary.indexed}개 색인)`)
      await queryClient.invalidateQueries({ queryKey: ['sources', 'configured'] })
      await queryClient.invalidateQueries({ queryKey: ['sources', 'documents'] })
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : '재색인에 실패했습니다.')
    } finally {
      setReindexingId(null)
    }
  }

  return (
    <div className="sources-page">
      <div className="sources-header">
        <div>
          <h1 className="page-title">Sources</h1>
          <p className="sources-copy">
            Craft-style source catalog를 SAP 데스크톱 환경에 맞게 재구성한 화면입니다. 현재는 Local Folder를
            실제로 연결하고, MCP/API는 다음 단계 확장 구조로 노출합니다.
          </p>
        </div>
        <div className="sources-badges">
          <Badge variant={modeDetail.badgeVariant}>{modeDetail.label}</Badge>
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

      {activeTab === 'local-folder' && (
        <div className="sources-grid">
          <section className="sources-panel">
            <div className="sources-panel-header">
              <div>
                <span className="sources-eyebrow">Source Library</span>
                <h2>Local Folder 등록</h2>
              </div>
            </div>
            <div className="sources-form">
              <label className="sources-label">
                등록 이름
                <input
                  className="sources-input"
                  value={newTitle}
                  onChange={(event) => setNewTitle(event.target.value)}
                  placeholder="예: FI CBO 운영 소스"
                />
              </label>
              <label className="sources-label">
                기본 분류
                <select
                  className="sources-select"
                  value={classification}
                  onChange={(event) => setClassification(event.target.value as VaultClassification)}
                >
                  <option value="confidential">confidential</option>
                  <option value="reference">reference</option>
                </select>
              </label>
              <div className="sources-form-actions">
                <Button type="button" onClick={handleAddLocalFolder} loading={isAdding}>
                  <FolderSearch size={16} aria-hidden="true" />
                  폴더 선택 후 등록
                </Button>
              </div>
              {statusMessage && <div className="sources-status">{statusMessage}</div>}
            </div>

            <div className="sources-card-list">
              {localSources.length === 0 && <div className="sources-empty">아직 등록된 Local Folder source가 없습니다.</div>}
              {localSources.map((source) => (
                <article
                  key={source.id}
                  className={`source-card ${selectedSourceId === source.id ? 'active' : ''}`}
                >
                  <div className="source-card-header">
                    <div>
                      <strong>{source.title}</strong>
                      <p>{source.rootPath}</p>
                    </div>
                    <div className="sources-badges">
                      <Badge variant="neutral">{source.documentCount} docs</Badge>
                      <Badge variant={source.syncStatus === 'ready' ? 'success' : source.syncStatus === 'error' ? 'warning' : 'info'}>
                        {source.syncStatus}
                      </Badge>
                    </div>
                  </div>
                  <div className="source-card-meta">
                    <span>{source.domainPack ?? 'all-domain'}</span>
                    <span>마지막 색인: {formatTimestamp(source.lastIndexedAt)}</span>
                  </div>
                  <div className="source-card-actions">
                    <Button variant="secondary" size="sm" type="button" onClick={() => setSelectedSourceId(source.id)}>
                      문서 보기
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => handleReindex(source)}
                      loading={reindexingId === source.id}
                    >
                      <RefreshCw size={14} aria-hidden="true" />
                      재색인
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="sources-panel">
            <div className="sources-panel-header">
              <div>
                <span className="sources-eyebrow">Indexed Documents</span>
                <h2>색인된 문서</h2>
              </div>
              <Badge variant="info">{documents.length} results</Badge>
            </div>
            <div className="sources-form compact">
              <input
                className="sources-input"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="파일명, 경로, 본문에서 검색"
              />
            </div>
            <div className="sources-card-list">
              {documents.length === 0 && <div className="sources-empty">검색된 문서가 없습니다.</div>}
              {documents.map((document) => (
                <article key={document.id} className="source-doc-card">
                  <div className="source-doc-header">
                    <strong>{document.title}</strong>
                    <Badge variant="neutral">{document.domainPack ?? 'none'}</Badge>
                  </div>
                  <p className="source-doc-path">{document.relativePath}</p>
                  {document.excerpt && <p className="source-doc-excerpt">{document.excerpt}</p>}
                </article>
              ))}
            </div>
          </section>
        </div>
      )}

      {activeTab === 'mcp' && (
        <div className="sources-coming-grid">
          <article className="sources-coming-card">
            <PlugZap size={18} aria-hidden="true" />
            <div>
              <strong>MCP Connector Registry</strong>
              <p>v1에서는 실행 없이 connector 구조와 security policy만 노출합니다.</p>
            </div>
          </article>
          <article className="sources-coming-card">
            <Badge variant={securityMode === 'secure-local' ? 'warning' : 'info'}>
              {securityMode === 'secure-local' ? 'guarded' : 'expandable'}
            </Badge>
            <p>Secure Local에서는 MCP 실연결 대신 로컬 source와 Vault 중심 흐름을 유지합니다.</p>
          </article>
        </div>
      )}

      {activeTab === 'api' && (
        <div className="sources-coming-grid">
          <article className="sources-coming-card">
            <Globe size={18} aria-hidden="true" />
            <div>
              <strong>API Source Slots</strong>
              <p>v1은 실행형 API source 대신 future-ready slot과 정책 설명만 제공합니다.</p>
            </div>
          </article>
          <article className="sources-coming-card">
            <Database size={18} aria-hidden="true" />
            <p>향후 SAP 운영 API, 티켓 시스템, 문서 검색 API를 같은 source catalog 인터페이스로 연결할 수 있게 준비합니다.</p>
          </article>
        </div>
      )}
    </div>
  )
}
