import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileText } from 'lucide-react'
import { useCboStore } from '../../stores/cboStore.js'
import { Badge } from '../../components/ui/Badge.js'
import { LlmOptions } from '../../components/cbo/LlmOptions.js'
import { ResultPanel } from '../../components/cbo/ResultPanel.js'
import { Button } from '../../components/ui/Button.js'
import { SkeletonText } from '../../components/ui/Skeleton.js'
import { useAppShellStore } from '../../stores/appShellStore.js'
import { useChatStore } from '../../stores/chatStore.js'
import {
  DOMAIN_PACK_DETAILS,
  useWorkspaceStore,
} from '../../stores/workspaceStore.js'
import '../CboPage.css'

const api = window.sapOpsDesktop

type Tab = 'text' | 'file'

export function AnalysisMode() {
  const store = useCboStore()
  const [librarySearch, setLibrarySearch] = useState('')
  const [loadingDocumentId, setLoadingDocumentId] = useState<string | null>(null)
  const [activeLibrarySourceId, setActiveLibrarySourceId] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('text')

  const domainPack = useWorkspaceStore((state) => state.domainPack)
  const applyRecommendedCboWorkspace = useWorkspaceStore((state) => state.applyRecommendedCboWorkspace)
  const setSection = useAppShellStore((state) => state.setSection)
  const setCurrentSessionId = useChatStore((state) => state.setCurrentSessionId)
  const setChatInput = useChatStore((state) => state.setInput)
  const setChatProvider = useChatStore((state) => state.setProvider)
  const setChatModel = useChatStore((state) => state.setModel)
  const setSelectedSkillId = useChatStore((state) => state.setSelectedSkillId)
  const setSelectedSourceIds = useChatStore((state) => state.setSelectedSourceIds)
  const setCaseContext = useChatStore((state) => state.setCaseContext)
  const packDetail = DOMAIN_PACK_DETAILS[domainPack]
  const cboWorkspaceReady = domainPack === 'cbo-maintenance'

  const { data: libraryDocuments = [] } = useQuery({
    queryKey: ['sources', 'documents', 'cbo-library', librarySearch, domainPack],
    queryFn: () =>
      api.searchSourceDocuments({
        query: librarySearch.trim() || undefined,
        sourceKind: 'local-folder',
        domainPack,
        limit: 8,
      }),
    enabled: activeTab === 'text',
    staleTime: 10_000,
  })

  const displayError = store.error

  useEffect(() => {
    const { setProgress, setStatus } = useCboStore.getState()
    const cleanup = api.onCboProgress((event) => {
      setProgress(event)
      setStatus(`분석 중: ${event.current}/${event.total} — ${event.filePath.split(/[\\/]/).pop()}`)
    })
    return cleanup
  }, [])

  function analysisOpts() {
    const workspaceContext = { domainPack }
    if (!store.useLlm) return workspaceContext
    return { ...workspaceContext, provider: store.provider, model: store.model }
  }

  function handoffToChat(prompt: string) {
    const activeResult = useCboStore.getState().result
    if (!activeResult) return

    const sourceIds = Array.from(
      new Set([
        'workspace-context',
        ...(store.sourceText.trim() ? ['local-imported-files'] : []),
        ...(activeLibrarySourceId ? [`configured-source:${activeLibrarySourceId}`] : []),
        ...(activeResult.sourceIds ?? []),
      ])
    )

    setCurrentSessionId(null)
    setSelectedSkillId(activeResult.skillUsed ?? 'cbo-impact-analysis')
    setSelectedSourceIds(sourceIds)
    setCaseContext({
      filePath: activeResult.metadata.fileName || store.fileName,
      objectName: (activeResult.metadata.fileName || store.fileName).replace(/\.[^.]+$/, ''),
      sourceContent: store.sourceText.trim() || undefined,
    })
    if (store.useLlm) {
      setChatProvider(store.provider)
      setChatModel(store.model)
    }
    setChatInput(prompt)
    setSection('sap-assistant', 'chat')
  }

  async function loadLibraryDocument(documentId: string) {
    setLoadingDocumentId(documentId)
    store.setError('')
    try {
      const document = await api.getSourceDocument(documentId)
      if (!document) {
        store.setError('선택한 Source Library 문서를 찾지 못했어요')
        return
      }
      store.setFileName(document.title)
      store.setSourceText(document.contentText)
      store.setResult(null)
      setActiveLibrarySourceId(document.sourceId)
      store.setStatus(`Source Library에서 ${document.title} 문서를 불러왔어요`)
    } catch (error) {
      store.setError(error instanceof Error ? error.message : '문서를 불러오지 못했어요')
    } finally {
      setLoadingDocumentId(null)
    }
  }

  async function analyzeText() {
    if (!store.sourceText.trim()) { store.setError('분석할 텍스트를 입력하세요'); return }
    store.setBusy(true); store.setError(''); store.setStatus('텍스트 분석 중...')
    try {
      const res = await api.analyzeCboText({ fileName: store.fileName, content: store.sourceText, ...analysisOpts() })
      store.setResult(res)
      store.setStatus('텍스트 분석 완료')
    } catch (e) { store.setError(e instanceof Error ? e.message : '분석 실패') }
    finally { store.setBusy(false) }
  }

  async function pickFile() {
    store.setBusy(true); store.setError(''); store.setStatus('파일 선택 대기 중...')
    try {
      const res = await api.pickAndAnalyzeCboFile(analysisOpts())
      if (!res || res.canceled) { store.setStatus('파일 선택 취소됨'); return }
      if (res.sourceContent) {
        store.setSourceText(res.sourceContent)
      }
      if (res.result?.metadata.fileName) {
        store.setFileName(res.result.metadata.fileName)
      }
      store.setResult(res.result)
      store.setStatus(`파일 분석 완료: ${res.filePath}`)
    } catch (e) { store.setError(e instanceof Error ? e.message : '분석 실패') }
    finally { store.setBusy(false) }
  }

  return (
    <div className="cbo-page">
      <div className={`cbo-workspace-callout ${cboWorkspaceReady ? '' : 'warning'}`}>
        <div className="cbo-workspace-copy">
          <strong>
            {cboWorkspaceReady
              ? '현재 워크스페이스는 CBO 유지보수 분석에 맞게 설정되어 있습니다.'
              : '현재 워크스페이스는 CBO 분석 권장 조합과 다릅니다.'}
          </strong>
          <p>
            활성 Domain Pack: {packDetail.label}. CBO 소스는 기본적으로
            <b> CBO Maintenance</b> Domain Pack을 권장합니다.
          </p>
        </div>
        <div className="cbo-workspace-badges">
          <Badge variant="neutral">{packDetail.label}</Badge>
          {!cboWorkspaceReady && (
            <Button variant="secondary" size="sm" onClick={applyRecommendedCboWorkspace}>
              권장 워크스페이스로 전환
            </Button>
          )}
        </div>
      </div>

      <div className="cbo-tabs" role="tablist" aria-label="분석 입력 방식">
        {(['text', 'file'] as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            className={`cbo-tab ${activeTab === t ? 'active' : ''}`}
            aria-selected={activeTab === t}
            onClick={() => setActiveTab(t)}
          >
            {t === 'text' ? '텍스트 분석' : '파일 선택'}
          </button>
        ))}
      </div>

      {/* LLM 옵션 */}
      <LlmOptions
        useLlm={store.useLlm}
        provider={store.provider}
        model={store.model}
        onUseLlmChange={store.setUseLlm}
        onProviderChange={store.setProvider}
        onModelChange={store.setModel}
      />

      {/* 텍스트 분석 탭 */}
      {activeTab === 'text' && (
        <div className="cbo-section">
          <div className="cbo-analysis-hint">
            <strong>분석 후 바로 AI 후속 질문까지 이어질 수 있습니다.</strong>
            <p>
              CBO 소스 텍스트를 붙여넣고 분석한 뒤, 결과 패널에서 현업 설명, 검증 체크리스트, 운영 메모 초안으로
              바로 넘길 수 있습니다.
            </p>
          </div>
          <div className="cbo-library-panel">
            <div className="cbo-library-header">
              <div>
                <strong>Source Library에서 가져오기</strong>
                <p>Local Folder로 색인한 문서를 바로 textarea에 불러와 CBO 분석에 사용할 수 있습니다.</p>
              </div>
              <Badge variant="neutral">{libraryDocuments.length} docs</Badge>
            </div>
            <input
              value={librarySearch}
              onChange={(event) => setLibrarySearch(event.target.value)}
              className="cbo-input cbo-library-search"
              placeholder="파일명, 경로, 본문으로 검색"
            />
            <div className="cbo-library-list">
              {libraryDocuments.length === 0 && (
                <div className="cbo-library-empty">현재 Domain Pack에서 사용할 Source Library 문서가 없습니다.</div>
              )}
              {libraryDocuments.map((document) => (
                <article key={document.id} className="cbo-library-card">
                  <div>
                    <strong>{document.title}</strong>
                    <p>{document.relativePath}</p>
                    {document.excerpt && <span>{document.excerpt}</span>}
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => loadLibraryDocument(document.id)}
                    loading={loadingDocumentId === document.id}
                  >
                    불러오기
                  </Button>
                </article>
              ))}
            </div>
          </div>
          <div className="form-row">
            <label>파일명</label>
            <input value={store.fileName} onChange={(e) => store.setFileName(e.target.value)} className="cbo-input" />
          </div>
          <div className="form-row">
            <label>소스 코드</label>
            <textarea
              value={store.sourceText}
              onChange={(e) => store.setSourceText(e.target.value)}
              className="cbo-textarea"
              placeholder="분석할 CBO 소스(.txt/.md)를 붙여넣으세요"
              rows={10}
            />
          </div>
          <Button variant="primary" onClick={analyzeText} loading={store.busy && activeTab === 'text'}>
            <FileText size={16} aria-hidden="true" />
            텍스트 분석
          </Button>
        </div>
      )}

      {/* 파일 선택 탭 */}
      {activeTab === 'file' && (
        <div className="cbo-section">
          <p className="cbo-desc">
            파일을 선택하여 CBO 규칙 분석을 실행합니다. 현재 워크스페이스는 {packDetail.label} 기준으로 동작합니다.
          </p>
          <div className="cbo-actions">
            <Button variant="primary" onClick={pickFile} loading={store.busy}>
              <FileText size={16} aria-hidden="true" />
              파일 선택 후 분석
            </Button>
          </div>
        </div>
      )}

      {/* 상태 메시지 */}
      {(store.status || displayError) && (
        <div className={`cbo-status ${displayError ? 'error' : ''}`} role={displayError ? 'alert' : undefined} aria-live="polite">
          {displayError || store.status}
        </div>
      )}

      {/* 분석 중 스켈레톤 */}
      {store.busy && !store.result && (
        <div className="cbo-result" aria-label="분석 중">
          <SkeletonText lines={4} />
        </div>
      )}

      {/* 분석 결과 */}
      {store.result && (
        <ResultPanel
          result={store.result}
          analysisLabel={store.result.metadata.fileName || store.fileName}
          onAskAi={handoffToChat}
        />
      )}
    </div>
  )
}
