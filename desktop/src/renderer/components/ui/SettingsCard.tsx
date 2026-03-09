import React, { Children } from 'react'

interface SettingsCardProps {
  children: React.ReactNode
}

export function SettingsCard({ children }: SettingsCardProps) {
  const childArray = Children.toArray(children).filter(Boolean)
  return (
    <div className="settings-card">
      {childArray.length > 1
        ? childArray.map((child, i) => (
            <React.Fragment key={i}>
              {i > 0 && <div className="card-divider" />}
              {child}
            </React.Fragment>
          ))
        : children}
    </div>
  )
}
