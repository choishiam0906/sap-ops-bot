import React from 'react'

/* ─── SettingsGroup ─── 최상위 그룹 (대문자 제목 + 구분선) */

interface SettingsGroupProps {
  title: string
  children: React.ReactNode
}

export function SettingsGroup({ title, children }: SettingsGroupProps) {
  return (
    <div className="sp-group">
      <h4 className="sp-group-title">{title}</h4>
      <div className="sp-group-content">{children}</div>
    </div>
  )
}

/* ─── SettingsDivider ─── 수평 구분선 */

export function SettingsDivider() {
  return <div className="sp-divider" role="separator" />
}

/* ─── SettingsSection ─── 섹션 컨테이너 (title + desc + action + children) */

interface SettingsSectionProps {
  title: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
}

export function SettingsSection({ title, description, action, children }: SettingsSectionProps) {
  return (
    <section className="settings-section">
      {action ? (
        <div className="section-header-row">
          <div className="section-header-group">
            <h4 className="section-title">{title}</h4>
            {description && <p className="section-desc">{description}</p>}
          </div>
          {action}
        </div>
      ) : (
        <div className="section-header-group">
          <h4 className="section-title">{title}</h4>
          {description && <p className="section-desc">{description}</p>}
        </div>
      )}
      {children}
    </section>
  )
}
