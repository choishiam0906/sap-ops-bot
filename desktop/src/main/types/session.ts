import type { ProviderType } from './provider.js';
import type { DomainPack } from './policy.js';
import type { SourceReference, SapSkillDefinition } from './source.js';

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
  sourceReferences: SourceReference[];
  createdAt: string;
}

export interface CaseContext {
  runId?: string;
  filePath?: string;
  objectName?: string;
  sourceContent?: string;
}

export interface SkillExecutionContext {
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
