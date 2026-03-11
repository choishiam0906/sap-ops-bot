// ─── 파일 시스템에서 *.agent.md 로드 ───

import { app } from "electron";
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import type { AgentDefinition } from "../types/agent.js";
import { parseAgentFile } from "./agentFileParser.js";
import { logger } from "../logger.js";

function getAgentDir(): string {
  const dir = join(app.getPath("userData"), "agents");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function loadCustomAgents(): AgentDefinition[] {
  const dir = getAgentDir();
  const agents: AgentDefinition[] = [];

  let files: string[];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith(".agent.md"));
  } catch (err) {
    logger.warn({ err }, "커스텀 에이전트 디렉토리 읽기 실패");
    return [];
  }

  for (const file of files) {
    const filePath = join(dir, file);
    try {
      const content = readFileSync(filePath, "utf-8");
      const result = parseAgentFile(content, filePath);
      if (result.success && result.agent) {
        agents.push(result.agent);
      } else {
        logger.warn({ file, errors: result.errors }, "커스텀 에이전트 파싱 실패");
      }
    } catch (err) {
      logger.warn({ err, file }, "커스텀 에이전트 파일 읽기 실패");
    }
  }

  return agents;
}

export function saveCustomAgent(content: string, fileName: string): void {
  const dir = getAgentDir();
  const safeName = fileName.endsWith(".agent.md") ? fileName : `${fileName}.agent.md`;
  writeFileSync(join(dir, safeName), content, "utf-8");
}

export function deleteCustomAgent(fileName: string): void {
  const dir = getAgentDir();
  const filePath = join(dir, fileName);
  if (existsSync(filePath)) {
    unlinkSync(filePath);
  }
}

export function getAgentFolderPath(): string {
  return getAgentDir();
}
