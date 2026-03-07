import { randomUUID } from "node:crypto";

import {
  AuditLogEntry,
  AuditSearchFilters,
  CboAnalysisResult,
  CboAnalysisRunDetail,
  CboAnalysisRunSummary,
  CboBatchFileErrorCode,
  ChatMessage,
  ChatSession,
  ChatSessionMeta,
  CockpitStats,
  ConfiguredSource,
  ConfiguredSourceKind,
  DomainPack,
  ProviderAccount,
  ProviderType,
  SapLabel,
  SecurityMode,
  SourceDocument,
  SourceDocumentSearchInput,
  SourceSyncStatus,
  SessionFilter,
  TodoStateKind,
  VaultClassification,
  VaultEntry,
} from "../contracts.js";
import { LocalDatabase } from "./sqlite.js";

function nowIso(): string {
  return new Date().toISOString();
}

export class SessionRepository {
  constructor(private readonly db: LocalDatabase) {}

  list(limit = 50): ChatSession[] {
    const rows = this.db
      .prepare(
        `SELECT id, title, provider, model, created_at AS createdAt, updated_at AS updatedAt
         FROM sessions
         ORDER BY updated_at DESC
         LIMIT ?`
      )
      .all(limit) as ChatSession[];
    return rows;
  }

  getById(sessionId: string): ChatSession | null {
    const row = this.db
      .prepare(
        `SELECT id, title, provider, model, created_at AS createdAt, updated_at AS updatedAt
         FROM sessions WHERE id = ?`
      )
      .get(sessionId) as ChatSession | undefined;
    return row ?? null;
  }

  create(provider: ProviderType, model: string, title = "새 대화"): ChatSession {
    const now = nowIso();
    const session: ChatSession = {
      id: randomUUID(),
      title,
      provider,
      model,
      createdAt: now,
      updatedAt: now,
    };

    this.db
      .prepare(
        `INSERT INTO sessions(id, title, provider, model, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        session.id,
        session.title,
        session.provider,
        session.model,
        session.createdAt,
        session.updatedAt
      );
    return session;
  }

  touch(sessionId: string): void {
    this.db
      .prepare(
        `UPDATE sessions SET updated_at = ? WHERE id = ?`
      )
      .run(nowIso(), sessionId);
  }

  // ─── Cockpit 메서드 ───

  listFiltered(filter: SessionFilter, limit = 50): ChatSessionMeta[] {
    let where: string;
    const params: unknown[] = [];

    switch (filter.kind) {
      case "state":
        where = "WHERE todo_state = ? AND is_archived = 0";
        params.push(filter.value);
        break;
      case "label":
        where = `WHERE labels LIKE ? AND is_archived = 0`;
        params.push(`%"${filter.value}"%`);
        break;
      case "flagged":
        where = "WHERE is_flagged = 1 AND is_archived = 0";
        break;
      case "archived":
        where = "WHERE is_archived = 1";
        break;
      default:
        where = "WHERE is_archived = 0";
    }

    params.push(limit);
    const rows = this.db
      .prepare(
        `SELECT id, title, provider, model,
                created_at AS createdAt, updated_at AS updatedAt,
                todo_state AS todoState, is_flagged AS isFlagged,
                is_archived AS isArchived, labels
         FROM sessions
         ${where}
         ORDER BY updated_at DESC
         LIMIT ?`
      )
      .all(...params) as SessionMetaRow[];

    return rows.map(toSessionMeta);
  }

  updateTodoState(sessionId: string, state: TodoStateKind): void {
    this.db
      .prepare(`UPDATE sessions SET todo_state = ?, updated_at = ? WHERE id = ?`)
      .run(state, nowIso(), sessionId);
  }

  toggleFlag(sessionId: string): void {
    this.db
      .prepare(`UPDATE sessions SET is_flagged = CASE WHEN is_flagged = 1 THEN 0 ELSE 1 END, updated_at = ? WHERE id = ?`)
      .run(nowIso(), sessionId);
  }

  toggleArchive(sessionId: string): void {
    this.db
      .prepare(`UPDATE sessions SET is_archived = CASE WHEN is_archived = 1 THEN 0 ELSE 1 END, updated_at = ? WHERE id = ?`)
      .run(nowIso(), sessionId);
  }

  setLabels(sessionId: string, labels: SapLabel[]): void {
    this.db
      .prepare(`UPDATE sessions SET labels = ?, updated_at = ? WHERE id = ?`)
      .run(JSON.stringify(labels), nowIso(), sessionId);
  }

  addLabel(sessionId: string, label: SapLabel): void {
    const row = this.db
      .prepare(`SELECT labels FROM sessions WHERE id = ?`)
      .get(sessionId) as { labels: string } | undefined;
    const current: SapLabel[] = row ? parseLabels(row.labels) : [];
    if (!current.includes(label)) {
      current.push(label);
      this.setLabels(sessionId, current);
    }
  }

  removeLabel(sessionId: string, label: SapLabel): void {
    const row = this.db
      .prepare(`SELECT labels FROM sessions WHERE id = ?`)
      .get(sessionId) as { labels: string } | undefined;
    const current: SapLabel[] = row ? parseLabels(row.labels) : [];
    const filtered = current.filter((l) => l !== label);
    if (filtered.length !== current.length) {
      this.setLabels(sessionId, filtered);
    }
  }

  getStats(): CockpitStats {
    const row = this.db
      .prepare(
        `SELECT
          COUNT(*) AS "all",
          SUM(CASE WHEN todo_state = 'open' AND is_archived = 0 THEN 1 ELSE 0 END) AS "open",
          SUM(CASE WHEN todo_state = 'analyzing' AND is_archived = 0 THEN 1 ELSE 0 END) AS analyzing,
          SUM(CASE WHEN todo_state = 'in-progress' AND is_archived = 0 THEN 1 ELSE 0 END) AS "in-progress",
          SUM(CASE WHEN todo_state = 'resolved' AND is_archived = 0 THEN 1 ELSE 0 END) AS resolved,
          SUM(CASE WHEN todo_state = 'closed' AND is_archived = 0 THEN 1 ELSE 0 END) AS closed,
          SUM(CASE WHEN is_flagged = 1 AND is_archived = 0 THEN 1 ELSE 0 END) AS flagged,
          SUM(CASE WHEN is_archived = 1 THEN 1 ELSE 0 END) AS archived
        FROM sessions`
      )
      .get() as CockpitStats;

    return row;
  }
}

interface SessionMetaRow {
  id: string;
  title: string;
  provider: ProviderType;
  model: string;
  createdAt: string;
  updatedAt: string;
  todoState: string;
  isFlagged: number;
  isArchived: number;
  labels: string;
}

function toSessionMeta(row: SessionMetaRow): ChatSessionMeta {
  return {
    id: row.id,
    title: row.title,
    provider: row.provider,
    model: row.model,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    todoState: (row.todoState || "open") as TodoStateKind,
    isFlagged: Boolean(row.isFlagged),
    isArchived: Boolean(row.isArchived),
    labels: parseLabels(row.labels),
  };
}

function parseLabels(raw: string): SapLabel[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((e): e is SapLabel => typeof e === "string") : [];
  } catch {
    return [];
  }
}

export class MessageRepository {
  constructor(private readonly db: LocalDatabase) {}

  listBySession(sessionId: string, limit = 100): ChatMessage[] {
    const rows = this.db
      .prepare(
        `SELECT id, session_id AS sessionId, role, content,
                input_tokens AS inputTokens, output_tokens AS outputTokens,
                created_at AS createdAt
         FROM messages
         WHERE session_id = ?
         ORDER BY created_at ASC
         LIMIT ?`
      )
      .all(sessionId, limit) as ChatMessage[];
    return rows;
  }

  append(
    sessionId: string,
    role: ChatMessage["role"],
    content: string,
    inputTokens = 0,
    outputTokens = 0
  ): ChatMessage {
    const message: ChatMessage = {
      id: randomUUID(),
      sessionId,
      role,
      content,
      inputTokens,
      outputTokens,
      createdAt: nowIso(),
    };
    this.db
      .prepare(
        `INSERT INTO messages(id, session_id, role, content, input_tokens, output_tokens, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        message.id,
        message.sessionId,
        message.role,
        message.content,
        message.inputTokens,
        message.outputTokens,
        message.createdAt
      );
    return message;
  }
}

export class ProviderAccountRepository {
  constructor(private readonly db: LocalDatabase) {}

  upsert(account: ProviderAccount): ProviderAccount {
    this.db
      .prepare(
        `INSERT INTO provider_accounts(provider, status, account_hint, auth_type, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(provider) DO UPDATE SET
           status=excluded.status,
           account_hint=excluded.account_hint,
           auth_type=excluded.auth_type,
           updated_at=excluded.updated_at`
      )
      .run(
        account.provider,
        account.status,
        account.accountHint,
        account.authType ?? null,
        account.updatedAt
      );
    return account;
  }

  get(provider: ProviderType): ProviderAccount | null {
    const row = this.db
      .prepare(
        `SELECT provider, status, account_hint AS accountHint, auth_type AS authType, updated_at AS updatedAt
         FROM provider_accounts WHERE provider = ?`
      )
      .get(provider) as ProviderAccount | undefined;
    return row ?? null;
  }
}

interface RunRow {
  id: string;
  mode: "text" | "file" | "folder";
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

interface FileRow {
  id: string;
  runId: string;
  filePath: string;
  fileName: string;
  fileHash: string | null;
  status: "success" | "failed" | "skipped";
  errorCode: string | null;
  errorMessage: string | null;
  summary: string | null;
  metadataJson: string | null;
  analyzedAt: string;
}

interface RiskRow {
  analysisFileId: string;
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  evidence: string | null;
}

interface RecommendationRow {
  analysisFileId: string;
  priority: "p0" | "p1" | "p2";
  action: string;
  rationale: string;
}

export class CboAnalysisRepository {
  constructor(private readonly db: LocalDatabase) {}

  createRun(
    mode: "text" | "file" | "folder",
    options?: {
      rootPath?: string | null;
      provider?: ProviderType;
      model?: string;
      totalFiles?: number;
    }
  ): CboAnalysisRunSummary {
    const run: CboAnalysisRunSummary = {
      id: randomUUID(),
      mode,
      rootPath: options?.rootPath ?? null,
      provider: options?.provider ?? null,
      model: options?.model ?? null,
      totalFiles: options?.totalFiles ?? 0,
      successFiles: 0,
      failedFiles: 0,
      skippedFiles: 0,
      startedAt: nowIso(),
      finishedAt: null,
    };

    this.db
      .prepare(
        `INSERT INTO analysis_runs(
          id, mode, root_path, provider, model,
          total_files, success_files, failed_files, skipped_files,
          started_at, finished_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        run.id,
        run.mode,
        run.rootPath,
        run.provider,
        run.model,
        run.totalFiles,
        run.successFiles,
        run.failedFiles,
        run.skippedFiles,
        run.startedAt,
        run.finishedAt
      );

    return run;
  }

  finalizeRun(
    runId: string,
    counters: {
      totalFiles: number;
      successFiles: number;
      failedFiles: number;
      skippedFiles: number;
    }
  ): CboAnalysisRunSummary | null {
    const finishedAt = nowIso();
    this.db
      .prepare(
        `UPDATE analysis_runs
         SET total_files = ?, success_files = ?, failed_files = ?, skipped_files = ?, finished_at = ?
         WHERE id = ?`
      )
      .run(
        counters.totalFiles,
        counters.successFiles,
        counters.failedFiles,
        counters.skippedFiles,
        finishedAt,
        runId
      );

    return this.getRunById(runId);
  }

  hasSuccessfulFile(filePath: string, fileHash: string): boolean {
    const row = this.db
      .prepare(
        `SELECT 1
         FROM analysis_files
         WHERE file_path = ? AND file_hash = ? AND status = 'success'
         LIMIT 1`
      )
      .get(filePath, fileHash) as { 1: number } | undefined;
    return Boolean(row);
  }

  recordSuccessFile(
    runId: string,
    filePath: string,
    fileName: string,
    fileHash: string,
    result: CboAnalysisResult
  ): string {
    const fileId = randomUUID();
    const analyzedAt = nowIso();
    const write = this.db.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO analysis_files(
            id, run_id, file_path, file_name, file_hash, status,
            error_code, error_message, summary, metadata_json, analyzed_at
          )
          VALUES (?, ?, ?, ?, ?, 'success', NULL, NULL, ?, ?, ?)`
        )
        .run(
          fileId,
          runId,
          filePath,
          fileName,
          fileHash,
          result.summary,
          JSON.stringify(result.metadata),
          analyzedAt
        );

      const insertRisk = this.db.prepare(
        `INSERT INTO analysis_risks(id, analysis_file_id, severity, title, detail, evidence)
         VALUES (?, ?, ?, ?, ?, ?)`
      );
      for (const risk of result.risks) {
        insertRisk.run(
          randomUUID(),
          fileId,
          risk.severity,
          risk.title,
          risk.detail,
          risk.evidence ?? null
        );
      }

      const insertRecommendation = this.db.prepare(
        `INSERT INTO analysis_recommendations(id, analysis_file_id, priority, action, rationale)
         VALUES (?, ?, ?, ?, ?)`
      );
      for (const recommendation of result.recommendations) {
        insertRecommendation.run(
          randomUUID(),
          fileId,
          recommendation.priority,
          recommendation.action,
          recommendation.rationale
        );
      }
    });
    write();
    return fileId;
  }

  recordFailedFile(
    runId: string,
    filePath: string,
    fileName: string,
    errorCode: CboBatchFileErrorCode,
    errorMessage: string
  ): string {
    const fileId = randomUUID();
    this.db
      .prepare(
        `INSERT INTO analysis_files(
          id, run_id, file_path, file_name, file_hash, status,
          error_code, error_message, summary, metadata_json, analyzed_at
        )
        VALUES (?, ?, ?, ?, NULL, 'failed', ?, ?, NULL, NULL, ?)`
      )
      .run(
        fileId,
        runId,
        filePath,
        fileName,
        errorCode,
        errorMessage,
        nowIso()
      );
    return fileId;
  }

  recordSkippedFile(
    runId: string,
    filePath: string,
    fileName: string,
    fileHash: string
  ): string {
    const fileId = randomUUID();
    this.db
      .prepare(
        `INSERT INTO analysis_files(
          id, run_id, file_path, file_name, file_hash, status,
          error_code, error_message, summary, metadata_json, analyzed_at
        )
        VALUES (?, ?, ?, ?, ?, 'skipped', NULL, NULL, NULL, NULL, ?)`
      )
      .run(fileId, runId, filePath, fileName, fileHash, nowIso());
    return fileId;
  }

  listRuns(limit = 20): CboAnalysisRunSummary[] {
    const rows = this.db
      .prepare(
        `SELECT
          id,
          mode,
          root_path AS rootPath,
          provider,
          model,
          total_files AS totalFiles,
          success_files AS successFiles,
          failed_files AS failedFiles,
          skipped_files AS skippedFiles,
          started_at AS startedAt,
          finished_at AS finishedAt
         FROM analysis_runs
         ORDER BY started_at DESC
         LIMIT ?`
      )
      .all(limit) as RunRow[];
    return rows;
  }

  getRunDetail(runId: string, limitFiles = 500): CboAnalysisRunDetail | null {
    const run = this.getRunById(runId);
    if (!run) {
      return null;
    }

    const files = this.db
      .prepare(
        `SELECT
          id,
          run_id AS runId,
          file_path AS filePath,
          file_name AS fileName,
          file_hash AS fileHash,
          status,
          error_code AS errorCode,
          error_message AS errorMessage,
          summary,
          metadata_json AS metadataJson,
          analyzed_at AS analyzedAt
         FROM analysis_files
         WHERE run_id = ?
         ORDER BY analyzed_at DESC
         LIMIT ?`
      )
      .all(runId, limitFiles) as FileRow[];

    if (files.length === 0) {
      return { run, files: [] };
    }

    const ids = files.map((file) => file.id);
    const placeholders = ids.map(() => "?").join(", ");
    const risks = this.db
      .prepare(
        `SELECT
          analysis_file_id AS analysisFileId,
          severity,
          title,
          detail,
          evidence
         FROM analysis_risks
         WHERE analysis_file_id IN (${placeholders})`
      )
      .all(...ids) as RiskRow[];
    const recommendations = this.db
      .prepare(
        `SELECT
          analysis_file_id AS analysisFileId,
          priority,
          action,
          rationale
         FROM analysis_recommendations
         WHERE analysis_file_id IN (${placeholders})`
      )
      .all(...ids) as RecommendationRow[];

    const risksByFile = new Map<string, RiskRow[]>();
    for (const risk of risks) {
      const list = risksByFile.get(risk.analysisFileId) ?? [];
      list.push(risk);
      risksByFile.set(risk.analysisFileId, list);
    }

    const recommendationsByFile = new Map<string, RecommendationRow[]>();
    for (const recommendation of recommendations) {
      const list = recommendationsByFile.get(recommendation.analysisFileId) ?? [];
      list.push(recommendation);
      recommendationsByFile.set(recommendation.analysisFileId, list);
    }

    return {
      run,
      files: files.map((file) => {
        const parsedMetadata = this.parseMetadata(file.metadataJson);
        const result =
          file.status === "success" && file.summary && parsedMetadata
            ? {
                summary: file.summary,
                metadata: parsedMetadata,
                risks: (risksByFile.get(file.id) ?? []).map((risk) => ({
                  severity: risk.severity,
                  title: risk.title,
                  detail: risk.detail,
                  evidence: risk.evidence ?? undefined,
                })),
                recommendations: (recommendationsByFile.get(file.id) ?? []).map(
                  (recommendation) => ({
                    priority: recommendation.priority,
                    action: recommendation.action,
                    rationale: recommendation.rationale,
                  })
                ),
              }
            : null;

        return {
          id: file.id,
          runId: file.runId,
          filePath: file.filePath,
          fileName: file.fileName,
          fileHash: file.fileHash,
          status: file.status,
          errorCode: file.errorCode,
          errorMessage: file.errorMessage,
          result,
          analyzedAt: file.analyzedAt,
        };
      }),
    };
  }

  private getRunById(runId: string): CboAnalysisRunSummary | null {
    const row = this.db
      .prepare(
        `SELECT
          id,
          mode,
          root_path AS rootPath,
          provider,
          model,
          total_files AS totalFiles,
          success_files AS successFiles,
          failed_files AS failedFiles,
          skipped_files AS skippedFiles,
          started_at AS startedAt,
          finished_at AS finishedAt
         FROM analysis_runs
         WHERE id = ?`
      )
      .get(runId) as RunRow | undefined;
    return row ?? null;
  }

  private parseMetadata(raw: string | null): CboAnalysisResult["metadata"] | null {
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as CboAnalysisResult["metadata"];
      if (
        typeof parsed.fileName !== "string" ||
        typeof parsed.charCount !== "number" ||
        (parsed.languageHint !== "abap" && parsed.languageHint !== "unknown")
      ) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }
}

interface AuditRow {
  id: string;
  sessionId: string | null;
  runId: string | null;
  timestamp: string;
  securityMode: SecurityMode;
  domainPack: string;
  action: string;
  externalTransfer: number;
  policyDecision: string;
  provider: string | null;
  model: string | null;
  skillId: string | null;
  sourceIds: string | null;
  sourceCount: number;
}

function toAuditLogEntry(row: AuditRow): AuditLogEntry {
  return {
    ...row,
    externalTransfer: Boolean(row.externalTransfer),
    sourceIds: row.sourceIds ? parseSourceIds(row.sourceIds) : null,
  } as AuditLogEntry;
}

export class AuditRepository {
  constructor(private readonly db: LocalDatabase) {}

  append(entry: AuditLogEntry): void {
    this.db
      .prepare(
        `INSERT INTO audit_logs(
          id, session_id, run_id, timestamp, security_mode, domain_pack,
          action, external_transfer, policy_decision, provider, model,
          skill_id, source_ids, source_count
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        entry.id,
        entry.sessionId,
        entry.runId,
        entry.timestamp,
        entry.securityMode,
        entry.domainPack,
        entry.action,
        entry.externalTransfer ? 1 : 0,
        entry.policyDecision,
        entry.provider,
        entry.model,
        entry.skillId ?? null,
        entry.sourceIds ? JSON.stringify(entry.sourceIds) : null,
        entry.sourceCount ?? entry.sourceIds?.length ?? 0
      );
  }

  list(limit = 50): AuditLogEntry[] {
    const rows = this.db
      .prepare(
        `SELECT
          id,
          session_id AS sessionId,
          run_id AS runId,
          timestamp,
          security_mode AS securityMode,
          domain_pack AS domainPack,
          action,
          external_transfer AS externalTransfer,
          policy_decision AS policyDecision,
          provider,
          model,
          skill_id AS skillId,
          source_ids AS sourceIds,
          source_count AS sourceCount
         FROM audit_logs
         ORDER BY timestamp DESC
         LIMIT ?`
      )
      .all(limit) as AuditRow[];
    return rows.map(toAuditLogEntry);
  }

  listBySession(sessionId: string): AuditLogEntry[] {
    const rows = this.db
      .prepare(
        `SELECT
          id,
          session_id AS sessionId,
          run_id AS runId,
          timestamp,
          security_mode AS securityMode,
          domain_pack AS domainPack,
          action,
          external_transfer AS externalTransfer,
          policy_decision AS policyDecision,
          provider,
          model,
          skill_id AS skillId,
          source_ids AS sourceIds,
          source_count AS sourceCount
         FROM audit_logs
         WHERE session_id = ?
         ORDER BY timestamp DESC`
      )
      .all(sessionId) as AuditRow[];
    return rows.map(toAuditLogEntry);
  }

  search(filters: AuditSearchFilters): AuditLogEntry[] {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters.from) {
      conditions.push("timestamp >= ?");
      params.push(filters.from);
    }
    if (filters.to) {
      conditions.push("timestamp <= ?");
      params.push(filters.to);
    }
    if (filters.action) {
      conditions.push("action = ?");
      params.push(filters.action);
    }
    if (filters.securityMode) {
      conditions.push("security_mode = ?");
      params.push(filters.securityMode);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const rows = this.db
      .prepare(
        `SELECT
          id,
          session_id AS sessionId,
          run_id AS runId,
          timestamp,
          security_mode AS securityMode,
          domain_pack AS domainPack,
          action,
          external_transfer AS externalTransfer,
          policy_decision AS policyDecision,
          provider,
          model,
          skill_id AS skillId,
          source_ids AS sourceIds,
          source_count AS sourceCount
         FROM audit_logs
         ${where}
         ORDER BY timestamp DESC
         LIMIT 200`
      )
      .all(...params) as AuditRow[];
    return rows.map(toAuditLogEntry);
  }
}

export class VaultRepository {
  constructor(private readonly db: LocalDatabase) {}

  store(entry: Omit<VaultEntry, "id" | "indexedAt">): VaultEntry {
    const id = randomUUID();
    const indexedAt = nowIso();
    this.db
      .prepare(
        `INSERT INTO knowledge_vault(
          id, classification, source_type, domain_pack, title, excerpt,
          source_id, file_path, indexed_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        entry.classification,
        entry.sourceType,
        entry.domainPack,
        entry.title,
        entry.excerpt,
        entry.sourceId,
        entry.filePath,
        indexedAt
      );
    return { id, indexedAt, ...entry };
  }

  searchByClassification(
    classification: VaultClassification,
    query?: string,
    limit = 50
  ): VaultEntry[] {
    if (query) {
      return this.db
        .prepare(
          `SELECT
            id, classification, source_type AS sourceType,
            domain_pack AS domainPack, title, excerpt,
            source_id AS sourceId, file_path AS filePath,
            indexed_at AS indexedAt
           FROM knowledge_vault
           WHERE classification = ? AND (title LIKE ? OR excerpt LIKE ?)
           ORDER BY indexed_at DESC
           LIMIT ?`
        )
        .all(classification, `%${query}%`, `%${query}%`, limit) as VaultEntry[];
    }

    return this.db
      .prepare(
        `SELECT
          id, classification, source_type AS sourceType,
          domain_pack AS domainPack, title, excerpt,
          source_id AS sourceId, file_path AS filePath,
          indexed_at AS indexedAt
         FROM knowledge_vault
         WHERE classification = ?
         ORDER BY indexed_at DESC
         LIMIT ?`
      )
      .all(classification, limit) as VaultEntry[];
  }

  listByDomainPack(pack: DomainPack, limit = 50): VaultEntry[] {
    return this.db
      .prepare(
        `SELECT
          id, classification, source_type AS sourceType,
          domain_pack AS domainPack, title, excerpt,
          source_id AS sourceId, file_path AS filePath,
          indexed_at AS indexedAt
         FROM knowledge_vault
         WHERE domain_pack = ?
         ORDER BY indexed_at DESC
         LIMIT ?`
      )
      .all(pack, limit) as VaultEntry[];
  }

  list(limit = 50): VaultEntry[] {
    return this.db
      .prepare(
        `SELECT
          id, classification, source_type AS sourceType,
          domain_pack AS domainPack, title, excerpt,
          source_id AS sourceId, file_path AS filePath,
          indexed_at AS indexedAt
         FROM knowledge_vault
         ORDER BY indexed_at DESC
         LIMIT ?`
      )
      .all(limit) as VaultEntry[];
  }

  getById(id: string): VaultEntry | null {
    const row = this.db
      .prepare(
        `SELECT
          id, classification, source_type AS sourceType,
          domain_pack AS domainPack, title, excerpt,
          source_id AS sourceId, file_path AS filePath,
          indexed_at AS indexedAt
         FROM knowledge_vault
         WHERE id = ?`
      )
      .get(id) as VaultEntry | undefined;
    return row ?? null;
  }
}

interface ConfiguredSourceRow {
  id: string;
  kind: ConfiguredSourceKind;
  title: string;
  rootPath: string | null;
  domainPack: DomainPack | null;
  classificationDefault: VaultClassification | null;
  includeGlobs: string;
  enabled: number;
  syncStatus: SourceSyncStatus;
  lastIndexedAt: string | null;
  connectionMeta: string | null;
  createdAt: string;
  updatedAt: string;
  documentCount: number;
}

function toConfiguredSource(row: ConfiguredSourceRow): ConfiguredSource {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    rootPath: row.rootPath,
    domainPack: row.domainPack,
    classificationDefault: row.classificationDefault,
    includeGlobs: parseStringArray(row.includeGlobs),
    enabled: Boolean(row.enabled),
    syncStatus: row.syncStatus,
    lastIndexedAt: row.lastIndexedAt,
    documentCount: row.documentCount ?? 0,
    connectionMeta: parseStringMap(row.connectionMeta),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class ConfiguredSourceRepository {
  constructor(private readonly db: LocalDatabase) {}

  list(kind?: ConfiguredSourceKind): ConfiguredSource[] {
    const where = kind ? "WHERE s.kind = ?" : "";
    const rows = this.db
      .prepare(
        `SELECT
          s.id,
          s.kind,
          s.title,
          s.root_path AS rootPath,
          s.domain_pack AS domainPack,
          s.classification_default AS classificationDefault,
          s.include_globs AS includeGlobs,
          s.enabled,
          s.sync_status AS syncStatus,
          s.last_indexed_at AS lastIndexedAt,
          s.connection_meta_json AS connectionMeta,
          s.created_at AS createdAt,
          s.updated_at AS updatedAt,
          COUNT(d.id) AS documentCount
         FROM configured_sources s
         LEFT JOIN source_documents d ON d.source_id = s.id
         ${where}
         GROUP BY s.id
         ORDER BY s.updated_at DESC`
      )
      .all(...(kind ? [kind] : [])) as ConfiguredSourceRow[];
    return rows.map(toConfiguredSource);
  }

  getById(id: string): ConfiguredSource | null {
    const row = this.db
      .prepare(
        `SELECT
          s.id,
          s.kind,
          s.title,
          s.root_path AS rootPath,
          s.domain_pack AS domainPack,
          s.classification_default AS classificationDefault,
          s.include_globs AS includeGlobs,
          s.enabled,
          s.sync_status AS syncStatus,
          s.last_indexed_at AS lastIndexedAt,
          s.connection_meta_json AS connectionMeta,
          s.created_at AS createdAt,
          s.updated_at AS updatedAt,
          COUNT(d.id) AS documentCount
         FROM configured_sources s
         LEFT JOIN source_documents d ON d.source_id = s.id
         WHERE s.id = ?
         GROUP BY s.id`
      )
      .get(id) as ConfiguredSourceRow | undefined;
    return row ? toConfiguredSource(row) : null;
  }

  createLocalFolder(input: {
    title: string;
    rootPath: string;
    domainPack: DomainPack;
    classificationDefault: VaultClassification;
    includeGlobs: string[];
  }): ConfiguredSource {
    const now = nowIso();
    const id = randomUUID();
    this.db
      .prepare(
        `INSERT INTO configured_sources(
          id, kind, title, root_path, domain_pack, classification_default,
          include_globs, enabled, sync_status, last_indexed_at,
          connection_meta_json, created_at, updated_at
        )
        VALUES (?, 'local-folder', ?, ?, ?, ?, ?, 1, 'idle', NULL, NULL, ?, ?)`
      )
      .run(
        id,
        input.title,
        input.rootPath,
        input.domainPack,
        input.classificationDefault,
        JSON.stringify(input.includeGlobs),
        now,
        now
      );
    return this.getById(id)!;
  }

  updateSyncStatus(sourceId: string, syncStatus: SourceSyncStatus, lastIndexedAt?: string | null): void {
    this.db
      .prepare(
        `UPDATE configured_sources
         SET sync_status = ?, last_indexed_at = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(syncStatus, lastIndexedAt ?? null, nowIso(), sourceId);
  }
}

interface SourceDocumentRow {
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
  tags: string;
  indexedAt: string;
}

function toSourceDocument(row: SourceDocumentRow): SourceDocument {
  return {
    id: row.id,
    sourceId: row.sourceId,
    relativePath: row.relativePath,
    absolutePath: row.absolutePath,
    title: row.title,
    excerpt: row.excerpt,
    contentText: row.contentText,
    contentHash: row.contentHash,
    domainPack: row.domainPack,
    classification: row.classification,
    tags: parseStringArray(row.tags),
    indexedAt: row.indexedAt,
  };
}

export class SourceDocumentRepository {
  constructor(private readonly db: LocalDatabase) {}

  replaceAllForSource(sourceId: string, documents: Array<Omit<SourceDocument, "id">>): void {
    const write = this.db.transaction(() => {
      this.db
        .prepare(`DELETE FROM source_documents WHERE source_id = ?`)
        .run(sourceId);

      const insert = this.db.prepare(
        `INSERT INTO source_documents(
          id, source_id, relative_path, absolute_path, title, excerpt,
          content_text, content_hash, domain_pack, classification, tags_json, indexed_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );

      for (const document of documents) {
        insert.run(
          randomUUID(),
          sourceId,
          document.relativePath,
          document.absolutePath,
          document.title,
          document.excerpt,
          document.contentText,
          document.contentHash,
          document.domainPack,
          document.classification,
          JSON.stringify(document.tags),
          document.indexedAt
        );
      }
    });
    write();
  }

  search(input: SourceDocumentSearchInput): SourceDocument[] {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (input.sourceId) {
      conditions.push("d.source_id = ?");
      params.push(input.sourceId);
    }
    if (input.sourceKind) {
      conditions.push("s.kind = ?");
      params.push(input.sourceKind);
    }
    if (input.domainPack) {
      conditions.push("d.domain_pack = ?");
      params.push(input.domainPack);
    }
    if (input.query?.trim()) {
      conditions.push("(d.title LIKE ? OR d.relative_path LIKE ? OR d.excerpt LIKE ? OR d.content_text LIKE ?)");
      const token = `%${input.query.trim()}%`;
      params.push(token, token, token, token);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const rows = this.db
      .prepare(
        `SELECT
          d.id,
          d.source_id AS sourceId,
          d.relative_path AS relativePath,
          d.absolute_path AS absolutePath,
          d.title,
          d.excerpt,
          d.content_text AS contentText,
          d.content_hash AS contentHash,
          d.domain_pack AS domainPack,
          d.classification,
          d.tags_json AS tags,
          d.indexed_at AS indexedAt
         FROM source_documents d
         JOIN configured_sources s ON s.id = d.source_id
         ${where}
         ORDER BY d.indexed_at DESC
         LIMIT ?`
      )
      .all(...params, input.limit ?? 50) as SourceDocumentRow[];
    return rows.map(toSourceDocument);
  }

  getById(id: string): SourceDocument | null {
    const row = this.db
      .prepare(
        `SELECT
          id,
          source_id AS sourceId,
          relative_path AS relativePath,
          absolute_path AS absolutePath,
          title,
          excerpt,
          content_text AS contentText,
          content_hash AS contentHash,
          domain_pack AS domainPack,
          classification,
          tags_json AS tags,
          indexed_at AS indexedAt
         FROM source_documents
         WHERE id = ?`
      )
      .get(id) as SourceDocumentRow | undefined;
    return row ? toSourceDocument(row) : null;
  }
}

function parseSourceIds(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string") : [];
  } catch {
    return [];
  }
}

function parseStringArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string") : [];
  } catch {
    return [];
  }
}

function parseStringMap(raw: string | null): Record<string, string> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === "string")
    );
  } catch {
    return null;
  }
}
