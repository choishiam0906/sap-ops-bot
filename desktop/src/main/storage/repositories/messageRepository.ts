import { randomUUID } from "node:crypto";

import type { ChatMessage, SourceReference } from "../../contracts.js";
import type { LocalDatabase } from "../sqlite.js";
import { nowIso } from "./utils.js";

interface MessageRow {
  id: string;
  sessionId: string;
  role: ChatMessage["role"];
  content: string;
  inputTokens: number;
  outputTokens: number;
  sourceReferencesJson: string | null;
  createdAt: string;
}

function parseSourceReferences(raw: string | null): SourceReference[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
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
                source_references_json AS sourceReferencesJson,
                created_at AS createdAt
         FROM messages
         WHERE session_id = ?
         ORDER BY created_at ASC
         LIMIT ?`
      )
      .all(sessionId, limit) as MessageRow[];
    return rows.map((row) => ({
      id: row.id,
      sessionId: row.sessionId,
      role: row.role,
      content: row.content,
      inputTokens: row.inputTokens,
      outputTokens: row.outputTokens,
      sourceReferences: parseSourceReferences(row.sourceReferencesJson),
      createdAt: row.createdAt,
    }));
  }

  append(
    sessionId: string,
    role: ChatMessage["role"],
    content: string,
    inputTokens = 0,
    outputTokens = 0,
    sourceReferences: SourceReference[] = []
  ): ChatMessage {
    const message: ChatMessage = {
      id: randomUUID(),
      sessionId,
      role,
      content,
      inputTokens,
      outputTokens,
      sourceReferences,
      createdAt: nowIso(),
    };
    this.db
      .prepare(
        `INSERT INTO messages(id, session_id, role, content, input_tokens, output_tokens, source_references_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        message.id,
        message.sessionId,
        message.role,
        message.content,
        message.inputTokens,
        message.outputTokens,
        JSON.stringify(sourceReferences),
        message.createdAt
      );
    return message;
  }
}
