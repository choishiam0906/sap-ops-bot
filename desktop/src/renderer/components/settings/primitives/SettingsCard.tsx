import React, { Children } from 'react'

/**
 * SettingsCard — 개선된 카드 래퍼
 * 기존 ui/SettingsCard 대체: divided prop, Content/Footer 서브컴포넌트 추가
 */

interface SettingsCardProps {
  children: React.ReactNode
  /** true(기본값): 자식 사이에 자동 구분선 삽입 */
  divided?: boolean
}

export function SettingsCard({ children, divided = true }: SettingsCardProps) {
  const childArray = Children.toArray(children).filter(Boolean)

  return (
    <div className="settings-card">
      {divided && childArray.length > 1
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

/* ─── SettingsCardContent ─── 카드 내부 패딩 컨테이너 */

interface SettingsCardContentProps {
  children: React.ReactNode
  className?: string
}

export function SettingsCardContent({ children, className }: SettingsCardContentProps) {
  return (
    <div className={`sp-card-content ${className ?? ''}`}>
      {children}
    </div>
  )
}

/* ─── SettingsCardFooter ─── 카드 하단 액션 영역 */

interface SettingsCardFooterProps {
  children: React.ReactNode
}

export function SettingsCardFooter({ children }: SettingsCardFooterProps) {
  return (
    <div className="sp-card-footer">
      {children}
    </div>
  )
}
