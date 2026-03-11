import type { AgentDefinition } from "../types/agent.js";
import type { DomainPack } from "../contracts.js";
import { loadCustomAgents } from "./agentLoaderService.js";

const PRESET_AGENTS: AgentDefinition[] = [
  {
    id: "transport-review-workflow",
    title: "Transport 리뷰 Workflow",
    description:
      "Transport를 분석하고, 리스크를 평가한 후, Runbook을 자동 생성해요.",
    domainPacks: ["ops", "cbo-maintenance"],
    category: "analysis",
    estimatedDuration: 300,
    steps: [
      {
        id: "analyze",
        skillId: "transport-risk-review",
        label: "Transport 리스크 분석",
        sortOrder: 1,
        config: {},
      },
      {
        id: "runbook",
        skillId: "ops-runbook-writer",
        label: "Runbook 작성",
        sortOrder: 2,
        dependsOn: ["analyze"],
        config: {},
      },
      {
        id: "tag",
        skillId: "evidence-tagger",
        label: "근거 태깅",
        sortOrder: 3,
        dependsOn: ["runbook"],
        config: {},
      },
    ],
  },
  {
    id: "incident-resolution-workflow",
    title: "Incident 해결 Workflow",
    description:
      "장애를 트리아지하고, 현업에 설명하고, 대응 절차를 문서화해요.",
    domainPacks: ["ops", "functional"],
    category: "automation",
    estimatedDuration: 240,
    steps: [
      {
        id: "triage",
        skillId: "incident-triage",
        label: "장애 원인 분석",
        sortOrder: 1,
        config: {},
      },
      {
        id: "explain",
        skillId: "sap-explainer",
        label: "현업용 설명 생성",
        sortOrder: 2,
        dependsOn: ["triage"],
        config: {},
      },
      {
        id: "document",
        skillId: "ops-runbook-writer",
        label: "대응 절차 문서화",
        sortOrder: 3,
        dependsOn: ["explain"],
        config: {},
      },
    ],
  },
];

function getAllAgents(): AgentDefinition[] {
  const custom = loadCustomAgents();
  // 커스텀 에이전트 ID가 프리셋과 중복되면 커스텀을 무시
  const presetIds = new Set(PRESET_AGENTS.map((a) => a.id));
  const deduped = custom.filter((a) => !presetIds.has(a.id));
  return [...PRESET_AGENTS, ...deduped];
}

export function listAgentDefinitions(domainPack?: DomainPack): AgentDefinition[] {
  const all = getAllAgents();
  if (!domainPack) return all.map(cloneAgent);
  return all.filter((agent) => agent.domainPacks.includes(domainPack)).map(cloneAgent);
}

export function getAgentDefinition(id: string): AgentDefinition | null {
  const all = getAllAgents();
  const agent = all.find((a) => a.id === id);
  return agent ? cloneAgent(agent) : null;
}

export function listCustomAgentDefinitions(): AgentDefinition[] {
  return loadCustomAgents().map(cloneAgent);
}

function cloneAgent(agent: AgentDefinition): AgentDefinition {
  return {
    ...agent,
    domainPacks: [...agent.domainPacks],
    steps: agent.steps.map((step) => ({
      ...step,
      config: { ...step.config },
      dependsOn: step.dependsOn ? [...step.dependsOn] : undefined,
    })),
  };
}
