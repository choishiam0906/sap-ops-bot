import { ToggleSwitch } from '../../ui/ToggleSwitch.js'

/**
 * SettingsToggle — 토글 스위치 행 (기존 ToggleSwitch 래핑)
 * craft-agents-oss SettingsToggle 대응
 */

interface SettingsToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
  'aria-label'?: string
}

export function SettingsToggle({
  checked,
  onChange,
  label,
  description,
  'aria-label': ariaLabel,
}: SettingsToggleProps) {
  return (
    <ToggleSwitch
      checked={checked}
      onChange={onChange}
      label={label}
      description={description}
      aria-label={ariaLabel}
    />
  )
}
