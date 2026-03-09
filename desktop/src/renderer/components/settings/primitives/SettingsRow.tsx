import React from 'react'

/* ─── SettingsRow ─── 라벨+설명 왼쪽, 콘텐츠 오른쪽 범용 행 */

interface SettingsRowProps {
  label: string
  description?: string
  children: React.ReactNode
}

export function SettingsRow({ label, description, children }: SettingsRowProps) {
  return (
    <div className="settings-row">
      <div className="row-label-group">
        <span className="row-label">{label}</span>
        {description && <span className="row-desc">{description}</span>}
      </div>
      <div className="row-right">{children}</div>
    </div>
  )
}

/* ─── SettingsRowLabel ─── 독립 라벨 (SegmentedControl 위에 사용) */

interface SettingsRowLabelProps {
  children: React.ReactNode
}

export function SettingsRowLabel({ children }: SettingsRowLabelProps) {
  return <div className="sp-row-label-standalone">{children}</div>
}
