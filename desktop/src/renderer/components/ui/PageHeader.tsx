import { ArrowLeft } from 'lucide-react'
import { Breadcrumb } from './Breadcrumb.js'
import type { BreadcrumbItem } from './Breadcrumb.js'
import './PageHeader.css'

interface PageHeaderProps {
  title: string
  description?: string
  breadcrumb?: BreadcrumbItem[]
  onBack?: () => void
  actions?: React.ReactNode
}

export function PageHeader({ title, description, breadcrumb, onBack, actions }: PageHeaderProps) {
  return (
    <header className="ui-page-header">
      <div className="ui-page-header-top">
        <div className="ui-page-header-left">
          {onBack && (
            <button
              className="ui-page-header-back"
              onClick={onBack}
              aria-label="뒤로 가기"
              type="button"
            >
              <ArrowLeft size={18} aria-hidden="true" />
            </button>
          )}
          <div className="ui-page-header-text">
            {breadcrumb && breadcrumb.length > 0 && <Breadcrumb items={breadcrumb} />}
            <h1 className="ui-page-header-title">{title}</h1>
            {description && (
              <p className="ui-page-header-description">{description}</p>
            )}
          </div>
        </div>
        {actions && <div className="ui-page-header-actions">{actions}</div>}
      </div>
    </header>
  )
}
