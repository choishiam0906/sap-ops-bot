import React from 'react'

/**
 * SettingsSegmentedControl — 수평 버튼 그룹 (테마/폰트 선택)
 * craft-agents-oss SettingsSegmentedControl 대응
 */

interface SegmentOption<T extends string> {
  value: T
  label: string
  icon?: React.ReactNode
}

interface SettingsSegmentedControlProps<T extends string> {
  value: T
  options: SegmentOption<T>[]
  onChange: (value: T) => void
  'aria-label': string
}

export function SettingsSegmentedControl<T extends string>({
  value,
  options,
  onChange,
  'aria-label': ariaLabel,
}: SettingsSegmentedControlProps<T>) {
  return (
    <div className="segmented-control" role="radiogroup" aria-label={ariaLabel}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          className={`segment-btn ${value === opt.value ? 'active' : ''}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.icon && <span className="segment-btn-icon" aria-hidden="true">{opt.icon}</span>}
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  )
}
