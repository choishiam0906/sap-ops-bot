import { createHash } from "node:crypto";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

import type {
  ConfiguredSource,
  DomainPack,
  SourceDocument,
  SourceIndexSummary,
  VaultClassification,
} from "../contracts.js";
import {
  ConfiguredSourceRepository,
  SourceDocumentRepository,
} from "../storage/repositories/index.js";
import { logger } from "../logger.js";

export interface McpServerConfig {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

interface McpConnection {
  config: McpServerConfig;
  client: Client;
  transport: StdioClientTransport;
}

export class McpConnector {
  private readonly connections = new Map<string, McpConnection>();

  constructor(
    private readonly sourceRepo: ConfiguredSourceRepository,
    private readonly documentRepo: SourceDocumentRepository
  ) {}

  async connect(config: McpServerConfig): Promise<void> {
    if (this.connections.has(config.name)) {
      return;
    }

    const transport = new StdioClientTransport({
      command: config.command,
      args: config.args,
      env: config.env,
    });

    const client = new Client({
      name: "sap-assistant-desktop",
      version: "3.0.0",
    });

    await client.connect(transport);
    this.connections.set(config.name, { config, client, transport });
    logger.info({ server: config.name }, "MCP 서버 연결 완료");
  }

  async disconnect(serverName: string): Promise<void> {
    const connection = this.connections.get(serverName);
    if (!connection) return;

    await connection.client.close();
    this.connections.delete(serverName);
    logger.info({ server: serverName }, "MCP 서버 연결 해제");
  }

  async disconnectAll(): Promise<void> {
    for (const name of [...this.connections.keys()]) {
      await this.disconnect(name);
    }
  }

  listConnectedServers(): string[] {
    return [...this.connections.keys()];
  }

  async listResources(serverName: string): Promise<Array<{ uri: string; name: string; description?: string; mimeType?: string }>> {
    const connection = this.connections.get(serverName);
    if (!connection) {
      throw new Error(`MCP 서버 '${serverName}'에 연결되어 있지 않습니다.`);
    }

    const result = await connection.client.listResources();
    return (result.resources ?? []).map((r) => ({
      uri: r.uri,
      name: r.name ?? r.uri,
      description: r.description,
      mimeType: r.mimeType,
    }));
  }

  async addSource(
    serverName: string,
    input: {
      title?: string;
      domainPack: DomainPack;
      classificationDefault: VaultClassification;
    }
  ): Promise<{ source: ConfiguredSource; summary: SourceIndexSummary }> {
    const connection = this.connections.get(serverName);
    if (!connection) {
      throw new Error(`MCP 서버 '${serverName}'에 연결되어 있지 않습니다.`);
    }

    const source = this.sourceRepo.createMcpSource({
      title: input.title?.trim() || serverName,
      domainPack: input.domainPack,
      classificationDefault: input.classificationDefault,
      connectionMeta: {
        serverName,
        command: connection.config.command,
        args: (connection.config.args ?? []).join(" "),
      },
    });

    const summary = await this.syncSource(source.id);
    return {
      source: this.sourceRepo.getById(source.id) ?? source,
      summary,
    };
  }

  async syncSource(sourceId: string): Promise<SourceIndexSummary> {
    const source = this.sourceRepo.getById(sourceId);
    if (!source || source.kind !== "mcp") {
      throw new Error("MCP source를 찾을 수 없습니다.");
    }

    const serverName = source.connectionMeta?.serverName;
    if (!serverName) {
      throw new Error("MCP 서버 이름이 설정되지 않았습니다.");
    }

    const connection = this.connections.get(serverName);
    if (!connection) {
      this.sourceRepo.updateSyncStatus(source.id, "error", source.lastIndexedAt);
      throw new Error(`MCP 서버 '${serverName}'에 연결되어 있지 않습니다.`);
    }

    this.sourceRepo.updateSyncStatus(source.id, "indexing", source.lastIndexedAt);

    try {
      const resources = await connection.client.listResources();
      const indexedAt = new Date().toISOString();
      const documents: Array<Omit<SourceDocument, "id">> = [];
      let skipped = 0;
      let failed = 0;

      for (const resource of resources.resources ?? []) {
        try {
          const content = await connection.client.readResource({ uri: resource.uri });
          const textParts = (content.contents ?? [])
            .filter((c): c is typeof c & { text: string } => "text" in c && c.text != null)
            .map((c) => c.text);
          const contentText = textParts.join("\n\n").trim();

          if (!contentText) {
            skipped += 1;
            continue;
          }

          documents.push({
            sourceId: source.id,
            relativePath: resource.uri,
            absolutePath: resource.uri,
            title: resource.name ?? resource.uri,
            excerpt: contentText.replace(/\s+/g, " ").slice(0, 280).trim(),
            contentText,
            contentHash: createHash("sha256").update(contentText).digest("hex"),
            domainPack: source.domainPack as DomainPack | null,
            classification: source.classificationDefault as VaultClassification | null,
            tags: ["mcp", serverName, source.domainPack ?? "unknown"],
            indexedAt,
          });
        } catch (error) {
          logger.warn({ uri: resource.uri, error }, "MCP 리소스 읽기 실패");
          failed += 1;
        }
      }

      this.documentRepo.replaceAllForSource(source.id, documents);
      this.sourceRepo.updateSyncStatus(source.id, "ready", indexedAt);

      return {
        indexed: documents.length,
        updated: 0,
        unchanged: 0,
        removed: 0,
        skipped,
        failed,
      };
    } catch (error) {
      this.sourceRepo.updateSyncStatus(source.id, "error", source.lastIndexedAt);
      throw error;
    }
  }
}
