import type { CboRunDiffOutput } from '../../../main/contracts.js'

interface DiffPanelProps {
  diffResult: CboRunDiffOutput
}

export function DiffPanel({ diffResult }: DiffPanelProps) {
  return (
    <div className="cbo-result">
      <h3>Run 비교 결과</h3>
      <div className="diff-summary">
        <span className="diff-added">신규 {diffResult.added}</span>
        <span className="diff-resolved">해소 {diffResult.resolved}</span>
        <span className="diff-persisted">지속 {diffResult.persisted}</span>
      </div>
      {diffResult.changes.length > 0 && (
        <table className="risks-table" role="region" aria-label="Run 비교 결과">
          <thead>
            <tr><th>변경</th><th>심각도</th><th>파일</th><th>제목</th></tr>
          </thead>
          <tbody>
            {diffResult.changes.map((c, i) => (
              <tr key={i} className={`diff-${c.type}`}>
                <td>{c.type === 'added' ? '신규' : c.type === 'resolved' ? '해소' : '지속'}</td>
                <td><span className={`severity-badge ${c.severity}`}>{c.severity}</span></td>
                <td className="file-path">{c.filePath}</td>
                <td>{c.title}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
