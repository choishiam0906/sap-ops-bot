import { randomUUID } from "node:crypto";

import {
  CboAnalysisResult,
  CboAnalysisRunDetail,
  CboAnalysisRunSummary,
  CboBatchFileErrorCode,
  ChatMessage,
  ChatSession,
  ProviderAccount,
  ProviderType,
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
        `INSERT INTO provider_accounts(provider, status, account_hint, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(provider) DO UPDATE SET
           status=excluded.status,
           account_hint=excluded.account_hint,
           updated_at=excluded.updated_at`
      )
      .run(
        account.provider,
        account.status,
        account.accountHint,
        account.updatedAt
      );
    return account;
  }

  get(provider: ProviderType): ProviderAccount | null {
    const row = this.db
      .prepare(
        `SELECT provider, status, account_hint AS accountHint, updated_at AS updatedAt
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
