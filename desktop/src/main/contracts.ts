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
