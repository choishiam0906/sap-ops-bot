import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PlugZap, Unplug, Plus, Loader2, RefreshCw } from 'lucide-react'
import type { ConfiguredSource, VaultClassification } from '../../../main/contracts.js'
import { Badge } from '../../components/ui/Badge.js'
import { Button } from '../../components/ui/Button.js'
import { useWorkspaceStore } from '../../stores/workspaceStore.js'
import { formatTimestamp } from './utils.js'

const api = window.sapOpsDesktop

export function McpSourcesTab() {
  const queryClient = useQueryClient()
  const [mcpCommand, setMcpCommand] = useState('')
  const [mcpArgs, setMcpArgs] = useState('')
  const [mcpName, setMcpName] = useState('')
  const [mcpSourceTitle, setMcpSourceTitle] = useState('')
  const [mcpClassification, setMcpClassification] = useState<VaultClassification>('reference')
  const [isConnecting, setIsConnecting] = useState(false)
  const [isAddingMcpSource, setIsAddingMcpSource] = useState(false)
  const [mcpStatus, setMcpStatus] = useState('')
  const [selectedMcpServer, setSelectedMcpServer] = useState('')
  const [reindexingId, setReindexingId] = useState<string | null>(null)

  const domainPack = useWorkspaceStore((state) => state.domainPack)

  const { data: configuredSources = [] } = useQuery({
    queryKey: ['sources', 'configured'],
    queryFn: () => api.listConfiguredSources(),
    staleTime: 15_000,
  })

  const mcpSources = useMemo(
    () => configuredSources.filter((source) => source.kind === 'mcp'),
    [configuredSources]
  )

  const { data: connectedServers = [] } = useQuery({
    queryKey: ['mcp', 'servers'],
    queryFn: () => api.mcpListServers(),
    staleTime: 5_000,
  })

  const { data: mcpResources = [], isLoading: isLoadingResources } = useQuery({
    queryKey: ['mcp', 'resources', selectedMcpServer],
    queryFn: () => api.mcpListResources(selectedMcpServer),
    enabled: selectedMcpServer !== '',
    staleTime: 10_000,
  })

  async function handleMcpConnect() {
    if (!mcpCommand.trim() || !mcpName.trim()) return
    setIsConnecting(true)
    setMcpStatus('')
    try {
      const args = mcpArgs.trim() ? mcpArgs.trim().split(/\s+/) : undefined
      await api.mcpConnect({ name: mcpName.trim(), command: mcpCommand.trim(), args })
      setMcpStatus(`${mcpName.trim()} 서버에 연결되었습니다.`)
      setSelectedMcpServer(mcpName.trim())
      setMcpCommand('')
      setMcpArgs('')
      setMcpName('')
      await queryClient.invalidateQueries({ queryKey: ['mcp', 'servers'] })
    } catch (error) {
      setMcpStatus(error instanceof Error ? error.message : 'MCP 서버 연결에 실패했습니다.')
    } finally {
      setIsConnecting(false)
    }
  }

  async function handleMcpDisconnect(serverName: string) {
    setMcpStatus('')
    try {
      await api.mcpDisconnect(serverName)
      setMcpStatus(`${serverName} 연결이 해제되었습니다.`)
      if (selectedMcpServer === serverName) setSelectedMcpServer('')
      await queryClient.invalidateQueries({ queryKey: ['mcp', 'servers'] })
      await queryClient.invalidateQueries({ queryKey: ['mcp', 'resources'] })
    } catch (error) {
      setMcpStatus(error instanceof Error ? error.message : '연결 해제에 실패했습니다.')
    }
  }

  async function handleMcpAddSource(serverName: string) {
    setIsAddingMcpSource(true)
    setMcpStatus('')
    try {
      const result = await api.mcpAddSource(serverName, {
        title: mcpSourceTitle.trim() || undefined,
        domainPack,
        classificationDefault: mcpClassification,
      })
      setMcpStatus(`MCP Source 등록 완료: ${result.source.title} (${result.summary.indexed}개 색인)`)
      setMcpSourceTitle('')
      await queryClient.invalidateQueries({ queryKey: ['sources', 'configured'] })
    } catch (error) {
      setMcpStatus(error instanceof Error ? error.message : 'MCP Source 등록에 실패했습니다.')
    } finally {
      setIsAddingMcpSource(false)
    }
  }

  async function handleMcpSync(source: ConfiguredSource) {
    setReindexingId(source.id)
    setMcpStatus('')
    try {
      const result = await api.mcpSyncSource(source.id)
      setMcpStatus(`${source.title} 동기화 완료 (${result.summary.indexed}개 색인)`)
      await queryClient.invalidateQueries({ queryKey: ['sources', 'configured'] })
    } catch (error) {
      setMcpStatus(error instanceof Error ? error.message : 'MCP 동기화에 실패했습니다.')
    } finally {
      setReindexingId(null)
    }
  }

  return (
    <div className="sources-grid">
      <section className="sources-panel">
        <div className="sources-panel-header">
          <div>
            <span className="sources-eyebrow">MCP Connection</span>
            <h2>MCP 서버 연결</h2>
          </div>
          <Badge variant="info">{connectedServers.length} connected</Badge>
        </div>
        <div className="sources-form">
          <label className="sources-label">
            서버 이름
            <input
              className="sources-input"
              value={mcpName}
              onChange={(event) => setMcpName(event.target.value)}
              placeholder="예: sap-docs-server"
            />
          </label>
          <label className="sources-label">
            실행 명령어
            <input
              className="sources-input"
              value={mcpCommand}
              onChange={(event) => setMcpCommand(event.target.value)}
              placeholder="예: node, npx, python"
            />
          </label>
          <label className="sources-label">
            인수 (공백 구분)
            <input
              className="sources-input"
              value={mcpArgs}
              onChange={(event) => setMcpArgs(event.target.value)}
              placeholder="예: server.js --port 3100"
            />
          </label>
          <div className="sources-form-actions">
            <Button
              type="button"
              onClick={handleMcpConnect}
              loading={isConnecting}
              disabled={!mcpCommand.trim() || !mcpName.trim()}
            >
              <PlugZap size={16} aria-hidden="true" />
              서버 연결
            </Button>
          </div>
          {mcpStatus && <div className="sources-status">{mcpStatus}</div>}
        </div>

        <div className="sources-card-list">
          {connectedServers.length === 0 && (
            <div className="sources-empty">연결된 MCP 서버가 없습니다.</div>
          )}
          {connectedServers.map((serverName) => (
            <article
              key={serverName}
              className={`source-card ${selectedMcpServer === serverName ? 'active' : ''}`}
            >
              <div className="source-card-header">
                <div>
                  <strong>{serverName}</strong>
                  <p>MCP Server</p>
                </div>
                <Badge variant="success">connected</Badge>
              </div>
              <div className="source-card-actions">
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => setSelectedMcpServer(serverName)}
                >
                  리소스 보기
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => handleMcpDisconnect(serverName)}
                >
                  <Unplug size={14} aria-hidden="true" />
                  연결 해제
                </Button>
              </div>
            </article>
          ))}
        </div>

        {mcpSources.length > 0 && (
          <>
            <div className="sources-panel-header" style={{ marginTop: 24 }}>
              <div>
                <span className="sources-eyebrow">MCP Sources</span>
                <h2>등록된 MCP Source</h2>
              </div>
            </div>
            <div className="sources-card-list">
              {mcpSources.map((source) => (
                <article key={source.id} className="source-card">
                  <div className="source-card-header">
                    <div>
                      <strong>{source.title}</strong>
                      <p>{source.connectionMeta?.serverName ?? 'unknown'}</p>
                    </div>
                    <div className="sources-badges">
                      <Badge variant="neutral">{source.documentCount} docs</Badge>
                      <Badge
                        variant={
                          source.syncStatus === 'ready'
                            ? 'success'
                            : source.syncStatus === 'error'
                              ? 'warning'
                              : 'info'
                        }
                      >
                        {source.syncStatus}
                      </Badge>
                    </div>
                  </div>
                  <div className="source-card-meta">
                    <span>{source.domainPack ?? 'all-domain'}</span>
                    <span>마지막 동기화: {formatTimestamp(source.lastIndexedAt)}</span>
                  </div>
                  <div className="source-card-actions">
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => handleMcpSync(source)}
                      loading={reindexingId === source.id}
                    >
                      <RefreshCw size={14} aria-hidden="true" />
                      재동기화
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="sources-panel">
        <div className="sources-panel-header">
          <div>
            <span className="sources-eyebrow">Resources</span>
            <h2>
              {selectedMcpServer ? `${selectedMcpServer} 리소스` : 'MCP 리소스'}
            </h2>
          </div>
          {selectedMcpServer && <Badge variant="info">{mcpResources.length} items</Badge>}
        </div>

        {selectedMcpServer && (
          <div className="sources-form">
            <label className="sources-label">
              Source 등록 이름
              <input
                className="sources-input"
                value={mcpSourceTitle}
                onChange={(event) => setMcpSourceTitle(event.target.value)}
                placeholder={`예: ${selectedMcpServer} 문서`}
              />
            </label>
            <label className="sources-label">
              기본 분류
              <select
                className="sources-select"
                value={mcpClassification}
                onChange={(event) =>
                  setMcpClassification(event.target.value as VaultClassification)
                }
              >
                <option value="confidential">confidential</option>
                <option value="reference">reference</option>
              </select>
            </label>
            <div className="sources-form-actions">
              <Button
                type="button"
                onClick={() => handleMcpAddSource(selectedMcpServer)}
                loading={isAddingMcpSource}
              >
                <Plus size={16} aria-hidden="true" />
                Source로 등록
              </Button>
            </div>
          </div>
        )}

        <div className="sources-card-list">
          {!selectedMcpServer && (
            <div className="sources-empty">
              왼쪽에서 연결된 MCP 서버를 선택하면 리소스를 확인할 수 있습니다.
            </div>
          )}
          {selectedMcpServer && isLoadingResources && (
            <div className="sources-empty">
              <Loader2 size={18} className="mcp-spinner" aria-hidden="true" />
              리소스를 불러오는 중...
            </div>
          )}
          {selectedMcpServer && !isLoadingResources && mcpResources.length === 0 && (
            <div className="sources-empty">이 서버에 노출된 리소스가 없습니다.</div>
          )}
          {mcpResources.map((resource) => (
            <article key={resource.uri} className="source-doc-card">
              <div className="source-doc-header">
                <strong>{resource.name}</strong>
                {resource.mimeType && <Badge variant="neutral">{resource.mimeType}</Badge>}
              </div>
              <p className="source-doc-path">{resource.uri}</p>
              {resource.description && (
                <p className="source-doc-excerpt">{resource.description}</p>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
