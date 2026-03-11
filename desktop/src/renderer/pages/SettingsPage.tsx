import { useState } from 'react'
import type { SettingsCategory } from '../components/settings/types.js'
import { SettingsNavigator } from './settings/SettingsNavigator.js'
import { SETTINGS_PAGES } from './settings/settings-pages.js'
import { PageHeader } from '../components/ui/PageHeader.js'
import '../components/settings/primitives/settings-primitives.css'
import './SettingsPage.css'

export function SettingsPage() {
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('app')

  const PageComponent = SETTINGS_PAGES[activeCategory]

  return (
    <div className="settings-page">
      <PageHeader
        title="설정"
        description="앱 환경과 AI 프로바이더를 구성하세요"
      />
      <div className="settings-body">
        <SettingsNavigator
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />
        <div className="settings-detail">
          <PageComponent />
        </div>
      </div>
    </div>
  )
}
