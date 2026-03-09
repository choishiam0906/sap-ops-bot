import React from 'react'
import { CheckCircle } from 'lucide-react'

/**
 * SettingsRadioCard — 카드형 라디오 선택 (보안모드/도메인팩)
 * craft-agents-oss SettingsRadioGroup 대응
 *
 * variant="stacked": 세로 배열 (Security Mode)
 * variant="grid":    2열 그리드 (Domain Pack)
 */

interface RadioCardOption<T extends string> {
  value: T
  label: string
  description: string
  meta?: string
}

interface SettingsRadioCardProps<T extends string> {
  value: T
  options: RadioCardOption<T>[]
  onChange: (value: T) => void
  variant?: 'stacked' | 'grid'
  showCheck?: boolean
}

export function SettingsRadioCard<T extends string>({
  value,
  options,
  onChange,
  variant = 'stacked',
  showCheck = true,
}: SettingsRadioCardProps<T>) {
  const containerClass = variant === 'grid'
    ? 'sp-radio-card-grid'
    : 'sp-radio-card-stacked'

  return (
    <div className={containerClass}>
      {options.map((opt) => {
        const isActive = value === opt.value
        return (
          <button
            key={opt.value}
            className={`sp-radio-card ${isActive ? 'active' : ''}`}
            onClick={() => onChange(opt.value)}
            aria-pressed={isActive}
            type="button"
          >
            {showCheck && variant === 'stacked' && (
              <div className="sp-radio-card-check">
                {isActive && <CheckCircle size={18} />}
              </div>
            )}
            <div className="sp-radio-card-content">
              <span className="sp-radio-card-label">{opt.label}</span>
              <span className="sp-radio-card-desc">{opt.description}</span>
              {opt.meta && <span className="sp-radio-card-meta">{opt.meta}</span>}
            </div>
          </button>
        )
      })}
    </div>
  )
}
