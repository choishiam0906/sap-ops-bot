import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import './Button.css'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, disabled, children, className = '', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`ui-btn ui-btn-${variant} ui-btn-${size} ${loading ? 'ui-btn-loading' : ''} ${className}`}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 size={size === 'sm' ? 14 : 16} className="ui-btn-spinner" aria-hidden="true" />}
        <span className={loading ? 'ui-btn-content-hidden' : ''}>{children}</span>
      </button>
    )
  }
)

Button.displayName = 'Button'
