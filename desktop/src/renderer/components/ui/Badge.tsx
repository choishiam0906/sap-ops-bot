import './Badge.css'

type BadgeVariant = 'success' | 'error' | 'warning' | 'info' | 'neutral'
type BadgeSeverity = 'high' | 'medium' | 'low'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  severity?: BadgeSeverity
  className?: string
}

const severityMap: Record<BadgeSeverity, BadgeVariant> = {
  high: 'error',
  medium: 'warning',
  low: 'success',
}

export function Badge({ children, variant, severity, className = '' }: BadgeProps) {
  const resolvedVariant = severity ? severityMap[severity] : (variant ?? 'neutral')
  return (
    <span className={`ui-badge ui-badge-${resolvedVariant} ${className}`}>
      {children}
    </span>
  )
}
