import { FileText, FolderSearch, RefreshCw, GitCompare, Database } from 'lucide-react'
import { useCboStore } from '../stores/cboStore.js'
import { useCboRuns } from '../hooks/useCboRuns.js'
import { Badge } from '../components/ui/Badge.js'
import { LlmOptions } from '../components/cbo/LlmOptions.js'
import { ResultPanel } from '../components/cbo/ResultPanel.js'
import { RunsTable } from '../components/cbo/RunsTable.js'
import { DiffPanel } from '../components/cbo/DiffPanel.js'
import { Button } from '../components/ui/Button.js'
import { SkeletonText } from '../components/ui/Skeleton.js'
import {
  DOMAIN_PACK_DETAILS,
  SECURITY_MODE_DETAILS,
  useWorkspaceStore,
} from '../stores/workspaceStore.js'
import './CboPage.css'

const api = window.sapOpsDesktop

type Tab = 'text' | 'file' | 'history'

export function CboPage() {
  const store = useCboStore()
  const { data: runs = [], refetch: refetchRuns, error: runsError } = useCboRuns(20, store.tab === 'history')
  const securityMode = useWorkspaceStore((state) => state.securityMode)
  const domainPack = useWorkspaceStore((state) => state.domainPack)
  const applyRecommendedCboWorkspace = useWorkspaceStore((state) => state.applyRecommendedCboWorkspace)
  const modeDetail = SECURITY_MODE_DETAILS[securityMode]
  const packDetail = DOMAIN_PACK_DETAILS[domainPack]
  const cboWorkspaceReady = securityMode === 'secure-local' && domainPack === 'cbo-maintenance'

  const displayError = store.error || (runsError ? '실행 이력을 불러오지 못했어요' : '')

  function llmOpts() {
    if (!store.useLlm) return {}
    return { provider: store.provider, model: store.model }
  }

  async function analyzeText() {
    if (!store.sourceText.trim()) { store.setError('분석할 텍스트를 입력하세요'); return }
    store.setBusy(true); store.setError(''); store.setStatus('텍스트 분석 중...')
    try {
      const res = await api.analyzeCboText({ fileName: store.fileName, content: store.sourceText, ...llmOpts() })
      store.setResult(res)
      store.setStatus('텍스트 분석 완료')
    } catch (e) { store.setError(e instanceof Error ? e.message : '분석 실패') }
    finally { store.setBusy(false) }
  }

  async function pickFile() {
    store.setBusy(true); store.setError(''); store.setStatus('파일 선택 대기 중...')
    try {
      const res = await api.pickAndAnalyzeCboFile(llmOpts())
      if (!res || res.canceled) { store.setStatus('파일 선택 취소됨'); return }
      store.setResult(res.result)
      store.setStatus(`파일 분석 완료: ${res.filePath}`)
    } catch (e) { store.setError(e instanceof Error ? e.message : '분석 실패') }
    finally { store.setBusy(false) }
  }

  async function pickFolder() {
    store.setBusy(true); store.setError(''); store.setStatus('폴더 선택 대기 중...')
    try {
      const res = await api.pickAndAnalyzeCboFolder({ recursive: true, skipUnchanged: true, ...llmOpts() })
      if (!res || res.canceled || !res.output) { store.setStatus('폴더 선택 취소됨'); return }
      store.setSelectedRunId(res.output.run.id)
      store.setStatus(`배치 분석 완료: ${res.output.run.successFiles}건 성공`)
      await refreshRuns()
      store.setTab('history')
    } catch (e) { store.setError(e instanceof Error ? e.message : '분석 실패') }
    finally { store.setBusy(false) }
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
            onClick={() => { store.setTab(t); if (t === 'history') refreshRuns() }}
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

      {/* 분석 중 스켈레톤 */}
      {store.busy && !store.result && !store.diffResult && (
        <div className="cbo-result" aria-label="분석 중">
          <SkeletonText lines={4} />
        </div>
      )}

      {/* 분석 결과 */}
      {store.result && <ResultPanel result={store.result} />}

      {/* Diff 결과 */}
      {store.diffResult && <DiffPanel diffResult={store.diffResult} />}
    </div>
  )
}
