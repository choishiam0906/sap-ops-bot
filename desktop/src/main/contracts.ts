export type ProviderType = "codex" | "copilot";

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
  updatedAt: string;
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
}

export interface SendMessageOutput {
  session: ChatSession;
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
}

export interface OAuthStartResult {
  provider: ProviderType;
  verificationUri: string;
  userCode: string;
  state: string;
}

export interface OAuthCompleteInput {
  provider: ProviderType;
  state: string;
  code: string;
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
}

export interface CboAnalyzeFileInput {
  filePath: string;
  provider?: ProviderType;
  model?: string;
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
