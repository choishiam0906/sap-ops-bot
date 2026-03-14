import { Globe, Database } from 'lucide-react'

export function ApiSourcesTab() {
  return (
    <div className="sources-coming-grid">
      <article className="sources-coming-card">
        <Globe size={18} aria-hidden="true" />
        <div>
          <strong>API Source Slots</strong>
          <p>v1은 실행형 API source 대신 future-ready slot과 정책 설명만 제공합니다.</p>
        </div>
      </article>
      <article className="sources-coming-card">
        <Database size={18} aria-hidden="true" />
        <p>향후 SAP 운영 API, 티켓 시스템, 문서 검색 API를 같은 source catalog 인터페이스로 연결할 수 있게 준비합니다.</p>
      </article>
    </div>
  )
}
