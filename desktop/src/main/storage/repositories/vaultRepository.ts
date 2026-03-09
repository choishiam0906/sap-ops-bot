import { randomUUID } from "node:crypto";

import type {
  DomainPack,
  VaultClassification,
  VaultEntry,
} from "../../contracts.js";
import type { LocalDatabase } from "../sqlite.js";
import { nowIso } from "./utils.js";

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
