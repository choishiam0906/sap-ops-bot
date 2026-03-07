import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { TODO_STATES } from '../../../main/contracts'
import type { TodoStateKind } from '../../../main/contracts'
import './TodoStateMenu.css'

interface TodoStateMenuProps {
  current: TodoStateKind
  onSelect: (kind: TodoStateKind) => void
}

const STATE_ORDER: TodoStateKind[] = ['open', 'analyzing', 'in-progress', 'resolved', 'closed']

export function TodoStateMenu({ current, onSelect }: TodoStateMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const def = TODO_STATES[current]

  return (
    <div className="todo-state-menu" ref={ref}>
      <button
        className="todo-state-trigger"
        onClick={() => setOpen(!open)}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="todo-state-dot" style={{ background: def.color }} />
        <span className="todo-state-label">{def.label}</span>
        <ChevronDown size={14} className={`todo-state-chevron ${open ? 'rotated' : ''}`} />
      </button>
      {open && (
        <ul className="todo-state-dropdown" role="listbox" aria-label="상태 선택">
          {STATE_ORDER.map((kind) => {
            const s = TODO_STATES[kind]
            return (
              <li key={kind} role="option" aria-selected={kind === current}>
                <button
                  className={`todo-state-option ${kind === current ? 'active' : ''}`}
                  onClick={() => { onSelect(kind); setOpen(false) }}
                  type="button"
                >
                  <span className="todo-state-dot" style={{ background: s.color }} />
                  <span>{s.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
