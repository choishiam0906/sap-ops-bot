import { useState } from 'react'
import type { SettingsCategory } from '../components/settings/types.js'
import { SettingsNavigator } from './settings/SettingsNavigator.js'
import { SETTINGS_PAGES } from './settings/settings-pages.js'
import '../components/settings/primitives/settings-primitives.css'
import './SettingsPage.css'

export function SettingsPage() {
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('app')

  const PageComponent = SETTINGS_PAGES[activeCategory]

  return (
    <div className="settings-page page-enter">
      <SettingsNavigator
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />
      <div className="settings-detail">
        <PageComponent />
      </div>
    </div>
  )
}
