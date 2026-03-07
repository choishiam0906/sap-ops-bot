import '@testing-library/jest-dom/vitest'
import type { DesktopApi } from '../../preload/index.js'

// window.sapOpsDesktop IPC 목킹
const mockApi: { [K in keyof DesktopApi]: ReturnType<typeof vi.fn> } = {
  setApiKey: vi.fn().mockResolvedValue(undefined),
  getAuthStatus: vi.fn().mockResolvedValue('unauthenticated'),
  logout: vi.fn().mockResolvedValue(undefined),
  sendMessage: vi.fn().mockResolvedValue({
    session: { id: 's1', title: '테스트', provider: 'openai', model: 'gpt-4.1-mini', createdAt: '', updatedAt: '' },
    userMessage: { id: 'm1', sessionId: 's1', role: 'user', content: '테스트', inputTokens: 0, outputTokens: 0, createdAt: '' },
    assistantMessage: { id: 'm2', sessionId: 's1', role: 'assistant', content: '응답', inputTokens: 0, outputTokens: 10, createdAt: '' },
  }),
  listSessions: vi.fn().mockResolvedValue([]),
  getSessionMessages: vi.fn().mockResolvedValue([]),
  analyzeCboText: vi.fn().mockResolvedValue({ summary: '', risks: [], recommendations: [], metadata: { fileName: '', charCount: 0, languageHint: 'unknown' } }),
  analyzeCboFile: vi.fn().mockResolvedValue({ summary: '', risks: [], recommendations: [], metadata: { fileName: '', charCount: 0, languageHint: 'unknown' } }),
  analyzeCboFolder: vi.fn().mockResolvedValue({ run: {}, errors: [] }),
  pickAndAnalyzeCboFile: vi.fn().mockResolvedValue({ canceled: true, filePath: null, result: null }),
  pickAndAnalyzeCboFolder: vi.fn().mockResolvedValue({ canceled: true, rootPath: null, output: null }),
  listCboRuns: vi.fn().mockResolvedValue([]),
  getCboRunDetail: vi.fn().mockResolvedValue({ run: {}, files: [] }),
  syncCboRunKnowledge: vi.fn().mockResolvedValue({ runId: '', mode: 'bulk', endpoint: '', totalCandidates: 0, synced: 0, failed: 0, failures: [] }),
  diffCboRuns: vi.fn().mockResolvedValue({ fromRunId: '', toRunId: '', added: 0, resolved: 0, persisted: 0, changes: [] }),
  cancelCboFolder: vi.fn().mockResolvedValue(undefined),
  onCboProgress: vi.fn().mockReturnValue(() => {}),
  listAuditLogs: vi.fn().mockResolvedValue([]),
  searchAuditLogs: vi.fn().mockResolvedValue([]),
  listVaultEntries: vi.fn().mockResolvedValue([]),
  searchVaultByClassification: vi.fn().mockResolvedValue([]),
  listVaultByDomainPack: vi.fn().mockResolvedValue([]),
  getOAuthAvailability: vi.fn().mockResolvedValue([
    { provider: 'openai', available: true },
    { provider: 'anthropic', available: false },
    { provider: 'google', available: false },
  ]),
  initiateOAuth: vi.fn().mockResolvedValue({
    authUrl: 'https://auth.openai.com/authorize?...',
    provider: 'openai',
    useCallbackServer: true,
  }),
  waitOAuthCallback: vi.fn().mockResolvedValue({
    provider: 'openai',
    status: 'authenticated',
    accountHint: 'user@example.com',
    authType: 'oauth',
    updatedAt: new Date().toISOString(),
  }),
  cancelOAuth: vi.fn().mockResolvedValue(undefined),
  submitOAuthCode: vi.fn().mockResolvedValue({
    provider: 'anthropic',
    status: 'authenticated',
    accountHint: 'user@anthropic.com',
    authType: 'oauth',
    updatedAt: new Date().toISOString(),
  }),
}

Object.defineProperty(window, 'sapOpsDesktop', {
  value: mockApi,
  writable: true,
})

// 각 테스트 전에 모든 mock 초기화
beforeEach(() => {
  Object.values(mockApi).forEach((fn) => fn.mockClear())
})

// workspaceStore 초기화를 위한 헬퍼
export function resetWorkspaceStore() {
  const { useWorkspaceStore } = require('../stores/workspaceStore')
  useWorkspaceStore.setState({
    securityMode: 'secure-local',
    domainPack: 'ops',
  })
}

export { mockApi }
