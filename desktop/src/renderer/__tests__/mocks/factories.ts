import { vi } from 'vitest'
import type { DesktopApi } from '../../../preload/index.js'
import {
  MOCK_SESSION,
  MOCK_USER_MESSAGE,
  MOCK_ASSISTANT_MESSAGE,
  MOCK_SKILL,
  MOCK_SKILL_PACK,
  MOCK_SEND_META,
  MOCK_SOURCES,
  createMockConfiguredSource,
  createMockDocument,
} from './data.js'

type MockApi = { [K in keyof DesktopApi]: ReturnType<typeof vi.fn> }

/** Mock API 팩토리. overrides로 개별 메서드를 재정의할 수 있다. */
export function createMockApi(overrides?: Partial<MockApi>): MockApi {
  const base: MockApi = {
    // Auth
    setApiKey: vi.fn().mockResolvedValue(undefined),
    getAuthStatus: vi.fn().mockImplementation((provider: string) =>
      Promise.resolve({
        provider,
        status: 'authenticated',
        accountHint: 'test@example.com',
        updatedAt: new Date().toISOString(),
      }),
    ),
    logout: vi.fn().mockResolvedValue(undefined),
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
    initiateDeviceCode: vi.fn().mockResolvedValue({
      userCode: 'ABCD-1234',
      verificationUri: 'https://github.com/login/device',
      expiresIn: 900,
      interval: 5,
    }),
    pollDeviceCode: vi.fn().mockResolvedValue({
      provider: 'copilot',
      status: 'authenticated',
      accountHint: 'github-user',
      authType: 'oauth',
      updatedAt: new Date().toISOString(),
    }),
    cancelDeviceCode: vi.fn().mockResolvedValue(undefined),

    // Chat
    sendMessage: vi.fn().mockResolvedValue({
      session: MOCK_SESSION,
      userMessage: MOCK_USER_MESSAGE,
      assistantMessage: MOCK_ASSISTANT_MESSAGE,
      meta: MOCK_SEND_META,
    }),
    listSessions: vi.fn().mockResolvedValue([]),
    getSessionMessages: vi.fn().mockResolvedValue([]),
    stopGeneration: vi.fn().mockResolvedValue(undefined),
    streamMessage: vi.fn().mockResolvedValue(undefined),
    onStreamChunk: vi.fn().mockReturnValue(() => {}),
    onStreamDone: vi.fn().mockReturnValue(() => {}),
    onStreamError: vi.fn().mockReturnValue(() => {}),
    setChatHistoryLimit: vi.fn().mockResolvedValue(undefined),
    getChatHistoryLimit: vi.fn().mockResolvedValue(10),

    // Skills
    listSkills: vi.fn().mockResolvedValue([MOCK_SKILL]),
    listSkillPacks: vi.fn().mockResolvedValue([MOCK_SKILL_PACK]),
    recommendSkills: vi.fn().mockResolvedValue([{
      skill: MOCK_SKILL,
      reason: '현재 Domain Pack과 가장 잘 맞는 기본 작업입니다.',
      recommendedSourceIds: ['workspace-context', 'vault-confidential'],
    }]),
    listSources: vi.fn().mockResolvedValue(MOCK_SOURCES),
    searchSources: vi.fn().mockResolvedValue([]),

    // Configured Sources
    listConfiguredSources: vi.fn().mockResolvedValue([createMockConfiguredSource()]),
    pickAndAddLocalFolderSource: vi.fn().mockResolvedValue({
      canceled: false,
      source: createMockConfiguredSource({ id: 'src2', title: '신규 Source', rootPath: 'C:/sap/new-source', documentCount: 1 }),
      summary: { indexed: 1, skipped: 0, failed: 0 },
    }),
    reindexSource: vi.fn().mockResolvedValue({
      source: createMockConfiguredSource(),
      summary: { indexed: 2, skipped: 0, failed: 0 },
    }),
    searchSourceDocuments: vi.fn().mockResolvedValue([createMockDocument()]),
    getSourceDocument: vi.fn().mockResolvedValue(createMockDocument()),

    // MCP
    mcpConnect: vi.fn().mockResolvedValue({ connected: true, name: 'test-server' }),
    mcpDisconnect: vi.fn().mockResolvedValue({ disconnected: true }),
    mcpListServers: vi.fn().mockResolvedValue([]),
    mcpListResources: vi.fn().mockResolvedValue([
      { uri: 'file:///docs/guide.md', name: 'guide.md', description: 'User guide' },
    ]),
    mcpAddSource: vi.fn().mockResolvedValue({
      source: createMockConfiguredSource({
        id: 'mcp-src1',
        kind: 'mcp',
        title: 'Test MCP Server',
        rootPath: null,
        domainPack: 'ops',
        classificationDefault: 'reference',
        includeGlobs: [],
        documentCount: 1,
        connectionMeta: { serverName: 'test-server', command: 'node', args: 'server.js' },
      }),
      summary: { indexed: 1, updated: 0, unchanged: 0, removed: 0, skipped: 0, failed: 0 },
    }),
    mcpSyncSource: vi.fn().mockResolvedValue({
      source: null,
      summary: { indexed: 1, updated: 0, unchanged: 0, removed: 0, skipped: 0, failed: 0 },
    }),

    // CBO
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

    // Audit & Vault
    listAuditLogs: vi.fn().mockResolvedValue([]),
    searchAuditLogs: vi.fn().mockResolvedValue([]),
    listVaultEntries: vi.fn().mockResolvedValue([]),
    searchVaultByClassification: vi.fn().mockResolvedValue([]),
    listVaultByDomainPack: vi.fn().mockResolvedValue([]),

    // Cockpit Sessions
    listSessionsFiltered: vi.fn().mockResolvedValue([]),
    updateSessionTodoState: vi.fn().mockResolvedValue(undefined),
    toggleSessionFlag: vi.fn().mockResolvedValue(undefined),
    toggleSessionArchive: vi.fn().mockResolvedValue(undefined),
    addSessionLabel: vi.fn().mockResolvedValue(undefined),
    removeSessionLabel: vi.fn().mockResolvedValue(undefined),
    getSessionStats: vi.fn().mockResolvedValue({
      all: 0, open: 0, analyzing: 0, 'in-progress': 0,
      resolved: 0, closed: 0, flagged: 0, archived: 0,
    }),

    // Closing (마감 관리)
    listPlans: vi.fn().mockResolvedValue([]),
    getPlan: vi.fn().mockResolvedValue(null),
    createPlan: vi.fn().mockResolvedValue({ id: 'plan-1', title: '테스트 Plan', type: 'monthly', targetDate: '2026-03-31', status: 'in-progress', progressPercent: 0, createdAt: '', updatedAt: '' }),
    updatePlan: vi.fn().mockResolvedValue(null),
    deletePlan: vi.fn().mockResolvedValue(true),
    listPlansByStatus: vi.fn().mockResolvedValue([]),
    listOverduePlans: vi.fn().mockResolvedValue([]),
    listSteps: vi.fn().mockResolvedValue([]),
    createStep: vi.fn().mockResolvedValue({ id: 'step-1', planId: 'plan-1', title: '테스트 Step', deadline: '2026-03-31', status: 'pending', sortOrder: 0, createdAt: '', updatedAt: '' }),
    updateStep: vi.fn().mockResolvedValue(null),
    deleteStep: vi.fn().mockResolvedValue(true),
    reorderSteps: vi.fn().mockResolvedValue(undefined),
    getClosingStats: vi.fn().mockResolvedValue({ totalPlans: 0, completedPlans: 0, delayedPlans: 0, inProgressPlans: 0, totalSteps: 0, completedSteps: 0, overdueSteps: 0, imminentSteps: 0 }),

    // Routine (루틴 업무 자동화)
    listRoutineTemplates: vi.fn().mockResolvedValue([]),
    listRoutineTemplatesByFrequency: vi.fn().mockResolvedValue([]),
    getRoutineTemplate: vi.fn().mockResolvedValue(null),
    createRoutineTemplate: vi.fn().mockResolvedValue({ id: 'rt-1', frequency: 'daily', name: '테스트 루틴', isActive: true, createdAt: '', updatedAt: '' }),
    updateRoutineTemplate: vi.fn().mockResolvedValue(null),
    deleteRoutineTemplate: vi.fn().mockResolvedValue(true),
    toggleRoutineTemplate: vi.fn().mockResolvedValue(null),
    listRoutineKnowledgeLinks: vi.fn().mockResolvedValue([]),
    linkRoutineKnowledge: vi.fn().mockResolvedValue({
      id: 'rk-1', templateId: 'rt-1', targetType: 'vault', targetId: 'vault-1',
      title: '테스트 문서', excerpt: '요약', location: '/vault/test.md',
      classification: 'confidential', sourceType: 'internal_memo', createdAt: new Date().toISOString(),
    }),
    unlinkRoutineKnowledge: vi.fn().mockResolvedValue(true),
    executeRoutinesNow: vi.fn().mockResolvedValue({ created: 0, skipped: 0 }),
    listRoutineExecutions: vi.fn().mockResolvedValue([]),
    getRoutineExecutionPlanIds: vi.fn().mockResolvedValue([]),

    // Archive
    archivePickFolder: vi.fn().mockResolvedValue({ canceled: true, path: null }),
    archiveListContents: vi.fn().mockResolvedValue([]),
    archiveReadFile: vi.fn().mockResolvedValue({ content: '', size: 0 }),
    archiveSaveFile: vi.fn().mockResolvedValue({ success: true }),

    // Agent
    listAgents: vi.fn().mockResolvedValue([]),
    getAgent: vi.fn().mockResolvedValue(null),
    executeAgent: vi.fn().mockResolvedValue('exec-1'),
    getAgentExecution: vi.fn().mockResolvedValue(null),
    listAgentExecutions: vi.fn().mockResolvedValue([]),
    cancelAgentExecution: vi.fn().mockResolvedValue(undefined),
    listCustomAgents: vi.fn().mockResolvedValue([]),
    saveCustomAgent: vi.fn().mockResolvedValue(undefined),
    deleteCustomAgent: vi.fn().mockResolvedValue(undefined),
    openAgentFolder: vi.fn().mockResolvedValue(undefined),
    listCustomSkills: vi.fn().mockResolvedValue([]),
    saveCustomSkill: vi.fn().mockResolvedValue(undefined),
    deleteCustomSkill: vi.fn().mockResolvedValue(undefined),
    openSkillFolder: vi.fn().mockResolvedValue(undefined),

    // Policy Engine
    listPolicyRules: vi.fn().mockResolvedValue([]),
    createPolicyRule: vi.fn().mockResolvedValue({ id: 'rule-1', name: '테스트 규칙', conditions: [], action: 'auto_approve', priority: 100, enabled: true, createdAt: '', updatedAt: '' }),
    updatePolicyRule: vi.fn().mockResolvedValue(null),
    deletePolicyRule: vi.fn().mockResolvedValue(true),
    evaluatePolicy: vi.fn().mockResolvedValue({ action: 'auto_approve', matchedRule: null }),
    listPendingApprovals: vi.fn().mockResolvedValue([]),
    decideApproval: vi.fn().mockResolvedValue(undefined),

    // Schedule
    listScheduledTasks: vi.fn().mockResolvedValue([]),
    createScheduledTask: vi.fn().mockResolvedValue({ id: 'st-1', templateId: 'rt-1', cronExpression: '0 9 * * 1-5', enabled: true, lastRunAt: null, nextRunAt: null, createdAt: '' }),
    updateScheduledTask: vi.fn().mockResolvedValue(null),
    deleteScheduledTask: vi.fn().mockResolvedValue(true),
    executeScheduleNow: vi.fn().mockResolvedValue(undefined),
    listScheduleLogs: vi.fn().mockResolvedValue([]),
    listRecentScheduleLogs: vi.fn().mockResolvedValue([]),
    onScheduleExecutionComplete: vi.fn().mockReturnValue(() => {}),
  }

  return { ...base, ...overrides }
}
