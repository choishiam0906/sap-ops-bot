import type { ProviderType } from '../../../main/contracts.js'

interface LlmOptionsProps {
  useLlm: boolean
  provider: ProviderType
  model: string
  onUseLlmChange: (v: boolean) => void
  onProviderChange: (v: ProviderType) => void
  onModelChange: (v: string) => void
}

export function LlmOptions({
  useLlm, provider, model,
  onUseLlmChange, onProviderChange, onModelChange,
}: LlmOptionsProps) {
  return (
    <div className="llm-options">
      <label className="llm-toggle">
        <input type="checkbox" checked={useLlm} onChange={(e) => onUseLlmChange(e.target.checked)} />
        LLM 보강 분석
      </label>
      {useLlm && (
        <>
          <select value={provider} onChange={(e) => onProviderChange(e.target.value as ProviderType)} className="cbo-select" aria-label="LLM Provider 선택">
            <option value="codex">Codex</option>
            <option value="copilot">Copilot</option>
          </select>
          <input value={model} onChange={(e) => onModelChange(e.target.value)} className="cbo-input" placeholder="모델명" aria-label="LLM 모델명 입력" />
        </>
      )}
    </div>
  )
}
