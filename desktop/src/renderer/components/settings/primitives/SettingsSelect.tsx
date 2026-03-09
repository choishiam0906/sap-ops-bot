import React from 'react'
import { DropdownSelect, type DropdownOption } from '../../ui/DropdownSelect.js'

/**
 * SettingsSelect — 드롭다운 선택 행 (기존 DropdownSelect 래핑)
 * craft-agents-oss SettingsSelect 대응
 *
 * label/description 포함 시 SettingsRow 안에 넣지 않고 단독 사용 가능
 */

interface SettingsSelectProps {
  label?: string
  description?: string
  value: string
  options: DropdownOption[]
  onValueChange: (v: string) => void
  'aria-label'?: string
}

export function SettingsSelect({
  label,
  description,
  value,
  options,
  onValueChange,
  'aria-label': ariaLabel,
}: SettingsSelectProps) {
  if (label) {
    return (
      <div className="settings-row">
        <div className="row-label-group">
          <span className="row-label">{label}</span>
          {description && <span className="row-desc">{description}</span>}
        </div>
        <div className="row-right">
          <DropdownSelect
            value={value}
            options={options}
            onValueChange={onValueChange}
            aria-label={ariaLabel ?? label}
          />
        </div>
      </div>
    )
  }

  return (
    <DropdownSelect
      value={value}
      options={options}
      onValueChange={onValueChange}
      aria-label={ariaLabel}
    />
  )
}
