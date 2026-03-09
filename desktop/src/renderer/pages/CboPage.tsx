import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileText, FolderSearch, RefreshCw, GitCompare, Database, XCircle } from 'lucide-react'
import { useCboStore } from '../stores/cboStore.js'
import { useCboRuns } from '../hooks/useCboRuns.js'
import { Badge } from '../components/ui/Badge.js'
import { LlmOptions } from '../components/cbo/LlmOptions.js'
import { ResultPanel } from '../components/cbo/ResultPanel.js'
import { RunsTable } from '../components/cbo/RunsTable.js'
import { DiffPanel } from '../components/cbo/DiffPanel.js'
import { Button } from '../components/ui/Button.js'
import { SkeletonText } from '../components/ui/Skeleton.js'
import { useAppShellStore } from '../stores/appShellStore.js'
import type { CboSubPage } from '../stores/appShellStore.js'
import { useChatStore } from '../stores/chatStore.js'
import {
  DOMAIN_PACK_DETAILS,
  SECURITY_MODE_DETAILS,
  useWorkspaceStore,
} from '../stores/workspaceStore.js'
import './CboPage.css'

const api = window.sapOpsDesktop

type Tab = 'text' | 'file' | 'history'

// subPage → Tab 매핑
function subPageToTab(subPage: string | null): Tab {
  switch (subPage as CboSubPage | null) {
    case 'history': return 'history'
    case 'batch': return 'file'
    case 'diff': return 'history'
    default: return 'text'
  }
}

export function CboPage() {
  const store = useCboStore()
  const [librarySearch, setLibrarySearch] = useState('')
  const [loadingDocumentId, setLoadingDocumentId] = useState<string | null>(null)
  const [activeLibrarySourceId, setActiveLibrarySourceId] = useState('')
  const subPage = useAppShellStore((state) => state.subPage)
  const setSubPage = useAppShellStore((state) => state.setSubPage)

  // subPage 변경 시 내부 탭도 동기화
  useEffect(() => {
    const mappedTab = subPageToTab(subPage)
    if (store.tab !== mappedTab) {
      store.setTab(mappedTab)
    }
  }, [subPage])

  const { data: runs = [], refetch: refetchRuns, error: runsError } = useCboRuns(20, store.tab === 'history')
  const securityMode = useWorkspaceStore((state) => state.securityMode)
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
  const modeDetail = SECURITY_MODE_DETAILS[securityMode]
  const packDetail = DOMAIN_PACK_DETAILS[domainPack]
  const cboWorkspaceReady = securityMode === 'secure-local' && domainPack === 'cbo-maintenance'
  const { data: libraryDocuments = [] } = useQuery({
    queryKey: ['sources', 'documents', 'cbo-library', librarySearch, domainPack],
    queryFn: () =>
      api.searchSourceDocuments({
        query: librarySearch.trim() || undefined,
        sourceKind: 'local-folder',
        domainPack,
        limit: 8,
      }),
    enabled: store.tab === 'text',
    staleTime: 10_000,
  })

  const displayError = store.error || (runsError ? '실행 이력을 불러오지 못했어요' : '')

  useEffect(() => {
    const { setProgress, setStatus } = useCboStore.getState()
    const cleanup = api.onCboProgress((event) => {
      setProgress(event)
      setStatus(`분석 중: ${event.current}/${event.total} — ${event.filePath.split(/[\\/]/).pop()}`)
    })
    return cleanup
  }, [])

  function cancelFolder() {
    api.cancelCboFolder()
    store.setProgress(null)
    store.setStatus('분석이 취소되었어요')
    store.setBusy(false)
  }

  function analysisOpts() {
    const workspaceContext = { securityMode, domainPack }
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
    })
    if (store.useLlm) {
      setChatProvider(store.provider)
      setChatModel(store.model)
    }
    setChatInput(prompt)
    setSection('ask-sap', 'all')
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
      store.setResult(res.result)
      store.setStatus(`파일 분석 완료: ${res.filePath}`)
    } catch (e) { store.setError(e instanceof Error ? e.message : '분석 실패') }
    finally { store.setBusy(false) }
  }

  async function pickFolder() {
    store.setBusy(true); store.setError(''); store.setProgress(null); store.setStatus('폴더 선택 대기 중...')
    try {
      const res = await api.pickAndAnalyzeCboFolder({ recursive: true, skipUnchanged: true, ...analysisOpts() })
      if (!res || res.canceled || !res.output) { store.setStatus('폴더 선택 취소됨'); return }
      store.setSelectedRunId(res.output.run.id)
      store.setStatus(`배치 분석 완료: ${res.output.run.successFiles}건 성공`)
      await refreshRuns()
      store.setTab('history')
    } catch (e) { store.setError(e instanceof Error ? e.message : '분석 실패') }
    finally { store.setBusy(false); store.setProgress(null) }
  }

  async function refreshRuns() {
    const result = await refetchRuns()
    const arr = result.data ?? []
    if (arr.length > 0) store.setSelectedRunId(arr[0].id)
    if (arr.length > 1) store.setFromRunId(arr[1].id)
  }

  async function loadRunDetail() {
    if (!store.selectedRunId) return
    store.setBusy(true); store.setStatus('상세 조회 중...')
    try {
      const detail = await api.getCboRunDetail(store.selectedRunId, 500)
      store.setResult(null)
      store.setDiffResult(null)
      store.setStatus(`Run 상세: ${detail.files?.length ?? 0}개 파일`)
    } catch (e) { store.setError(e instanceof Error ? e.message : '조회 실패') }
    finally { store.setBusy(false) }
  }

  async function diffRuns() {
    if (!store.selectedRunId || !store.fromRunId) { store.setError('비교할 Run ID를 입력하세요'); return }
    store.setBusy(true); store.setStatus('Run 비교 중...')
    try {
      const diff = await api.diffCboRuns({ fromRunId: store.fromRunId, toRunId: store.selectedRunId })
      store.setDiffResult(diff)
      store.setStatus(`비교 완료: 신규 ${diff.added} / 해소 ${diff.resolved} / 지속 ${diff.persisted}`)
    } catch (e) { store.setError(e instanceof Error ? e.message : '비교 실패') }
    finally { store.setBusy(false) }
  }

  async function syncKnowledge() {
    if (!store.selectedRunId) return
    store.setBusy(true); store.setStatus('지식 동기화 중...')
    try {
      const out = await api.syncCboRunKnowledge({ runId: store.selectedRunId })
      store.setStatus(`동기화 완료(${out.mode}): ${out.synced}건 성공 / ${out.failed}건 실패`)
    } catch (e) { store.setError(e instanceof Error ? e.message : '동기화 실패') }
    finally { store.setBusy(false) }
  }

  return (
    <div className="cbo-page">
      <h2 className="page-title">CBO 코드 분석</h2>
      <div className={`cbo-workspace-callout ${cboWorkspaceReady ? '' : 'warning'}`}>
        <div className="cbo-workspace-copy">
          <strong>
            {cboWorkspaceReady
              ? '현재 워크스페이스는 CBO 유지보수 분석에 맞게 설정되어 있습니다.'
              : '현재 워크스페이스는 CBO 분석 권장 조합과 다릅니다.'}
          </strong>
          <p>
            활성 Domain Pack: {packDetail.label} / Security Mode: {modeDetail.label}. CBO 소스는 기본적으로
            <b> Secure Local + CBO Maintenance</b> 조합을 권장합니다.
          </p>
        </div>
        <div className="cbo-workspace-badges">
          <Badge variant={modeDetail.badgeVariant}>{modeDetail.label}</Badge>
          <Badge variant="neutral">{packDetail.label}</Badge>
          {!cboWorkspaceReady && (
            <Button variant="secondary" size="sm" onClick={applyRecommendedCboWorkspace}>
              권장 워크스페이스로 전환
            </Button>
          )}
        </div>
      </div>

      <div className="cbo-tabs" role="tablist" aria-label="CBO 분석 모드">
        {(['text', 'file', 'history'] as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            className={`cbo-tab ${store.tab === t ? 'active' : ''}`}
            aria-selected={store.tab === t}
            onClick={() => {
              store.setTab(t)
              setSubPage(t === 'text' ? 'new' : t === 'file' ? 'batch' : 'history')
              if (t === 'history') refreshRuns()
            }}
          >
            {t === 'text' ? '텍스트 분석' : t === 'file' ? '파일·폴더' : '실행 이력'}
          </button>
        ))}
      </div>

      {/* LLM 옵션 */}
      {store.tab !== 'history' && (
        <LlmOptions
          useLlm={store.useLlm}
          provider={store.provider}
          model={store.model}
          onUseLlmChange={store.setUseLlm}
          onProviderChange={store.setProvider}
          onModelChange={store.setModel}
        />
      )}

      {/* 텍스트 분석 탭 */}
      {store.tab === 'text' && (
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
          <Button variant="primary" onClick={analyzeText} loading={store.busy && store.tab === 'text'}>
            <FileText size={16} aria-hidden="true" />
            텍스트 분석
          </Button>
        </div>
      )}

      {/* 파일/폴더 탭 */}
      {store.tab === 'file' && (
        <div className="cbo-section">
          <p className="cbo-desc">
            파일 또는 폴더를 선택하여 CBO 규칙 분석을 실행합니다. 현재 워크스페이스는 {packDetail.label} /
            {` ${modeDetail.label}`} 기준으로 동작합니다.
          </p>
          <div className="cbo-actions">
            <Button variant="primary" onClick={pickFile} loading={store.busy}>
              <FileText size={16} aria-hidden="true" />
              파일 선택 후 분석
            </Button>
            <Button variant="secondary" onClick={pickFolder} disabled={store.busy}>
              <FolderSearch size={16} aria-hidden="true" />
              폴더 배치 분석
            </Button>
          </div>
        </div>
      )}

      {/* 실행 이력 탭 */}
      {store.tab === 'history' && (
        <div className="cbo-section">
          <div className="runs-list">
            <RunsTable
              runs={runs}
              selectedRunId={store.selectedRunId}
              onSelect={store.setSelectedRunId}
            />
          </div>
          <div className="history-controls">
            <div className="form-row compact">
              <label>Run ID</label>
              <input value={store.selectedRunId} onChange={(e) => store.setSelectedRunId(e.target.value)} className="cbo-input" />
            </div>
            <div className="form-row compact">
              <label>비교 기준 Run ID</label>
              <input value={store.fromRunId} onChange={(e) => store.setFromRunId(e.target.value)} className="cbo-input" />
            </div>
            <div className="cbo-actions">
              <Button variant="secondary" onClick={loadRunDetail} loading={store.busy}>
                <RefreshCw size={14} aria-hidden="true" />
                상세 조회
              </Button>
              <Button variant="secondary" onClick={diffRuns} disabled={store.busy}>
                <GitCompare size={14} aria-hidden="true" />
                Run 비교
              </Button>
              <Button variant="primary" onClick={syncKnowledge} disabled={store.busy}>
                <Database size={14} aria-hidden="true" />
                지식 동기화
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 상태 메시지 */}
      {(store.status || displayError) && (
        <div className={`cbo-status ${displayError ? 'error' : ''}`} role={displayError ? 'alert' : undefined} aria-live="polite">
          {displayError || store.status}
        </div>
      )}

      {/* 배치 진행률 */}
      {store.progress && store.busy && (
        <div className="cbo-progress" aria-label="배치 분석 진행 상황">
          <div className="cbo-progress-header">
            <span className="cbo-progress-label">
              {store.progress.current}/{store.progress.total} 파일 분석 중
            </span>
            <button className="cbo-progress-cancel" onClick={cancelFolder} aria-label="분석 취소">
              <XCircle size={16} aria-hidden="true" />
              취소
            </button>
          </div>
          <div className="cbo-progress-bar">
            <div
              className="cbo-progress-fill"
              style={{ width: `${Math.round((store.progress.current / store.progress.total) * 100)}%` }}
            />
          </div>
          <span className="cbo-progress-file">{store.progress.filePath.split(/[\\/]/).pop()}</span>
        </div>
      )}

      {/* 분석 중 스켈레톤 */}
      {store.busy && !store.progress && !store.result && !store.diffResult && (
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

      {/* Diff 결과 */}
      {store.diffResult && <DiffPanel diffResult={store.diffResult} />}
    </div>
  )
}
