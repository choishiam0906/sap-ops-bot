import { useState, useRef } from 'react'
import './Tooltip.css'

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right'

interface TooltipProps {
  content: string
  position?: TooltipPosition
  children: React.ReactElement
}

export function Tooltip({ content, position = 'top', children }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

  function show() {
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setVisible(true), 300)
  }

  function hide() {
    clearTimeout(timeoutRef.current)
    setVisible(false)
  }

  return (
    <div
      className="ui-tooltip-wrapper"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible && (
        <div className={`ui-tooltip ui-tooltip-${position}`} role="tooltip">
          {content}
        </div>
      )}
    </div>
  )
}
