import { FileSearch } from 'lucide-react'
import type { CboAnalysisRunSummary } from '../../../main/contracts.js'
import { SkeletonTableRow } from '../ui/Skeleton.js'

interface RunsTableProps {
  runs: CboAnalysisRunSummary[]
  selectedRunId: string
  loading?: boolean
  onSelect: (id: string) => void
}

export function RunsTable({ runs, selectedRunId, loading, onSelect }: RunsTableProps) {
  if (!loading && runs.length === 0) {
    return (
      <div className="cbo-empty-state">
        <FileSearch size={40} className="empty-icon" aria-hidden="true" />
        <p className="empty-title">아직 분석 이력이 없어요</p>
        <p className="empty-desc">파일이나 폴더를 선택해서 CBO 분석을 실행해보세요</p>
      </div>
    )
  }

  return (
    <table className="runs-table" role="region" aria-label="CBO 실행 이력">
      <thead>
        <tr>
          <th>실행 ID</th>
          <th>모드</th>
          <th>파일 수</th>
          <th>성공</th>
          <th>실패</th>
          <th>시작 시간</th>
        </tr>
      </thead>
      <tbody>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <SkeletonTableRow key={i} cols={6} />)
        ) : (
          runs.map((run) => (
            <tr
              key={run.id}
              className={selectedRunId === run.id ? 'selected' : ''}
              onClick={() => onSelect(run.id)}
            >
              <td className="run-id">{run.id.slice(0, 8)}...</td>
              <td>{run.mode}</td>
              <td>{run.totalFiles}</td>
              <td className="success">{run.successFiles}</td>
              <td className="fail">{run.failedFiles}</td>
              <td>{new Date(run.startedAt).toLocaleString('ko-KR')}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  )
}
