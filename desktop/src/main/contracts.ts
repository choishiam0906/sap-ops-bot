export type ProviderType = "openai" | "anthropic" | "google";

// 워크스페이스 정책 타입 — Main/Renderer 공유
export type SecurityMode = "secure-local" | "reference" | "hybrid-approved";
export type DomainPack =
  | "ops"
  | "functional"
  | "cbo-maintenance"
  | "pi-integration"
  | "btp-rap-cap";

export interface PolicyContext {
  securityMode: SecurityMode;
  domainPack: DomainPack;
  dataType: "chat" | "cbo";
}

export interface PolicyDecision {
  allowed: boolean;
  reason: string;
  requiresApproval: boolean;
}

export type AuditAction =
  | "send_message"
  | "analyze_cbo"
  | "sync_knowledge"
  | "stream_message";

export type AuditPolicyDecision = "ALLOWED" | "BLOCKED" | "PENDING_APPROVAL";

export interface AuditLogEntry {
  id: string;
  sessionId: string | null;
  runId: string | null;
  timestamp: string;
  securityMode: SecurityMode;
  domainPack: DomainPack;
  action: AuditAction;
  externalTransfer: boolean;
  policyDecision: AuditPolicyDecision;
  provider: ProviderType | null;
  model: string | null;
  skillId?: string | null;
  sourceIds?: string[] | null;
  sourceCount?: number;
}

export interface AuditSearchFilters {
  from?: string;
  to?: string;
  action?: AuditAction;
  securityMode?: SecurityMode;
}

// Knowledge Vault
export type VaultClassification = "confidential" | "reference";
export type VaultSourceType = "cbo_analysis" | "sap_standard" | "internal_memo";

export interface VaultEntry {
  id: string;
  classification: VaultClassification;
  sourceType: VaultSourceType;
  domainPack: DomainPack | null;
  title: string;
  excerpt: string | null;
  sourceId: string | null;
  filePath: string | null;
  indexedAt: string;
}

export const PROVIDER_LABELS: Record<ProviderType, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google Gemini",
};

export const PROVIDER_MODELS: Record<ProviderType, { value: string; label: string }[]> = {
  openai: [
    { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
    { value: 'gpt-4.1', label: 'GPT-4.1' },
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'o4-mini', label: 'o4-mini' },
  ],
  anthropic: [
    { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
    { value: 'claude-opus-4-6', label: 'Claude Opus 4.6' },
    { value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' },
  ],
  google: [
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
  ],
}

export const DEFAULT_MODELS: Record<ProviderType, string> = {
  openai: 'gpt-4.1-mini',
  anthropic: 'claude-sonnet-4-6',
  google: 'gemini-2.5-flash',
}

export type AuthStatus =
  | "unauthenticated"
  | "pending"
  | "authenticated"
  | "expired"
  | "error";

export interface ProviderAccount {
  provider: ProviderType;
  status: AuthStatus;
  accountHint: string | null;
  authType?: "api-key" | "oauth";
  updatedAt: string;
}

export interface OAuthInitResult {
  authUrl: string;
  provider: ProviderType;
  /** true = localhost 콜백 자동 수신, false = 사용자가 코드를 수동 입력 */
  useCallbackServer: boolean;
}

export interface OAuthAvailability {
  provider: ProviderType;
  available: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  provider: ProviderType;
  model: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: "user" | "assistant" | "system";
  content: string;
  inputTokens: number;
  outputTokens: number;
  createdAt: string;
}

export interface SourceReference {
  id?: string;
  title: string;
  category: string;
  relevance_score: number;
  description?: string | null;
}

export type SkillOutputFormat =
  | "chat-answer"
  | "structured-report"
  | "checklist"
  | "explanation";

export type SapSourceKind =
  | "vault"
  | "run"
  | "local-file"
  | "workspace"
  | "local-folder"
  | "mcp"
  | "api";
export type SapSourceAvailability = "ready" | "empty" | "unavailable";
export type ConfiguredSourceKind = "local-folder" | "mcp" | "api";
export type SourceSyncStatus = "idle" | "indexing" | "ready" | "error";

export interface ConfiguredSource {
  id: string;
  kind: ConfiguredSourceKind;
  title: string;
  rootPath: string | null;
  domainPack: DomainPack | null;
  classificationDefault: VaultClassification | null;
  includeGlobs: string[];
  enabled: boolean;
  syncStatus: SourceSyncStatus;
  lastIndexedAt: string | null;
  documentCount: number;
  connectionMeta: Record<string, string> | null;
  createdAt: string;
  updatedAt: string;
}

export interface PickAndAddLocalFolderSourceInput {
  title?: string;
  domainPack: DomainPack;
  classificationDefault: VaultClassification;
  includeGlobs?: string[];
}

export interface SourceIndexSummary {
  indexed: number;
  skipped: number;
  failed: number;
}

export interface PickAndAddLocalFolderSourceOutput {
  canceled: boolean;
  source: ConfiguredSource | null;
  summary: SourceIndexSummary | null;
}

export interface SourceDocument {
  id: string;
  sourceId: string;
  relativePath: string;
  absolutePath: string;
  title: string;
  excerpt: string | null;
  contentText: string;
  contentHash: string;
  domainPack: DomainPack | null;
  classification: VaultClassification | null;
  tags: string[];
  indexedAt: string;
}

export interface SourceDocumentSearchInput {
  query?: string;
  sourceId?: string;
  sourceKind?: ConfiguredSourceKind;
  domainPack?: DomainPack;
  limit?: number;
}

export interface SkillPackDefinition {
  id: string;
  title: string;
  description: string;
  audience: "ops" | "functional" | "mixed";
  domainPacks: DomainPack[];
  skillIds: string[];
}

export interface SapSkillDefinition {
  id: string;
  title: string;
  description: string;
  supportedDomainPacks: DomainPack[];
  supportedDataTypes: Array<"chat" | "cbo">;
  allowedSecurityModes: SecurityMode[];
  defaultPromptTemplate: string;
  outputFormat: SkillOutputFormat;
  requiredSources: string[];
  suggestedInputs: string[];
  suggestedTcodes: string[];
}

export interface SapSourceDefinition {
  id: string;
  title: string;
  description: string;
  kind: SapSourceKind;
  classification: VaultClassification | "mixed" | null;
  domainPack: DomainPack | null;
  availability: SapSourceAvailability;
  sourceType:
    | VaultSourceType
    | "current_run"
    | "local_file"
    | "workspace_context"
    | "local_folder_library"
    | "mcp_connector"
    | "api_connector";
  linkedId?: string | null;
  configuredSourceId?: string | null;
  rootPath?: string | null;
  documentCount?: number;
}

export interface CaseContext {
  runId?: string;
  filePath?: string;
  objectName?: string;
}

export interface SkillExecutionContext {
  securityMode: SecurityMode;
  domainPack: DomainPack;
  dataType: "chat" | "cbo";
  message?: string;
  caseContext?: CaseContext;
}

export interface SkillRecommendation {
  skill: SapSkillDefinition;
  reason: string;
  recommendedSourceIds: string[];
}

export interface SkillExecutionMeta {
  skillUsed: string;
  skillTitle: string;
  sources: SourceReference[];
  sourceIds: string[];
  sourceCount: number;
  suggestedTcodes: string[];
}

export interface SendMessageInput {
  sessionId?: string;
  provider: ProviderType;
  model: string;
  message: string;
  securityMode: SecurityMode;
  domainPack: DomainPack;
  skillId?: string;
  sourceIds?: string[];
  caseContext?: CaseContext;
}

export interface SendMessageOutput {
  session: ChatSession;
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  meta: SkillExecutionMeta;
}

export interface StreamMessageInput {
  sessionId?: string;
  provider: ProviderType;
  model: string;
  message: string;
  apiBaseUrl?: string;
  skillId?: string;
  sourceIds?: string[];
  caseContext?: CaseContext;
}

export interface StreamMetaEvent {
  type: "meta";
  sources: SourceReference[];
  suggested_tcodes: string[];
  skill_used: string;
  skill_title: string;
  source_count: number;
}

export interface StreamTokenEvent {
  type: "token";
  content: string;
}

export interface StreamDoneEvent {
  type: "done";
}

export interface StreamErrorEvent {
  type: "error";
  content: string;
}

export type StreamEvent =
  | StreamMetaEvent
  | StreamTokenEvent
  | StreamDoneEvent
  | StreamErrorEvent;

export interface SubmitFeedbackInput {
  messageId: string;
  rating: "positive" | "negative";
  comment?: string;
}

export interface SetApiKeyInput {
  provider: ProviderType;
  apiKey: string;
}

export type CboRiskSeverity = "high" | "medium" | "low";
export type CboRecommendationPriority = "p0" | "p1" | "p2";

export interface CboRisk {
  severity: CboRiskSeverity;
  title: string;
  detail: string;
  evidence?: string;
}

export interface CboRecommendation {
  priority: CboRecommendationPriority;
  action: string;
  rationale: string;
}

export interface CboAnalysisMetadata {
  fileName: string;
  charCount: number;
  languageHint: "abap" | "unknown";
}

export interface CboAnalysisResult {
  summary: string;
  risks: CboRisk[];
  recommendations: CboRecommendation[];
  metadata: CboAnalysisMetadata;
  skillUsed?: string;
  skillTitle?: string;
  sources?: SourceReference[];
  sourceIds?: string[];
  suggestedTcodes?: string[];
}

export interface CboAnalyzeTextInput {
  fileName: string;
  content: string;
  provider?: ProviderType;
  model?: string;
  securityMode?: SecurityMode;
  domainPack?: DomainPack;
}

export interface CboAnalyzeFileInput {
  filePath: string;
  provider?: ProviderType;
  model?: string;
  securityMode?: SecurityMode;
  domainPack?: DomainPack;
}

export interface CboAnalyzePickInput {
  provider?: ProviderType;
  model?: string;
  securityMode?: SecurityMode;
  domainPack?: DomainPack;
}

export interface CboAnalyzePickOutput {
  canceled: boolean;
  filePath: string | null;
  result: CboAnalysisResult | null;
}

export type CboAnalysisMode = "text" | "file" | "folder";
export type CboAnalysisFileStatus = "success" | "failed" | "skipped";
export type CboBatchFileErrorCode =
  | "UNSUPPORTED_EXT"
  | "TOO_LARGE"
  | "EMPTY_FILE"
  | "BINARY_FILE"
  | "ANALYZE_ERROR";

export interface CboBatchFileError {
  filePath: string;
  code: CboBatchFileErrorCode;
  message: string;
}

export interface CboAnalysisRunSummary {
  id: string;
  mode: CboAnalysisMode;
  rootPath: string | null;
  provider: ProviderType | null;
  model: string | null;
  totalFiles: number;
  successFiles: number;
  failedFiles: number;
  skippedFiles: number;
  startedAt: string;
  finishedAt: string | null;
}

export interface CboAnalysisFileRecord {
  id: string;
  runId: string;
  filePath: string;
  fileName: string;
  fileHash: string | null;
  status: CboAnalysisFileStatus;
  errorCode: string | null;
  errorMessage: string | null;
  result: CboAnalysisResult | null;
  analyzedAt: string;
}

export interface CboAnalysisRunDetail {
  run: CboAnalysisRunSummary;
  files: CboAnalysisFileRecord[];
}

export interface CboAnalyzeFolderInput {
  rootPath: string;
  recursive?: boolean;
  provider?: ProviderType;
  model?: string;
  skipUnchanged?: boolean;
  securityMode?: SecurityMode;
  domainPack?: DomainPack;
}

export interface CboAnalyzeFolderOutput {
  run: CboAnalysisRunSummary;
  errors: CboBatchFileError[];
}

export interface CboAnalyzeFolderPickInput {
  recursive?: boolean;
  provider?: ProviderType;
  model?: string;
  skipUnchanged?: boolean;
  securityMode?: SecurityMode;
  domainPack?: DomainPack;
}

export interface CboAnalyzeFolderPickOutput {
  canceled: boolean;
  rootPath: string | null;
  output: CboAnalyzeFolderOutput | null;
}

export interface CboSyncKnowledgeFailure {
  filePath: string;
  message: string;
}

export interface CboSyncKnowledgeInput {
  runId: string;
  apiBaseUrl?: string;
}

export interface CboSyncKnowledgeOutput {
  runId: string;
  mode: "bulk" | "single-fallback";
  endpoint: string;
  totalCandidates: number;
  synced: number;
  failed: number;
  failures: CboSyncKnowledgeFailure[];
}

export interface CboRunDiffInput {
  fromRunId: string;
  toRunId: string;
}

export type CboRunDiffChangeType = "added" | "resolved" | "persisted";

export interface CboRunDiffItem {
  type: CboRunDiffChangeType;
  filePath: string;
  severity: CboRiskSeverity;
  title: string;
  detail: string;
}

export interface CboRunDiffOutput {
  fromRunId: string;
  toRunId: string;
  added: number;
  resolved: number;
  persisted: number;
  changes: CboRunDiffItem[];
}

export interface CboBatchProgressEvent {
  runId: string;
  current: number;
  total: number;
  filePath: string;
  status: "analyzing" | "success" | "failed" | "skipped";
}

// ─── SAP Cockpit: 세션 운영 상태 관리 ───

export type TodoStateKind = "open" | "analyzing" | "in-progress" | "resolved" | "closed";

export interface TodoStateDef {
  kind: TodoStateKind;
  label: string;
  icon: string;
  color: string;
  category: "open" | "closed";
}

export const TODO_STATES: Record<TodoStateKind, TodoStateDef> = {
  open:          { kind: "open",        label: "접수",   icon: "CircleDot",   color: "#3B82F6", category: "open" },
  analyzing:     { kind: "analyzing",   label: "분석중", icon: "Search",      color: "#F97316", category: "open" },
  "in-progress": { kind: "in-progress", label: "처리중", icon: "Loader2",     color: "#EAB308", category: "open" },
  resolved:      { kind: "resolved",    label: "해결",   icon: "CheckCircle", color: "#10B981", category: "closed" },
  closed:        { kind: "closed",      label: "종료",   icon: "XCircle",     color: "#6B7280", category: "closed" },
};

export type SapLabel = "FI" | "CO" | "MM" | "SD" | "PP" | "BC" | "PI" | "BTP";
export const SAP_LABELS: SapLabel[] = ["FI", "CO", "MM", "SD", "PP", "BC", "PI", "BTP"];

export interface SessionFilter {
  kind: "allSessions" | "state" | "label" | "flagged" | "archived";
  value?: string;
}

export interface ChatSessionMeta extends ChatSession {
  todoState: TodoStateKind;
  isFlagged: boolean;
  isArchived: boolean;
  labels: SapLabel[];
}

export interface SessionUpdateInput {
  sessionId: string;
  todoState?: TodoStateKind;
  isFlagged?: boolean;
  isArchived?: boolean;
  labels?: SapLabel[];
}

export interface CockpitStats {
  all: number;
  open: number;
  analyzing: number;
  "in-progress": number;
  resolved: number;
  closed: number;
  flagged: number;
  archived: number;
}
