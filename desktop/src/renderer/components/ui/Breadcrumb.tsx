import { ChevronRight } from 'lucide-react'
import './Breadcrumb.css'

export interface BreadcrumbItem {
  label: string
  onClick?: () => void
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  if (items.length === 0) return null

  return (
    <nav className="ui-breadcrumb" aria-label="Breadcrumb">
      <ol className="ui-breadcrumb-list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <li key={index} className="ui-breadcrumb-item">
              {isLast ? (
                <span className="ui-breadcrumb-current" aria-current="page">
                  {item.label}
                </span>
              ) : (
                <>
                  <button
                    className="ui-breadcrumb-link"
                    onClick={item.onClick}
                    type="button"
                  >
                    {item.label}
                  </button>
                  <ChevronRight size={14} className="ui-breadcrumb-separator" aria-hidden="true" />
                </>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
