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

export interface SendMessageInput {
  sessionId?: string;
  provider: ProviderType;
  model: string;
  message: string;
  securityMode: SecurityMode;
  domainPack: DomainPack;
}

export interface SendMessageOutput {
  session: ChatSession;
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
}

export interface StreamMessageInput {
  sessionId?: string;
  provider: ProviderType;
  model: string;
  message: string;
  apiBaseUrl?: string;
}

export interface StreamMetaEvent {
  type: "meta";
  sources: Array<{ title: string; category: string; relevance_score: number }>;
  suggested_tcodes: string[];
  skill_used: string;
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
