import React, { useEffect, useRef } from 'react'
import { MoreHorizontal } from 'lucide-react'

export interface ActionMenuItem {
  label: string
  onClick: () => void
  danger?: boolean
}

interface ActionMenuProps {
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
  items: ActionMenuItem[]
  triggerLabel: string
}

export function ActionMenu({
  isOpen,
  onToggle,
  onClose,
  items,
  triggerLabel,
}: ActionMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen, onClose])

  return (
    <div className="action-menu-wrapper" ref={menuRef}>
      <button
        className="action-menu-trigger"
        onClick={onToggle}
        aria-label={triggerLabel}
        aria-expanded={isOpen}
      >
        <MoreHorizontal size={18} />
      </button>
      {isOpen && (
        <div className="action-menu" role="menu">
          {items.map((item) => (
            <button
              key={item.label}
              className={`action-menu-item ${item.danger ? 'action-menu-item-danger' : ''}`}
              role="menuitem"
              onClick={item.onClick}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
