import { randomUUID } from "node:crypto";

import type {
  ChatSession,
  ChatSessionMeta,
  CockpitStats,
  ProviderType,
  SapLabel,
  SessionFilter,
  TodoStateKind,
} from "../../contracts.js";
import type { LocalDatabase } from "../sqlite.js";
import { nowIso } from "./utils.js";

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
      .prepare(`UPDATE sessions SET updated_at = ? WHERE id = ?`)
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
