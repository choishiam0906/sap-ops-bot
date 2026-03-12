import { randomUUID } from "node:crypto";

import type {
  RoutineKnowledgeLink,
  RoutineKnowledgeLinkInput,
  RoutineKnowledgeTargetType,
} from "../../contracts.js";
import type { LocalDatabase } from "../sqlite.js";
import { nowIso } from "./utils.js";

interface RoutineKnowledgeLinkRow {
  id: string;
  templateId: string;
  targetType: RoutineKnowledgeTargetType;
  targetId: string;
  title: string;
  excerpt: string | null;
  location: string | null;
  classification: string | null;
  sourceType: string | null;
  createdAt: string;
}

function toRoutineKnowledgeLink(row: RoutineKnowledgeLinkRow): RoutineKnowledgeLink {
  return {
    id: row.id,
    templateId: row.templateId,
    targetType: row.targetType,
    targetId: row.targetId,
    title: row.title,
    excerpt: row.excerpt ?? undefined,
    location: row.location ?? undefined,
    classification: row.classification,
    sourceType: row.sourceType,
    createdAt: row.createdAt,
  };
}

export class RoutineKnowledgeLinkRepository {
  constructor(private readonly db: LocalDatabase) {}

  listByTemplateId(templateId: string): RoutineKnowledgeLink[] {
    const rows = this.db
      .prepare(
        `SELECT
          id,
          template_id AS templateId,
          target_type AS targetType,
          target_id AS targetId,
          title,
          excerpt,
          location,
          classification,
          source_type AS sourceType,
          created_at AS createdAt
         FROM routine_knowledge_links
         WHERE template_id = ?
         ORDER BY created_at DESC`
      )
      .all(templateId) as RoutineKnowledgeLinkRow[];

    return rows.map(toRoutineKnowledgeLink);
  }

  upsert(input: RoutineKnowledgeLinkInput): RoutineKnowledgeLink {
    const existing = this.db
      .prepare(
        `SELECT
          id,
          template_id AS templateId,
          target_type AS targetType,
          target_id AS targetId,
          title,
          excerpt,
          location,
          classification,
          source_type AS sourceType,
          created_at AS createdAt
         FROM routine_knowledge_links
         WHERE template_id = ? AND target_type = ? AND target_id = ?`
      )
      .get(input.templateId, input.targetType, input.targetId) as RoutineKnowledgeLinkRow | undefined;

    if (existing) {
      this.db
        .prepare(
          `UPDATE routine_knowledge_links
           SET title = ?, excerpt = ?, location = ?, classification = ?, source_type = ?
           WHERE id = ?`
        )
        .run(
          input.title,
          input.excerpt ?? null,
          input.location ?? null,
          input.classification ?? null,
          input.sourceType ?? null,
          existing.id
        );

      return {
        ...toRoutineKnowledgeLink(existing),
        title: input.title,
        excerpt: input.excerpt,
        location: input.location,
        classification: input.classification ?? null,
        sourceType: input.sourceType ?? null,
      };
    }

    const link: RoutineKnowledgeLink = {
      id: randomUUID(),
      templateId: input.templateId,
      targetType: input.targetType,
      targetId: input.targetId,
      title: input.title,
      excerpt: input.excerpt,
      location: input.location,
      classification: input.classification ?? null,
      sourceType: input.sourceType ?? null,
      createdAt: nowIso(),
    };

    this.db
      .prepare(
        `INSERT INTO routine_knowledge_links(
          id, template_id, target_type, target_id, title, excerpt,
          location, classification, source_type, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        link.id,
        link.templateId,
        link.targetType,
        link.targetId,
        link.title,
        link.excerpt ?? null,
        link.location ?? null,
        link.classification ?? null,
        link.sourceType ?? null,
        link.createdAt
      );

    return link;
  }

  delete(id: string): boolean {
    const result = this.db
      .prepare(`DELETE FROM routine_knowledge_links WHERE id = ?`)
      .run(id);
    return result.changes > 0;
  }
}
