import type {
  ConfiguredSource,
  ConfiguredSourceKind,
  SourceDocumentSearchInput,
  SourceIndexSummary,
} from "../contracts.js";
import {
  ConfiguredSourceRepository,
  SourceDocumentRepository,
} from "../storage/repositories/index.js";
import { LocalFolderSourceLibrary } from "./localFolderLibrary.js";
import { McpConnector, type McpServerConfig } from "./mcpConnector.js";

export class SourceManager {
  constructor(
    private readonly sourceRepo: ConfiguredSourceRepository,
    private readonly documentRepo: SourceDocumentRepository,
    private readonly localFolderLibrary: LocalFolderSourceLibrary,
    private readonly mcpConnector: McpConnector
  ) {}

  listSources(kind?: ConfiguredSourceKind): ConfiguredSource[] {
    return this.sourceRepo.list(kind);
  }

  async reindexSource(sourceId: string): Promise<SourceIndexSummary> {
    const source = this.sourceRepo.getById(sourceId);
    if (!source) {
      throw new Error("Source를 찾을 수 없습니다.");
    }

    switch (source.kind) {
      case "local-folder":
        return this.localFolderLibrary.reindexSource(sourceId);
      case "mcp":
        return this.mcpConnector.syncSource(sourceId);
      default:
        throw new Error(`지원하지 않는 source 종류: ${source.kind}`);
    }
  }

  searchDocuments(input: SourceDocumentSearchInput) {
    return this.documentRepo.search(input);
  }

  // MCP 전용 메서드
  async connectMcpServer(config: McpServerConfig) {
    return this.mcpConnector.connect(config);
  }

  async disconnectMcpServer(serverName: string) {
    return this.mcpConnector.disconnect(serverName);
  }

  listConnectedMcpServers() {
    return this.mcpConnector.listConnectedServers();
  }

  async listMcpResources(serverName: string) {
    return this.mcpConnector.listResources(serverName);
  }
}
