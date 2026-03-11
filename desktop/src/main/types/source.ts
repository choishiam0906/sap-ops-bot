import type { DomainPack } from './policy.js';
import type { VaultClassification, VaultSourceType } from './vault.js';

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
  updated: number;
  unchanged: number;
  removed: number;
  skipped: number;
  failed: number;
}

// MCP 공유 타입
export interface McpServerConfigInput {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface McpResourceInfo {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
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
  defaultPromptTemplate: string;
  outputFormat: SkillOutputFormat;
  requiredSources: string[];
  suggestedInputs: string[];
  suggestedTcodes: string[];
  isCustom?: boolean; // 커스텀 스킬 여부 (프리셋/커스텀 구분용)
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
