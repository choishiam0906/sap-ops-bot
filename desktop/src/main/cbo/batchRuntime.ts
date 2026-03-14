import { createHash } from "node:crypto";
import { readdir, stat } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";

import {
  CboAnalysisResult,
  CboAnalysisRunDetail,
  CboAnalysisRunSummary,
  CboAnalyzeFolderInput,
  CboAnalyzeFolderOutput,
  CboBatchFileErrorCode,
  CboBatchProgressEvent,
  CboRunDiffInput,
  CboRunDiffItem,
  CboRunDiffOutput,
  CboSyncKnowledgeInput,
  CboSyncKnowledgeOutput,
} from "../contracts.js";
import { CboAnalysisRepository, VaultRepository } from "../storage/repositories/index.js";
import { CboAnalyzer } from "./analyzer.js";
import { parseCboFile } from "./parser.js";

const SUPPORTED_EXTENSIONS = new Set([".txt", ".md"]);
const EXCLUDED_FOLDERS = new Set([".git", "node_modules", "dist"]);

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Unknown analysis error";
}

function toErrorCode(message: string): CboBatchFileErrorCode {
  if (message.includes("Unsupported file extension")) {
    return "UNSUPPORTED_EXT";
  }
  if (message.includes("too large")) {
    return "TOO_LARGE";
  }
  if (message.includes("empty")) {
    return "EMPTY_FILE";
  }
  if (message.includes("Binary-like")) {
    return "BINARY_FILE";
  }
  return "ANALYZE_ERROR";
}

export interface AnalyzeFolderOptions {
  signal?: AbortSignal;
  onProgress?: (event: CboBatchProgressEvent) => void;
}

export class CboBatchRuntime {
  constructor(
    private readonly analyzer: CboAnalyzer,
    private readonly analysisRepo: CboAnalysisRepository,
    private readonly defaultKnowledgeApiBaseUrl: string,
    private readonly vaultRepo?: VaultRepository
  ) {}

  async analyzeFolder(
    input: CboAnalyzeFolderInput,
    options?: AnalyzeFolderOptions
  ): Promise<CboAnalyzeFolderOutput> {
    const rootPath = resolve(input.rootPath);
    const recursive = input.recursive ?? true;
    const skipUnchanged = input.skipUnchanged ?? true;
    const { signal, onProgress } = options ?? {};

    const files = await this.collectCandidateFiles(rootPath, recursive);
    const run = this.analysisRepo.createRun("folder", {
      rootPath,
      provider: input.provider,
      model: input.model,
      totalFiles: files.length,
    });

    let successFiles = 0;
    let failedFiles = 0;
    let skippedFiles = 0;
    const errors: CboAnalyzeFolderOutput["errors"] = [];

    for (let i = 0; i < files.length; i++) {
      if (signal?.aborted) break;

      const filePath = files[i];
      onProgress?.({
        runId: run.id,
        current: i + 1,
        total: files.length,
        filePath,
        status: "analyzing",
      });

      try {
        const parsed = await parseCboFile(filePath);
        const fileHash = createHash("sha256").update(parsed.content).digest("hex");
        if (skipUnchanged && this.analysisRepo.hasSuccessfulFile(filePath, fileHash)) {
          this.analysisRepo.recordSkippedFile(
            run.id,
            filePath,
            parsed.fileName,
            fileHash
          );
          skippedFiles += 1;
          onProgress?.({
            runId: run.id,
            current: i + 1,
            total: files.length,
            filePath,
            status: "skipped",
          });
          continue;
        }

        const result = await this.analyzer.analyzeContent(
          parsed.fileName,
          parsed.content,
          input.provider,
          input.model,
        );
        const fileId = this.analysisRepo.recordSuccessFile(
          run.id,
          filePath,
          parsed.fileName,
          fileHash,
          result
        );

        // CBO 분석 결과를 Knowledge Vault에 자동 저장
        this.vaultRepo?.store({
          classification: "confidential",
          sourceType: "cbo_analysis",
          domainPack: input.domainPack ?? null,
          title: `[CBO] ${parsed.fileName}`,
          excerpt: result.summary.slice(0, 500),
          sourceId: fileId,
          filePath,
        });

        successFiles += 1;
        onProgress?.({
          runId: run.id,
          current: i + 1,
          total: files.length,
          filePath,
          status: "success",
        });
      } catch (error) {
        const message = toErrorMessage(error);
        const code = toErrorCode(message);
        this.analysisRepo.recordFailedFile(
          run.id,
          filePath,
          basename(filePath),
          code,
          message
        );
        errors.push({
          filePath,
          code,
          message,
        });
        failedFiles += 1;
        onProgress?.({
          runId: run.id,
          current: i + 1,
          total: files.length,
          filePath,
          status: "failed",
        });
      }
    }

    const finalized =
      this.analysisRepo.finalizeRun(run.id, {
        totalFiles: files.length,
        successFiles,
        failedFiles,
        skippedFiles,
      }) ??
      ({
        ...run,
        totalFiles: files.length,
        successFiles,
        failedFiles,
        skippedFiles,
        finishedAt: new Date().toISOString(),
      } as CboAnalysisRunSummary);

    return {
      run: finalized,
      errors,
    };
  }

  listRuns(limit = 20): CboAnalysisRunSummary[] {
    return this.analysisRepo.listRuns(limit);
  }

  getRunDetail(runId: string, limitFiles = 500): CboAnalysisRunDetail | null {
    return this.analysisRepo.getRunDetail(runId, limitFiles);
  }

  async syncRunToKnowledge(input: CboSyncKnowledgeInput): Promise<CboSyncKnowledgeOutput> {
    const detail = this.analysisRepo.getRunDetail(input.runId, 5000);
    if (!detail) {
      throw new Error(`Analysis run not found: ${input.runId}`);
    }

    const apiBaseUrl = this.normalizeApiBase(input.apiBaseUrl);
    const endpoint = `${apiBaseUrl}/knowledge`;
    const candidates = detail.files.filter(
      (file) => file.status === "success" && file.result
    );

    const payloadItems = candidates.map((file) =>
      this.toKnowledgePayload(file.fileName, file.result!)
    );

    try {
      const bulkResponse = await fetch(`${endpoint}/bulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: payloadItems,
        }),
      });

      if (!bulkResponse.ok) {
        const responseText = await bulkResponse.text();
        throw new Error(`HTTP ${bulkResponse.status}: ${responseText.slice(0, 180)}`);
      }

      const bulkPayload = (await bulkResponse.json()) as { created?: number };
      const totalCandidates = candidates.length;
      const synced = Math.min(
        totalCandidates,
        Math.max(0, bulkPayload.created ?? totalCandidates)
      );
      const failed = totalCandidates - synced;
      const failures =
        failed > 0
          ? [
              {
                filePath: "(bulk)",
                message: `Bulk sync created=${synced}, total=${totalCandidates}`,
              },
            ]
          : [];

      return {
        runId: input.runId,
        mode: "bulk",
        endpoint,
        totalCandidates,
        synced,
        failed,
        failures,
      };
    } catch {
      let synced = 0;
      let failed = 0;
      const failures: CboSyncKnowledgeOutput["failures"] = [];

      for (let index = 0; index < candidates.length; index += 1) {
        const file = candidates[index];
        const payload = payloadItems[index];
        try {
          const response = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            const responseText = await response.text();
            throw new Error(`HTTP ${response.status}: ${responseText.slice(0, 180)}`);
          }

          synced += 1;
        } catch (error) {
          failed += 1;
          failures.push({
            filePath: file.filePath,
            message: toErrorMessage(error),
          });
        }
      }

      return {
        runId: input.runId,
        mode: "single-fallback",
        endpoint,
        totalCandidates: candidates.length,
        synced,
        failed,
        failures,
      };
    }
  }

  diffRuns(input: CboRunDiffInput): CboRunDiffOutput {
    const fromDetail = this.analysisRepo.getRunDetail(input.fromRunId, 5000);
    if (!fromDetail) {
      throw new Error(`Base run not found: ${input.fromRunId}`);
    }
    const toDetail = this.analysisRepo.getRunDetail(input.toRunId, 5000);
    if (!toDetail) {
      throw new Error(`Target run not found: ${input.toRunId}`);
    }

    const fromMap = this.buildRiskMap(fromDetail);
    const toMap = this.buildRiskMap(toDetail);

    const added: CboRunDiffItem[] = [];
    const resolved: CboRunDiffItem[] = [];
    const persisted: CboRunDiffItem[] = [];

    for (const [fingerprint, risk] of toMap.entries()) {
      if (!fromMap.has(fingerprint)) {
        added.push({ type: "added", ...risk });
      } else {
        persisted.push({ type: "persisted", ...risk });
      }
    }

    for (const [fingerprint, risk] of fromMap.entries()) {
      if (!toMap.has(fingerprint)) {
        resolved.push({ type: "resolved", ...risk });
      }
    }

    const changes = [...added, ...resolved, ...persisted];
    return {
      fromRunId: input.fromRunId,
      toRunId: input.toRunId,
      added: added.length,
      resolved: resolved.length,
      persisted: persisted.length,
      changes,
    };
  }

  private async collectCandidateFiles(
    rootPath: string,
    recursive: boolean
  ): Promise<string[]> {
    const info = await stat(rootPath);
    if (info.isFile()) {
      return SUPPORTED_EXTENSIONS.has(extname(rootPath).toLowerCase()) ? [rootPath] : [];
    }
    if (!info.isDirectory()) {
      throw new Error("Provided rootPath is not a directory.");
    }

    const output: string[] = [];
    await this.walk(rootPath, recursive, output);
    return output.sort((a, b) => a.localeCompare(b));
  }

  private async walk(
    currentDir: string,
    recursive: boolean,
    output: string[]
  ): Promise<void> {
    const entries = await readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const target = join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (!recursive || EXCLUDED_FOLDERS.has(entry.name)) {
          continue;
        }
        await this.walk(target, recursive, output);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      if (SUPPORTED_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
        output.push(target);
      }
    }
  }

  private normalizeApiBase(apiBaseUrl?: string): string {
    const raw = (apiBaseUrl ?? this.defaultKnowledgeApiBaseUrl).trim();
    const withoutTrailingSlash = raw.replace(/\/+$/, "");
    if (!withoutTrailingSlash) {
      throw new Error("Knowledge API base URL is empty.");
    }
    return withoutTrailingSlash;
  }

  private toKnowledgePayload(
    fileName: string,
    result: NonNullable<CboAnalysisRunDetail["files"][number]["result"]>
  ): {
    title: string;
    category: string;
    tcode: null;
    program_name: string | null;
    source_type: string;
    content: string;
    steps: string[];
    warnings: string[];
    tags: string[];
    sap_note: null;
    error_code: null;
    solutions: string[];
  } {
    const steps = result.recommendations.map((recommendation) => recommendation.action);
    const warnings = result.risks
      .filter((risk) => risk.severity === "high" || risk.severity === "medium")
      .map((risk) => `${risk.title}: ${risk.detail}`);
    const solutions = result.recommendations.map(
      (recommendation) => `${recommendation.action} - ${recommendation.rationale}`
    );
    const uniqueRiskTags = Array.from(
      new Set(result.risks.map((risk) => risk.title.toLowerCase().replace(/\s+/g, "_")))
    ).slice(0, 10);
    const tags = Array.from(
      new Set([
        "cbo",
        "source_code",
        result.metadata.languageHint,
        ...uniqueRiskTags,
      ])
    );

    return {
      title: `[CBO] ${fileName}`,
      category: "소스분석",
      tcode: null,
      program_name: this.deriveProgramName(fileName),
      source_type: "source_code",
      content: result.summary,
      steps,
      warnings,
      tags,
      sap_note: null,
      error_code: null,
      solutions,
    };
  }

  private deriveProgramName(fileName: string): string | null {
    const name = fileName.replace(/\.[^.]+$/, "").trim();
    if (!name) {
      return null;
    }
    return name.length <= 40 ? name : name.slice(0, 40);
  }

  private buildRiskMap(
    detail: CboAnalysisRunDetail
  ): Map<string, Omit<CboRunDiffItem, "type">> {
    const map = new Map<string, Omit<CboRunDiffItem, "type">>();
    for (const file of detail.files) {
      if (file.status !== "success" || !file.result) {
        continue;
      }
      for (const risk of file.result.risks) {
        const fingerprint = this.riskFingerprint(file.filePath, risk);
        map.set(fingerprint, {
          filePath: file.filePath,
          severity: risk.severity,
          title: risk.title,
          detail: risk.detail,
        });
      }
    }
    return map;
  }

  private riskFingerprint(
    filePath: string,
    risk: CboAnalysisResult["risks"][number]
  ): string {
    return [filePath, risk.severity, risk.title, risk.detail].join("::");
  }
}
