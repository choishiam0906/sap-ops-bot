import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { AppSection } from '../../stores/appShellStore'

export interface NavChild {
  id: string
  subPage: string
  label: string
}

export interface NavGroupItem {
  id: string
  section: AppSection
  label: string
  Icon: LucideIcon
  defaultSubPage?: string
  children?: NavChild[]
  position: 'main' | 'bottom'
}

interface NavItemGroupProps {
  item: NavGroupItem
  currentSection: AppSection
  currentSubPage: string | null
  collapsed: boolean
  onNavigate: (section: AppSection, subPage?: string | null) => void
}

export function NavItemGroup({
  item,
  currentSection,
  currentSubPage,
  collapsed,
  onNavigate,
}: NavItemGroupProps) {
  const isActive = currentSection === item.section
  const [expanded, setExpanded] = useState(isActive)
  const hasChildren = item.children && item.children.length > 0

  function handleClick() {
    if (hasChildren && !collapsed) {
      setExpanded(!expanded)
    }
    onNavigate(item.section, item.defaultSubPage ?? item.children?.[0]?.subPage ?? null)
  }

  return (
    <div className={`nav-group ${isActive ? 'active' : ''}`}>
      <button
        className={`nav-item ${isActive && !currentSubPage ? 'active' : ''} ${isActive ? 'section-active' : ''}`}
        onClick={handleClick}
        aria-current={isActive ? 'page' : undefined}
        title={collapsed ? item.label : undefined}
        type="button"
      >
        <item.Icon size={18} className="nav-icon" aria-hidden="true" />
        {!collapsed && (
          <>
            <span className="nav-label">{item.label}</span>
            {hasChildren && (
              <span className="nav-expand-icon" aria-hidden="true">
                {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
            )}
          </>
        )}
      </button>

      {hasChildren && expanded && !collapsed && (
        <div className="nav-children" role="group" aria-label={`${item.label} 하위 메뉴`}>
          {item.children!.map((child) => {
            const childActive = isActive && currentSubPage === child.subPage
            return (
              <button
                key={child.id}
                className={`nav-child-item ${childActive ? 'active' : ''}`}
                onClick={() => onNavigate(item.section, child.subPage)}
                aria-current={childActive ? 'page' : undefined}
                type="button"
              >
                <span className="nav-child-dot" />
                <span className="nav-child-label">{child.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
