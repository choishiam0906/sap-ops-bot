import type { ComponentType } from 'react'
import type { SettingsCategory } from '../../components/settings/types.js'
import { AppSettingsPage } from './AppSettingsPage.js'
import { AiSettingsPage } from './AiSettingsPage.js'
import { AppearanceSettingsPage } from './AppearanceSettingsPage.js'
import { InputSettingsPage } from './InputSettingsPage.js'
import { WorkspaceSettingsPage } from './WorkspaceSettingsPage.js'
import { PermissionsSettingsPage } from './PermissionsSettingsPage.js'
import { LabelsSettingsPage } from './LabelsSettingsPage.js'
import { ShortcutsSettingsPage } from './ShortcutsSettingsPage.js'
import { PreferencesSettingsPage } from './PreferencesSettingsPage.js'
import { PolicySettingsPage } from './PolicySettingsPage.js'

/**
 * Settings 페이지 레지스트리 — craft-agents-oss 패턴
 * 카테고리 ID → 페이지 컴포넌트 매핑
 */
export const SETTINGS_PAGES: Record<SettingsCategory, ComponentType> = {
  app: AppSettingsPage,
  ai: AiSettingsPage,
  appearance: AppearanceSettingsPage,
  input: InputSettingsPage,
  workspace: WorkspaceSettingsPage,
  permissions: PermissionsSettingsPage,
  labels: LabelsSettingsPage,
  shortcuts: ShortcutsSettingsPage,
  preferences: PreferencesSettingsPage,
  policy: PolicySettingsPage,
}
