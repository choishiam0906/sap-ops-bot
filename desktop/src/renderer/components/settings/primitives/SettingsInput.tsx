import React from 'react'

/**
 * SettingsInput — 텍스트 입력 행
 * craft-agents-oss SettingsInput 대응
 */

interface SettingsInputProps {
  label: string
  description?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: 'text' | 'password' | 'email' | 'url'
  id?: string
}

export function SettingsInput({
  label,
  description,
  value,
  onChange,
  placeholder,
  type = 'text',
  id,
}: SettingsInputProps) {
  const inputId = id ?? `settings-input-${label.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <div className="settings-row">
      <div className="row-label-group">
        <label className="row-label" htmlFor={inputId}>{label}</label>
        {description && <span className="row-desc">{description}</span>}
      </div>
      <div className="row-right">
        <input
          id={inputId}
          type={type}
          className="settings-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      </div>
    </div>
  )
}
