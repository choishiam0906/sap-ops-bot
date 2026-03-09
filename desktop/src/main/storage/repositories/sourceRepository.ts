import { randomUUID } from "node:crypto";

import type {
  ConfiguredSource,
  ConfiguredSourceKind,
  DomainPack,
  SourceDocument,
  SourceDocumentSearchInput,
  SourceSyncStatus,
  VaultClassification,
} from "../../contracts.js";
import type { LocalDatabase } from "../sqlite.js";
import { nowIso, parseStringArray, parseStringMap } from "./utils.js";

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

  createMcpSource(input: {
    title: string;
    domainPack: DomainPack;
    classificationDefault: VaultClassification;
    connectionMeta: Record<string, string>;
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
        VALUES (?, 'mcp', ?, NULL, ?, ?, '[]', 1, 'idle', NULL, ?, ?, ?)`
      )
      .run(
        id,
        input.title,
        input.domainPack,
        input.classificationDefault,
        JSON.stringify(input.connectionMeta),
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

  listHashesBySource(sourceId: string): Array<{ id: string; relativePath: string; contentHash: string }> {
    return this.db
      .prepare(
        `SELECT id, relative_path AS relativePath, content_hash AS contentHash
         FROM source_documents
         WHERE source_id = ?`
      )
      .all(sourceId) as Array<{ id: string; relativePath: string; contentHash: string }>;
  }

  deleteByIds(ids: string[]): void {
    if (ids.length === 0) return;
    const placeholders = ids.map(() => "?").join(", ");
    this.db
      .prepare(`DELETE FROM source_documents WHERE id IN (${placeholders})`)
      .run(...ids);
  }

  upsertDocuments(sourceId: string, documents: Array<Omit<SourceDocument, "id">>, existingIds: Map<string, string>): void {
    const write = this.db.transaction(() => {
      const insert = this.db.prepare(
        `INSERT INTO source_documents(
          id, source_id, relative_path, absolute_path, title, excerpt,
          content_text, content_hash, domain_pack, classification, tags_json, indexed_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );

      const update = this.db.prepare(
        `UPDATE source_documents
         SET absolute_path = ?, title = ?, excerpt = ?,
             content_text = ?, content_hash = ?, domain_pack = ?,
             classification = ?, tags_json = ?, indexed_at = ?
         WHERE id = ?`
      );

      for (const document of documents) {
        const existingId = existingIds.get(document.relativePath);
        if (existingId) {
          update.run(
            document.absolutePath,
            document.title,
            document.excerpt,
            document.contentText,
            document.contentHash,
            document.domainPack,
            document.classification,
            JSON.stringify(document.tags),
            document.indexedAt,
            existingId
          );
        } else {
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
      }
    });
    write();
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
