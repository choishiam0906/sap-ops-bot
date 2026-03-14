import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { basename, extname, relative, resolve } from "node:path";

import type {
  ConfiguredSource,
  DomainPack,
  PickAndAddLocalFolderSourceInput,
  SourceDocument,
  SourceDocumentSearchInput,
  SourceIndexSummary,
  VaultClassification,
} from "../contracts.js";
import {
  ConfiguredSourceRepository,
  SourceDocumentRepository,
} from "../storage/repositories/index.js";

const DEFAULT_INCLUDE_GLOBS = ["**/*.txt", "**/*.md", "**/*.log"];
const DEFAULT_EXTENSIONS = new Set([".txt", ".md", ".log"]);
const MAX_TEXT_BYTES = 1024 * 1024;

export class LocalFolderSourceLibrary {
  constructor(
    private readonly sourceRepo: ConfiguredSourceRepository,
    private readonly documentRepo: SourceDocumentRepository
  ) {}

  listLocalFolders(): ConfiguredSource[] {
    return this.sourceRepo.list("local-folder");
  }

  async addLocalFolder(rootPath: string, input: PickAndAddLocalFolderSourceInput): Promise<{
    source: ConfiguredSource;
    summary: SourceIndexSummary;
  }> {
    const resolvedRoot = resolve(rootPath);
    const source = this.sourceRepo.createLocalFolder({
      title: input.title?.trim() || basename(resolvedRoot),
      rootPath: resolvedRoot,
      domainPack: input.domainPack,
      classificationDefault: input.classificationDefault,
      includeGlobs: input.includeGlobs?.length ? input.includeGlobs : DEFAULT_INCLUDE_GLOBS,
    });

    const summary = await this.reindexSource(source.id);
    return {
      source: this.sourceRepo.getById(source.id) ?? source,
      summary,
    };
  }

  async reindexSource(sourceId: string): Promise<SourceIndexSummary> {
    const source = this.sourceRepo.getById(sourceId);
    if (!source || source.kind !== "local-folder" || !source.rootPath) {
      throw new Error("Local Folder source를 찾을 수 없습니다.");
    }
    if (!existsSync(source.rootPath)) {
      this.sourceRepo.updateSyncStatus(source.id, "error", source.lastIndexedAt);
      throw new Error("선택한 폴더를 찾을 수 없습니다.");
    }

    this.sourceRepo.updateSyncStatus(source.id, "indexing", source.lastIndexedAt);
    try {
      const result = await this.scanSource(source);
      const indexedAt = new Date().toISOString();

      // 기존 문서의 relativePath → {id, contentHash} 매핑
      const existingDocs = this.documentRepo.listHashesBySource(source.id);
      const existingMap = new Map(existingDocs.map((d) => [d.relativePath, d]));

      // 변경 감지: 새 파일, 변경된 파일, 삭제된 파일 분류
      const toUpsert: Array<Omit<SourceDocument, "id">> = [];
      const upsertExistingIds = new Map<string, string>();
      let unchanged = 0;
      let updated = 0;
      let indexed = 0;
      const scannedPaths = new Set<string>();

      for (const doc of result.documents) {
        const withTimestamp = { ...doc, indexedAt };
        scannedPaths.add(doc.relativePath);

        const existing = existingMap.get(doc.relativePath);
        if (existing) {
          if (existing.contentHash === doc.contentHash) {
            unchanged += 1;
          } else {
            toUpsert.push(withTimestamp);
            upsertExistingIds.set(doc.relativePath, existing.id);
            updated += 1;
          }
        } else {
          toUpsert.push(withTimestamp);
          indexed += 1;
        }
      }

      // 삭제된 파일 제거
      const toRemoveIds = existingDocs
        .filter((d) => !scannedPaths.has(d.relativePath))
        .map((d) => d.id);

      if (toUpsert.length > 0) {
        this.documentRepo.upsertDocuments(source.id, toUpsert, upsertExistingIds);
      }
      if (toRemoveIds.length > 0) {
        this.documentRepo.deleteByIds(toRemoveIds);
      }

      this.sourceRepo.updateSyncStatus(source.id, "ready", indexedAt);
      return {
        indexed,
        updated,
        unchanged,
        removed: toRemoveIds.length,
        skipped: result.skipped,
        failed: result.failed,
      };
    } catch (error) {
      this.sourceRepo.updateSyncStatus(source.id, "error", source.lastIndexedAt);
      throw error;
    }
  }

  searchDocuments(input: SourceDocumentSearchInput) {
    return this.documentRepo.search({
      ...input,
      sourceKind: input.sourceKind ?? "local-folder",
    });
  }

  getDocument(documentId: string) {
    return this.documentRepo.getById(documentId);
  }

  private async scanSource(source: ConfiguredSource): Promise<{
    documents: Array<Omit<SourceDocument, "id" | "indexedAt">>;
    skipped: number;
    failed: number;
  }> {
    const files = await collectFiles(source.rootPath!, extensionsFromGlobs(source.includeGlobs));
    const documents: Array<Omit<SourceDocument, "id" | "indexedAt">> = [];
    let skipped = 0;
    let failed = 0;

    for (const absolutePath of files) {
      try {
        const buffer = await readFile(absolutePath);
        if (buffer.byteLength === 0 || buffer.byteLength > MAX_TEXT_BYTES || looksBinary(buffer)) {
          skipped += 1;
          continue;
        }

        const contentText = buffer.toString("utf8").split("\0").join("").trim();
        if (!contentText) {
          skipped += 1;
          continue;
        }

        documents.push({
          sourceId: source.id,
          relativePath: normalizeSlashes(relative(source.rootPath!, absolutePath)),
          absolutePath,
          title: basename(absolutePath),
          excerpt: buildExcerpt(contentText),
          contentText,
          contentHash: hashContent(buffer),
          domainPack: source.domainPack as DomainPack | null,
          classification: source.classificationDefault as VaultClassification | null,
          tags: [source.kind, source.domainPack ?? "unknown"],
        });
      } catch {
        failed += 1;
      }
    }

    return { documents, skipped, failed };
  }
}

async function collectFiles(rootPath: string, extensions: Set<string>): Promise<string[]> {
  const entries = await readdir(rootPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absolutePath = resolve(rootPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(absolutePath, extensions));
      continue;
    }
    if (entry.isFile() && extensions.has(extname(entry.name).toLowerCase())) {
      files.push(absolutePath);
    }
  }

  return files;
}

function extensionsFromGlobs(globs: string[]): Set<string> {
  const extensions = new Set<string>();
  for (const glob of globs) {
    const match = glob.match(/\.([a-z0-9]+)$/i);
    if (match) {
      extensions.add(`.${match[1].toLowerCase()}`);
    }
  }
  return extensions.size > 0 ? extensions : DEFAULT_EXTENSIONS;
}

function buildExcerpt(text: string): string {
  return text.replace(/\s+/g, " ").slice(0, 280).trim();
}

function hashContent(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

function looksBinary(buffer: Buffer): boolean {
  for (let index = 0; index < Math.min(buffer.length, 512); index += 1) {
    if (buffer[index] === 0) return true;
  }
  return false;
}

function normalizeSlashes(value: string): string {
  return value.replace(/\\/g, "/");
}
