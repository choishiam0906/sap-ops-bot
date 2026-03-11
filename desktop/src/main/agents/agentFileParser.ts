// ─── agent.md 파일 파싱: YAML frontmatter → AgentDefinition 변환 ───

import matter from "gray-matter";
import type { AgentDefinition, AgentCategory, AgentStep } from "../types/agent.js";
import type { DomainPack } from "../contracts.js";

const VALID_CATEGORIES: AgentCategory[] = ["analysis", "documentation", "validation", "automation"];
const VALID_DOMAIN_PACKS: DomainPack[] = ["ops", "functional", "cbo-maintenance", "pi-integration", "btp-rap-cap"];

export interface AgentParseResult {
  success: boolean;
  agent?: AgentDefinition;
  errors: string[];
}

export function parseAgentFile(content: string, filePath: string): AgentParseResult {
  const errors: string[] = [];

  let parsed: matter.GrayMatterFile<string>;
  try {
    parsed = matter(content);
  } catch (err) {
    return { success: false, errors: [`YAML 파싱 실패 (${filePath}): ${String(err)}`] };
  }

  const data = parsed.data as Record<string, unknown>;

  // 필수 필드 검증
  if (!data.id || typeof data.id !== "string") {
    errors.push("id 필드가 없거나 문자열이 아닙니다.");
  }
  if (!data.title || typeof data.title !== "string") {
    errors.push("title 필드가 없거나 문자열이 아닙니다.");
  }
  if (!data.description || typeof data.description !== "string") {
    errors.push("description 필드가 없거나 문자열이 아닙니다.");
  }

  // domainPacks 검증
  if (!Array.isArray(data.domainPacks) || data.domainPacks.length === 0) {
    errors.push("domainPacks 필드가 없거나 빈 배열입니다.");
  } else {
    for (const dp of data.domainPacks) {
      if (!VALID_DOMAIN_PACKS.includes(dp as DomainPack)) {
        errors.push(`유효하지 않은 domainPack: ${String(dp)}`);
      }
    }
  }

  // category 검증
  if (!data.category || !VALID_CATEGORIES.includes(data.category as AgentCategory)) {
    errors.push(`category가 유효하지 않습니다. 허용값: ${VALID_CATEGORIES.join(", ")}`);
  }

  // steps 검증
  if (!Array.isArray(data.steps) || data.steps.length === 0) {
    errors.push("steps 필드가 없거나 빈 배열입니다.");
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  const steps: AgentStep[] = (data.steps as Record<string, unknown>[]).map((step, index) => {
    if (!step.id || typeof step.id !== "string") {
      errors.push(`steps[${index}]: id 필드가 없거나 문자열이 아닙니다.`);
    }
    if (!step.skillId || typeof step.skillId !== "string") {
      errors.push(`steps[${index}]: skillId 필드가 없거나 문자열이 아닙니다.`);
    }
    if (!step.label || typeof step.label !== "string") {
      errors.push(`steps[${index}]: label 필드가 없거나 문자열이 아닙니다.`);
    }

    return {
      id: String(step.id ?? `step-${index}`),
      skillId: String(step.skillId ?? ""),
      label: String(step.label ?? ""),
      description: step.description ? String(step.description) : undefined,
      config: (step.config as Record<string, unknown>) ?? {},
      sortOrder: typeof step.sortOrder === "number" ? step.sortOrder : index + 1,
      dependsOn: Array.isArray(step.dependsOn) ? (step.dependsOn as string[]) : undefined,
    };
  });

  if (errors.length > 0) {
    return { success: false, errors };
  }

  const agent: AgentDefinition = {
    id: String(data.id),
    title: String(data.title),
    description: String(data.description),
    domainPacks: data.domainPacks as DomainPack[],
    category: data.category as AgentCategory,
    estimatedDuration: typeof data.estimatedDuration === "number" ? data.estimatedDuration : 300,
    steps,
    isCustom: true,
  };

  return { success: true, agent, errors: [] };
}
