import { Inbox } from 'lucide-react'
import { Button } from './Button.js'
import './EmptyState.css'

interface EmptyStateAction {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'ghost'
}

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: EmptyStateAction
  actionSecondary?: EmptyStateAction
  children?: React.ReactNode
}

export function EmptyState({ icon, title, description, action, actionSecondary, children }: EmptyStateProps) {
  return (
    <div className="ui-empty-state">
      <div className="ui-empty-state-icon" aria-hidden="true">
        {icon ?? <Inbox size={40} />}
      </div>
      <h3 className="ui-empty-state-title">{title}</h3>
      {description && (
        <p className="ui-empty-state-description">{description}</p>
      )}
      {(action || actionSecondary) && (
        <div className="ui-empty-state-actions">
          {action && (
            <Button variant={action.variant ?? 'primary'} size="sm" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
          {actionSecondary && (
            <Button variant={actionSecondary.variant ?? 'ghost'} size="sm" onClick={actionSecondary.onClick}>
              {actionSecondary.label}
            </Button>
          )}
        </div>
      )}
      {children && <div className="ui-empty-state-children">{children}</div>}
    </div>
  )
}
