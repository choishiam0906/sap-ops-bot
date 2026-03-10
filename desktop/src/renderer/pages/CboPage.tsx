/**
 * @deprecated AnalysisMode로 통합됨.
 * CboPage.test.tsx 호환을 위해 래퍼로 유지합니다.
 */
import { AnalysisMode } from './sap-assistant/AnalysisMode.js'
import './CboPage.css'

export function CboPage() {
  return <AnalysisMode />
}
