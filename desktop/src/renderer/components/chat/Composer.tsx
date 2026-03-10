import { Send, X } from 'lucide-react'
import type { ProviderType } from '../../../main/contracts.js'
import { PROVIDER_LABELS, PROVIDER_MODELS, DEFAULT_MODELS } from '../../../main/contracts.js'
import { Button } from '../ui/Button.js'

interface SourceChip {
  id: string
  title: string
}

interface ComposerProps {
  input: string
  provider: ProviderType
  model: string
  placeholder?: string
  sending: boolean
  selectedSources?: SourceChip[]
  availableProviders?: ProviderType[]
  onInputChange: (v: string) => void
  onProviderChange: (v: ProviderType) => void
  onModelChange: (v: string) => void
  onSend: () => void
  onRemoveSource?: (id: string) => void
}

export function Composer({
  input, provider, model, placeholder, sending,
  selectedSources = [],
  availableProviders,
  onInputChange, onProviderChange, onModelChange, onSend,
  onRemoveSource,
}: ComposerProps) {
  const providerKeys = availableProviders ?? (Object.keys(PROVIDER_LABELS) as ProviderType[])
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
          onChange={(e) => {
            const newProvider = e.target.value as ProviderType
            onProviderChange(newProvider)
            const models = PROVIDER_MODELS[newProvider]
            if (!models.some((m) => m.value === model)) {
              onModelChange(DEFAULT_MODELS[newProvider])
            }
          }}
          className="chat-select"
          aria-label="Provider 선택"
        >
          {providerKeys.length === 0 ? (
            <option value="" disabled>연결된 AI가 없어요</option>
          ) : (
            providerKeys.map((p) => (
              <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>
            ))
          )}
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
      {selectedSources.length > 0 && (
        <div className="composer-source-chips" aria-label="선택된 소스">
          {selectedSources.map((source) => (
            <span key={source.id} className="composer-source-chip">
              {source.title}
              {onRemoveSource && (
                <button
                  className="composer-chip-remove"
                  onClick={() => onRemoveSource(source.id)}
                  aria-label={`${source.title} 제거`}
                >
                  <X size={12} aria-hidden="true" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      <div className="chat-input-row">
        <textarea
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? '메시지를 입력하세요... (Enter로 전송)'}
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
