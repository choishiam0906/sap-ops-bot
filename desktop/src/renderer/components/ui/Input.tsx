import { forwardRef, useId } from 'react'
import './Input.css'

type InputSize = 'sm' | 'md' | 'lg'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  description?: string
  error?: string
  hint?: string
  inputSize?: InputSize
  icon?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, description, error, hint, inputSize = 'md', icon, className = '', id: externalId, ...props }, ref) => {
    const autoId = useId()
    const id = externalId ?? autoId
    const errorId = error ? `${id}-error` : undefined
    const hintId = hint ? `${id}-hint` : undefined
    const descId = description ? `${id}-desc` : undefined

    return (
      <div className={`ui-input-wrapper ${className}`}>
        {label && (
          <label htmlFor={id} className="ui-input-label">
            {label}
          </label>
        )}
        {description && (
          <p id={descId} className="ui-input-description">{description}</p>
        )}
        <div className={`ui-input-field ui-input-${inputSize} ${error ? 'ui-input-error' : ''} ${icon ? 'ui-input-has-icon' : ''}`}>
          {icon && <span className="ui-input-icon" aria-hidden="true">{icon}</span>}
          <input
            ref={ref}
            id={id}
            className="ui-input"
            aria-invalid={error ? true : undefined}
            aria-describedby={[errorId, hintId, descId].filter(Boolean).join(' ') || undefined}
            {...props}
          />
        </div>
        {error && (
          <p id={errorId} className="ui-input-error-msg" role="alert">{error}</p>
        )}
        {hint && !error && (
          <p id={hintId} className="ui-input-hint">{hint}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
