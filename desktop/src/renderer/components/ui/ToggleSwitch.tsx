interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
  'aria-label'?: string
}

export function ToggleSwitch({
  checked,
  onChange,
  label,
  description,
  'aria-label': ariaLabel,
}: ToggleSwitchProps) {
  return (
    <div className="settings-toggle-row">
      <label className="toggle-label">
        <span className="toggle-label-text">{label}</span>
        {description && <span className="toggle-label-desc">{description}</span>}
      </label>
      <button
        className={`toggle-switch ${checked ? 'active' : ''}`}
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel ?? label}
        onClick={() => onChange(!checked)}
      >
        <span className="toggle-knob" />
      </button>
    </div>
  )
}
