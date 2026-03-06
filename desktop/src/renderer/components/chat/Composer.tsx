import { Send } from 'lucide-react'
import type { ProviderType } from '../../../main/contracts.js'
import { PROVIDER_MODELS } from '../../../main/contracts.js'
import { Button } from '../ui/Button.js'

interface ComposerProps {
  input: string
  provider: ProviderType
  model: string
  sending: boolean
  onInputChange: (v: string) => void
  onProviderChange: (v: ProviderType) => void
  onModelChange: (v: string) => void
  onSend: () => void
}

export function Composer({
  input, provider, model, sending,
  onInputChange, onProviderChange, onModelChange, onSend,
}: ComposerProps) {
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  return (
    <div className="chat-input-area">
      <div className="chat-options">
        <select
          value={provider}
          onChange={(e) => onProviderChange(e.target.value as ProviderType)}
          className="chat-select"
          aria-label="Provider 선택"
        >
          <option value="codex">Codex</option>
          <option value="copilot">Copilot</option>
        </select>
        <select
          value={model}
          onChange={(e) => onModelChange(e.target.value)}
          className="chat-select"
          aria-label="모델 선택"
        >
          {PROVIDER_MODELS[provider].map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>
      <div className="chat-input-row">
        <textarea
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="메시지를 입력하세요... (Enter로 전송)"
          className="chat-textarea"
          disabled={sending}
          rows={2}
          aria-label="메시지 입력"
        />
        <Button
          variant="primary"
          size="lg"
          loading={sending}
          onClick={onSend}
          disabled={sending || !input.trim()}
          className="send-btn"
        >
          <Send size={16} aria-hidden="true" />
          전송
        </Button>
      </div>
    </div>
  )
}
