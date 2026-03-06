import type { CboAnalysisResult } from '../../../main/contracts.js'
import { MarkdownRenderer } from '../MarkdownRenderer.js'
import { Badge } from '../ui/Badge.js'

interface ResultPanelProps {
  result: CboAnalysisResult
}

const priorityToSeverity = { p0: 'high', p1: 'medium', p2: 'low' } as const

export function ResultPanel({ result }: ResultPanelProps) {
  return (
    <div className="cbo-result page-enter">
      <h3>분석 결과</h3>
      <MarkdownRenderer content={result.summary} className="result-summary" />

      {result.risks.length > 0 && (
        <div className="result-section">
          <h4>리스크</h4>
          <table className="risks-table" role="region" aria-label="리스크 분석 결과">
            <thead>
              <tr><th>심각도</th><th>제목</th><th>설명</th></tr>
            </thead>
            <tbody>
              {result.risks.map((r, i) => (
                <tr key={i} className={`severity-${r.severity}`}>
                  <td><Badge severity={r.severity as 'high' | 'medium' | 'low'}>{r.severity}</Badge></td>
                  <td>{r.title}</td>
                  <td>{r.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result.recommendations.length > 0 && (
        <div className="result-section">
          <h4>권장사항</h4>
          <div className="rec-cards">
            {result.recommendations.map((rec, i) => (
              <div key={i} className={`rec-card priority-${rec.priority}`}>
                <Badge severity={priorityToSeverity[rec.priority as keyof typeof priorityToSeverity] ?? 'low'}>
                  {rec.priority}
                </Badge>
                <strong>{rec.action}</strong>
                <p>{rec.rationale}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
