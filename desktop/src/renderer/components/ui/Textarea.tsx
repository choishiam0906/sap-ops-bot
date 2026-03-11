import { forwardRef, useId } from 'react'
import './Input.css'

type TextareaSize = 'sm' | 'md' | 'lg'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  description?: string
  error?: string
  hint?: string
  textareaSize?: TextareaSize
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, description, error, hint, textareaSize = 'md', className = '', id: externalId, ...props }, ref) => {
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
        <textarea
          ref={ref}
          id={id}
          className={`ui-textarea ui-textarea-${textareaSize} ${error ? 'ui-textarea-error' : ''}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={[errorId, hintId, descId].filter(Boolean).join(' ') || undefined}
          {...props}
        />
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

Textarea.displayName = 'Textarea'
