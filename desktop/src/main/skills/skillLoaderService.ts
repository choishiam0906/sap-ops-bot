// ─── 파일 시스템에서 *.skill.md 로드 ───

import { app } from "electron";
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import type { SapSkillDefinition } from "../types/source.js";
import { parseSkillFile } from "./skillFileParser.js";
import { logger } from "../logger.js";

function getSkillDir(): string {
  const dir = join(app.getPath("userData"), "skills");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function loadCustomSkills(): SapSkillDefinition[] {
  const dir = getSkillDir();
  const skills: SapSkillDefinition[] = [];

  let files: string[];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith(".skill.md"));
  } catch (err) {
    logger.warn({ err }, "커스텀 스킬 디렉토리 읽기 실패");
    return [];
  }

  for (const file of files) {
    const filePath = join(dir, file);
    try {
      const content = readFileSync(filePath, "utf-8");
      const result = parseSkillFile(content, filePath);
      if (result.success && result.skill) {
        skills.push(result.skill);
      } else {
        logger.warn({ file, errors: result.errors }, "커스텀 스킬 파싱 실패");
      }
    } catch (err) {
      logger.warn({ err, file }, "커스텀 스킬 파일 읽기 실패");
    }
  }

  return skills;
}

export function saveCustomSkill(content: string, fileName: string): void {
  const dir = getSkillDir();
  const safeName = fileName.endsWith(".skill.md") ? fileName : `${fileName}.skill.md`;
  writeFileSync(join(dir, safeName), content, "utf-8");
}

export function deleteCustomSkill(fileName: string): void {
  const dir = getSkillDir();
  const filePath = join(dir, fileName);
  if (existsSync(filePath)) {
    unlinkSync(filePath);
  }
}

export function getSkillFolderPath(): string {
  return getSkillDir();
}
