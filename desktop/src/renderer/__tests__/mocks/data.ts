/** 테스트 시드 데이터 — Mock API가 반환하는 기본 데이터 */

export const MOCK_SESSION = {
  id: 's1',
  title: '테스트',
  provider: 'openai',
  model: 'gpt-4.1-mini',
  createdAt: '',
  updatedAt: '',
} as const

export const MOCK_USER_MESSAGE = {
  id: 'm1',
  sessionId: 's1',
  role: 'user' as const,
  content: '테스트',
  inputTokens: 0,
  outputTokens: 0,
  createdAt: '',
}

export const MOCK_ASSISTANT_MESSAGE = {
  id: 'm2',
  sessionId: 's1',
  role: 'assistant' as const,
  content: '응답',
  inputTokens: 0,
  outputTokens: 10,
  createdAt: '',
}

export const MOCK_SKILL = {
  id: 'cbo-impact-analysis',
  title: 'CBO 변경 영향 분석',
  description: 'CBO 영향 분석',
  supportedDomainPacks: ['cbo-maintenance'],
  supportedDataTypes: ['chat', 'cbo'],
  defaultPromptTemplate: '',
  outputFormat: 'structured-report',
  requiredSources: ['workspace-context', 'vault-confidential'],
  suggestedInputs: ['이 변경이 어떤 객체에 영향을 주는지 정리해줘'],
  suggestedTcodes: ['SE80'],
}

export const MOCK_SKILL_PACK = {
  id: 'cbo-ops-starter',
  title: 'CBO + Ops Starter Pack',
  description: 'CBO와 운영 중심 skill pack',
  audience: 'mixed',
  domainPacks: ['ops', 'cbo-maintenance', 'functional'],
  skillIds: ['cbo-impact-analysis', 'incident-triage', 'transport-risk-review'],
}

export const MOCK_SEND_META = {
  skillUsed: 'cbo-impact-analysis',
  skillTitle: 'CBO 변경 영향 분석',
  sources: [{ title: 'Workspace Context', category: 'workspace', relevance_score: 1 }],
  sourceIds: ['workspace-context'],
  sourceCount: 1,
  suggestedTcodes: ['SE80'],
}

export const MOCK_SOURCES = [
  {
    id: 'workspace-context',
    title: 'Workspace Context',
    description: '현재 워크스페이스 설정',
    kind: 'workspace',
    classification: 'mixed',
    domainPack: 'cbo-maintenance',
    availability: 'ready',
    sourceType: 'workspace_context',
  },
  {
    id: 'vault-confidential',
    title: 'Confidential Vault',
    description: '기밀 운영 지식',
    kind: 'vault',
    classification: 'confidential',
    domainPack: 'cbo-maintenance',
    availability: 'ready',
    sourceType: 'internal_memo',
  },
]

export function createMockConfiguredSource(overrides?: Record<string, unknown>) {
  return {
    id: 'src1',
    kind: 'local-folder',
    title: 'FI CBO Sources',
    rootPath: 'C:/sap/cbo',
    domainPack: 'cbo-maintenance',
    classificationDefault: 'confidential',
    includeGlobs: ['**/*.txt', '**/*.md'],
    enabled: true,
    syncStatus: 'ready',
    lastIndexedAt: new Date().toISOString(),
    documentCount: 2,
    connectionMeta: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

export function createMockDocument(overrides?: Record<string, unknown>) {
  return {
    id: 'doc1',
    sourceId: 'src1',
    relativePath: 'billing/zsd_billing.txt',
    absolutePath: 'C:/sap/cbo/billing/zsd_billing.txt',
    title: 'zsd_billing.txt',
    excerpt: 'FORM validate_authority ...',
    contentText: 'REPORT ZSD_BILLING.',
    contentHash: 'hash-1',
    domainPack: 'cbo-maintenance',
    classification: 'confidential',
    tags: ['local-folder', 'cbo-maintenance'],
    indexedAt: new Date().toISOString(),
    ...overrides,
  }
}
