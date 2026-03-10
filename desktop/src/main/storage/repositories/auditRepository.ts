import type {
  AuditLogEntry,
  AuditSearchFilters,
} from "../../contracts.js";
import type { LocalDatabase } from "../sqlite.js";
import { parseSourceIds } from "./utils.js";

interface AuditRow {
  id: string;
  sessionId: string | null;
  runId: string | null;
  timestamp: string;
  securityMode: string;
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
        "reference",
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
