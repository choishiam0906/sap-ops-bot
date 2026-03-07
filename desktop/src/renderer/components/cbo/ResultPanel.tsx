import { useMemo, useState } from 'react'
import type { CboAnalysisResult } from '../../../main/contracts.js'
import { MarkdownRenderer } from '../MarkdownRenderer.js'
import { Badge } from '../ui/Badge.js'
import { Button } from '../ui/Button.js'

interface ResultPanelProps {
  result: CboAnalysisResult
  analysisLabel?: string
  onAskAi?: (prompt: string) => void
}

const priorityToSeverity = { p0: 'high', p1: 'medium', p2: 'low' } as const
const QUICK_ACTIONS = [
  {
    id: 'business',
    label: '현업 설명으로 이어가기',
    instruction: '현업 사용자에게 비기술 용어로 설명하고, 업무 영향과 확인할 항목을 짧게 정리해줘.',
  },
  {
    id: 'validation',
    label: '검증 체크리스트 만들기',
    instruction: '운영자가 바로 실행할 검증 체크리스트를 우선순위 순으로 정리해줘.',
  },
  {
    id: 'risk',
    label: '리스크 우선순위 묻기',
    instruction: '가장 위험한 항목 3개와 근거, 즉시 확인할 포인트를 정리해줘.',
  },
  {
    id: 'handover',
    label: '운영 메모 초안 만들기',
    instruction: '운영 인수인계 메모 형식으로 요약하고, 다음 담당자가 바로 볼 확인 포인트를 적어줘.',
  },
] as const

export function ResultPanel({ result, analysisLabel, onAskAi }: ResultPanelProps) {
  const [customQuestion, setCustomQuestion] = useState('')
  const digest = useMemo(() => {
    const target = analysisLabel ?? result.metadata.fileName ?? 'CBO source'
    const risks = result.risks.length > 0
      ? result.risks.slice(0, 3).map((risk) => `- [${risk.severity}] ${risk.title}: ${risk.detail}`).join('\n')
      : '- 별도 리스크가 명시되지 않았음'
    const recommendations = result.recommendations.length > 0
      ? result.recommendations.slice(0, 3).map((rec) => `- [${rec.priority}] ${rec.action}: ${rec.rationale}`).join('\n')
      : '- 별도 권장사항이 명시되지 않았음'
    const suggestedTcodes = result.suggestedTcodes && result.suggestedTcodes.length > 0
      ? result.suggestedTcodes.join(', ')
      : '없음'

    return [
      `[분석 대상] ${target}`,
      '',
      '[요약]',
      result.summary,
      '',
      '[주요 리스크]',
      risks,
      '',
      '[권장사항]',
      recommendations,
      '',
      `[추천 T-code] ${suggestedTcodes}`,
    ].join('\n')
  }, [analysisLabel, result])

  function buildPrompt(instruction: string) {
    return `${instruction}\n\n다음 분석 결과를 근거로 답변해줘.\n\n${digest}`
  }

  function submitCustomQuestion() {
    const question = customQuestion.trim()
    if (!question || !onAskAi) return
    onAskAi(buildPrompt(question))
  }

  return (
    <div className="cbo-result page-enter">
      <h3>분석 결과</h3>
      {(result.skillTitle || result.sources?.length || result.suggestedTcodes?.length) && (
        <div className="result-section">
          <h4>실행 메타</h4>
          <div className="rec-cards">
            {result.skillTitle && (
              <div className="rec-card priority-p2">
                <strong>{result.skillTitle}</strong>
                <p>Skill ID: {result.skillUsed}</p>
              </div>
            )}
            {result.suggestedTcodes && result.suggestedTcodes.length > 0 && (
              <div className="rec-card priority-p1">
                <strong>추천 T-code</strong>
                <p>{result.suggestedTcodes.join(', ')}</p>
              </div>
            )}
          </div>
          {result.sources && result.sources.length > 0 && (
            <table className="risks-table" role="region" aria-label="근거 source">
              <thead>
                <tr><th>Source</th><th>Category</th><th>설명</th></tr>
              </thead>
              <tbody>
                {result.sources.map((source, index) => (
                  <tr key={`${source.category}-${source.title}-${index}`}>
                    <td>{source.title}</td>
                    <td>{source.category}</td>
                    <td>{source.description ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
      <MarkdownRenderer content={result.summary} className="result-summary" />

      {onAskAi && (
        <div className="result-section">
          <div className="result-follow-up-header">
            <div>
              <h4>AI 후속 질문</h4>
              <p className="result-follow-up-desc">
                현재 분석 결과를 Chat으로 넘겨서 현업 설명, 운영 체크리스트, 인수인계 메모까지 바로 이어갈 수 있습니다.
              </p>
            </div>
          </div>
          <div className="result-follow-up-actions">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.id}
                type="button"
                className="result-follow-up-chip"
                onClick={() => onAskAi(buildPrompt(action.instruction))}
              >
                {action.label}
              </button>
            ))}
          </div>
          <div className="result-follow-up-form">
            <label htmlFor="cbo-follow-up-question">추가 질문</label>
            <textarea
              id="cbo-follow-up-question"
              value={customQuestion}
              onChange={(event) => setCustomQuestion(event.target.value)}
              placeholder="예: 이 결과를 기준으로 배포 전 점검 순서를 운영자용으로 정리해줘"
              rows={4}
            />
            <div className="result-follow-up-buttons">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setCustomQuestion('이 결과를 기준으로 운영자 보고용 한 페이지 요약을 작성해줘.')}
              >
                추천 문구 넣기
              </Button>
              <Button type="button" onClick={submitCustomQuestion} disabled={!customQuestion.trim()}>
                Chat에서 질문 이어가기
              </Button>
            </div>
          </div>
        </div>
      )}

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
