// AiSettingsPage — SettingsAiSection을 프리미티브 래퍼로 감싸서 독립 페이지화
// AI 섹션은 869줄의 복잡한 로직(OAuth, 위자드 등)을 포함하므로
// 기존 컴포넌트를 그대로 재사용하되 페이지 래퍼만 교체합니다.

import { SettingsAiSection } from '../../components/settings/SettingsAiSection.js'

export function AiSettingsPage() {
  return <SettingsAiSection />
}
