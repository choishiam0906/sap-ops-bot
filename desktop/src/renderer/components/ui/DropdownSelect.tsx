import React, { useState, useEffect, useRef } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import './DropdownSelect.css'

export interface DropdownOption {
  value: string
  label: string
  description?: string
  icon?: React.ReactNode
}

interface DropdownSelectProps {
  value: string
  options: DropdownOption[]
  onValueChange: (v: string) => void
  'aria-label'?: string
}

export function DropdownSelect({
  value,
  options,
  onValueChange,
  'aria-label': ariaLabel,
}: DropdownSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  const selected = options.find((o) => o.value === value)

  return (
    <div className="dropdown-wrapper" ref={wrapperRef}>
      <button
        className={`dropdown-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        type="button"
      >
        {selected?.icon && <span className="dropdown-icon">{selected.icon}</span>}
        <span className="dropdown-trigger-text">{selected?.label ?? value}</span>
        <ChevronDown size={14} className="dropdown-trigger-chevron" aria-hidden="true" />
      </button>
      {isOpen && (
        <div className="dropdown-popover" role="listbox">
          {options.map((opt) => {
            const isSelected = opt.value === value
            return (
              <button
                key={opt.value}
                className={`dropdown-option ${isSelected ? 'selected' : ''}`}
                role="option"
                aria-selected={isSelected}
                onClick={() => { onValueChange(opt.value); setIsOpen(false) }}
                type="button"
              >
                <div className="dropdown-option-content">
                  {opt.icon && <span className="dropdown-option-icon">{opt.icon}</span>}
                  <span className="dropdown-option-label">{opt.label}</span>
                  {opt.description && (
                    <span className="dropdown-option-desc">{opt.description}</span>
                  )}
                </div>
                {isSelected && <Check size={16} className="dropdown-option-check" aria-hidden="true" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
