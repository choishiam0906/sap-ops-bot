import type {
  CboAnalysisRepository,
  VaultRepository,
} from "../storage/repositories.js";
import type {
  DomainPack,
  SapSkillDefinition,
  SapSourceDefinition,
  SkillExecutionContext,
  SkillExecutionMeta,
  SkillRecommendation,
  SourceReference,
} from "../contracts.js";

const SKILLS: SapSkillDefinition[] = [
  {
    id: "cbo-impact-analysis",
    title: "CBO 변경 영향 분석",
    description: "CBO 소스와 추출물을 읽고 영향 범위, 리스크, 검증 체크포인트를 정리합니다.",
    supportedDomainPacks: ["cbo-maintenance"],
    supportedDataTypes: ["chat", "cbo"],
    allowedSecurityModes: ["secure-local", "reference", "hybrid-approved"],
    defaultPromptTemplate:
      "당신은 SAP 운영팀의 CBO 유지보수 리뷰어입니다. 변경 영향, 리스크, 점검 항목을 구조적으로 정리하세요.",
    outputFormat: "structured-report",
    requiredSources: ["current-cbo-run", "vault-confidential"],
    suggestedInputs: [
      "이 변경이 어떤 객체와 운영 시나리오에 영향을 주는지 정리해줘",
      "배포 전 점검 체크리스트를 만들어줘",
      "리스크를 우선순위별로 다시 설명해줘",
    ],
    suggestedTcodes: ["SE80", "SE11", "SE38", "STMS"],
  },
  {
    id: "transport-risk-review",
    title: "Transport 리스크 리뷰",
    description: "Transport 추출물 기준으로 변경 범위와 배포 전 확인 포인트를 요약합니다.",
    supportedDomainPacks: ["ops", "cbo-maintenance", "functional"],
    supportedDataTypes: ["chat"],
    allowedSecurityModes: ["secure-local", "reference", "hybrid-approved"],
    defaultPromptTemplate:
      "SAP transport 검토자로서 변경 범위, 리스크, 승인 전 점검 항목을 운영 관점에서 정리하세요.",
    outputFormat: "structured-report",
    requiredSources: ["vault-confidential", "vault-reference"],
    suggestedInputs: [
      "이 transport의 배포 리스크를 검토해줘",
      "승인 코멘트에 넣을 요약을 작성해줘",
      "컷오버 전에 꼭 확인할 항목을 알려줘",
    ],
    suggestedTcodes: ["SE09", "SE10", "STMS"],
  },
  {
    id: "incident-triage",
    title: "운영 장애 트리아지",
    description: "dump, spool, log를 기준으로 원인 후보와 점검 순서를 정리합니다.",
    supportedDomainPacks: ["ops", "functional"],
    supportedDataTypes: ["chat"],
    allowedSecurityModes: ["reference", "hybrid-approved"],
    defaultPromptTemplate:
      "SAP 운영 장애 분석가로서 원인 후보, 확인 순서, 임시 우회책을 간결하게 제시하세요.",
    outputFormat: "checklist",
    requiredSources: ["vault-reference"],
    suggestedInputs: [
      "이 증상에서 먼저 볼 로그와 T-code를 알려줘",
      "현업 보고용 장애 요약을 작성해줘",
      "가장 가능성 높은 원인을 우선순위로 정리해줘",
    ],
    suggestedTcodes: ["ST22", "SM21", "SM37", "SM50"],
  },
  {
    id: "ops-runbook-writer",
    title: "운영 Runbook 작성",
    description: "분석 결과를 운영 절차, 인수인계 메모, 변경 승인 코멘트로 변환합니다.",
    supportedDomainPacks: ["ops", "cbo-maintenance", "functional", "pi-integration", "btp-rap-cap"],
    supportedDataTypes: ["chat"],
    allowedSecurityModes: ["secure-local", "reference", "hybrid-approved"],
    defaultPromptTemplate:
      "SAP 운영 문서 작성자로서 보고서, runbook, handoff memo를 짧고 명확하게 작성하세요.",
    outputFormat: "structured-report",
    requiredSources: ["vault-confidential", "vault-reference"],
    suggestedInputs: [
      "운영자 인수인계 메모 형식으로 정리해줘",
      "현업 공유용 요약을 작성해줘",
      "배포 승인 코멘트 템플릿으로 바꿔줘",
    ],
    suggestedTcodes: [],
  },
  {
    id: "sap-explainer",
    title: "SAP 설명 보조",
    description: "기술 분석 결과를 운영자와 현업이 이해하기 쉬운 설명으로 바꿉니다.",
    supportedDomainPacks: ["ops", "functional", "cbo-maintenance", "pi-integration", "btp-rap-cap"],
    supportedDataTypes: ["chat"],
    allowedSecurityModes: ["secure-local", "reference", "hybrid-approved"],
    defaultPromptTemplate:
      "SAP 도메인 설명가로서 기술 결과를 운영자와 현업 모두 이해할 수 있게 재구성하세요.",
    outputFormat: "explanation",
    requiredSources: ["vault-reference"],
    suggestedInputs: [
      "이 결과를 현업 언어로 다시 설명해줘",
      "운영팀 관점에서 핵심만 요약해줘",
      "기술 배경을 모르는 사람도 이해하게 설명해줘",
    ],
    suggestedTcodes: [],
  },
  {
    id: "evidence-tagger",
    title: "근거 태깅",
    description: "분석 결과를 Vault에 저장하기 전에 classification, source type, 태그 방향을 제안합니다.",
    supportedDomainPacks: ["ops", "functional", "cbo-maintenance", "pi-integration", "btp-rap-cap"],
    supportedDataTypes: ["chat"],
    allowedSecurityModes: ["secure-local", "reference", "hybrid-approved"],
    defaultPromptTemplate:
      "지식 큐레이터로서 근거 문서를 어떤 분류와 제목으로 저장해야 하는지 제안하세요.",
    outputFormat: "checklist",
    requiredSources: ["vault-confidential", "vault-reference"],
    suggestedInputs: [
      "이 결과를 Vault에 어떤 제목으로 저장하면 좋을까",
      "classification과 source type을 추천해줘",
      "재검색이 잘 되도록 키워드를 추천해줘",
    ],
    suggestedTcodes: [],
  },
];

const SOURCE_TEMPLATES = {
  "vault-confidential": {
    id: "vault-confidential",
    title: "Confidential Vault",
    description: "현재 Domain Pack의 기밀 운영 지식과 내부 메모를 근거로 사용합니다.",
    kind: "vault",
    classification: "confidential",
    sourceType: "internal_memo",
  },
  "vault-reference": {
    id: "vault-reference",
    title: "Reference Vault",
    description: "현재 Domain Pack의 참조 지식과 표준 문서를 근거로 사용합니다.",
    kind: "vault",
    classification: "reference",
    sourceType: "sap_standard",
  },
  "current-cbo-run": {
    id: "current-cbo-run",
    title: "Current CBO Run",
    description: "최근 CBO 분석 run 또는 선택된 run 상세를 근거로 사용합니다.",
    kind: "run",
    classification: null,
    sourceType: "current_run",
  },
  "local-imported-files": {
    id: "local-imported-files",
    title: "Local Imported Files",
    description: "사용자가 현재 세션에서 선택한 파일이나 추출물을 근거로 사용합니다.",
    kind: "local-file",
    classification: null,
    sourceType: "local_file",
  },
  "workspace-context": {
    id: "workspace-context",
    title: "Workspace Context",
    description: "현재 security mode와 domain pack 설정을 근거로 사용합니다.",
    kind: "workspace",
    classification: "mixed",
    sourceType: "workspace_context",
  },
} as const;

function normalizeSkill(skill: SapSkillDefinition): SapSkillDefinition {
  return {
    ...skill,
    requiredSources: [...skill.requiredSources],
    suggestedInputs: [...skill.suggestedInputs],
    suggestedTcodes: [...skill.suggestedTcodes],
  };
}

function mapVaultEntriesToSources(entries: Awaited<ReturnType<VaultRepository["list"]>>): SapSourceDefinition[] {
  return entries.map((entry) => ({
    id: `vault-entry:${entry.id}`,
    title: entry.title,
    description: entry.excerpt ?? "Vault 항목",
    kind: "vault",
    classification: entry.classification,
    domainPack: entry.domainPack,
    availability: "ready",
    sourceType: entry.sourceType,
    linkedId: entry.id,
  }));
}

export function getSkillDefinition(skillId: string): SapSkillDefinition | null {
  const skill = SKILLS.find((item) => item.id === skillId);
  return skill ? normalizeSkill(skill) : null;
}

export class SkillSourceRegistry {
  constructor(
    private readonly vaultRepo: VaultRepository,
    private readonly analysisRepo: CboAnalysisRepository
  ) {}

  listSkills(): SapSkillDefinition[] {
    return SKILLS.map(normalizeSkill);
  }

  recommendSkills(context: SkillExecutionContext): SkillRecommendation[] {
    const compatible = SKILLS.filter(
      (skill) =>
        skill.supportedDomainPacks.includes(context.domainPack) &&
        skill.supportedDataTypes.includes(context.dataType) &&
        skill.allowedSecurityModes.includes(context.securityMode)
    );

    return compatible.map((skill, index) => ({
      skill: normalizeSkill(skill),
      reason:
        index === 0 && context.domainPack === "cbo-maintenance"
          ? "현재 Domain Pack과 가장 잘 맞는 기본 작업입니다."
          : `${context.domainPack} 워크스페이스에서 바로 사용할 수 있는 작업입니다.`,
      recommendedSourceIds: skill.requiredSources,
    }));
  }

  listSources(context: SkillExecutionContext): SapSourceDefinition[] {
    const domainEntries = this.vaultRepo.listByDomainPack(context.domainPack, 20);
    const confidentialCount = domainEntries.filter((entry) => entry.classification === "confidential").length;
    const referenceCount = domainEntries.filter((entry) => entry.classification === "reference").length;

    return [
      {
        ...SOURCE_TEMPLATES["workspace-context"],
        domainPack: context.domainPack,
        availability: "ready",
      },
      {
        ...SOURCE_TEMPLATES["vault-confidential"],
        domainPack: context.domainPack,
        availability: confidentialCount > 0 ? "ready" : "empty",
      },
      {
        ...SOURCE_TEMPLATES["vault-reference"],
        domainPack: context.domainPack,
        availability: referenceCount > 0 ? "ready" : "empty",
      },
      {
        ...SOURCE_TEMPLATES["current-cbo-run"],
        domainPack: context.domainPack,
        availability: context.caseContext?.runId ? "ready" : "unavailable",
      },
      {
        ...SOURCE_TEMPLATES["local-imported-files"],
        domainPack: context.domainPack,
        availability: context.caseContext?.filePath ? "ready" : "unavailable",
      },
    ];
  }

  searchSources(query: string, context: SkillExecutionContext): SapSourceDefinition[] {
    const keyword = query.trim().toLowerCase();
    const baseSources = this.listSources(context);
    const domainEntries = this.vaultRepo
      .listByDomainPack(context.domainPack, 50)
      .filter((entry) => {
        if (!keyword) return true;
        const haystack = `${entry.title} ${entry.excerpt ?? ""}`.toLowerCase();
        return haystack.includes(keyword);
      });

    return [
      ...baseSources.filter((source) => {
        if (!keyword) return true;
        const haystack = `${source.title} ${source.description}`.toLowerCase();
        return haystack.includes(keyword);
      }),
      ...mapVaultEntriesToSources(domainEntries),
    ];
  }

  resolveSkillExecution(input: {
    skillId?: string;
    sourceIds?: string[];
    context: SkillExecutionContext;
  }): {
    skill: SapSkillDefinition;
    selectedSources: SapSourceDefinition[];
    promptContext: string[];
    meta: SkillExecutionMeta;
  } {
    const recommendedSkills = this.recommendSkills(input.context);
    const selectedSkill =
      (input.skillId ? getSkillDefinition(input.skillId) : null) ??
      recommendedSkills[0]?.skill ??
      normalizeSkill(SKILLS[0]);

    const availableSources = this.listSources(input.context);
    const requestedIds =
      input.sourceIds && input.sourceIds.length > 0
        ? input.sourceIds
        : selectedSkill.requiredSources;
    const selectedSources = availableSources.filter(
      (source) =>
        requestedIds.includes(source.id) && source.availability !== "unavailable"
    );

    const sourceReferences: SourceReference[] = [
      {
        id: "workspace-context",
        title: `${labelDomainPack(input.context.domainPack)} / ${input.context.securityMode}`,
        category: "workspace",
        relevance_score: 1,
        description: "현재 워크스페이스 설정",
      },
    ];

    const promptContext = [
      `[선택 Skill]\n${selectedSkill.title}\n${selectedSkill.description}`,
      `[워크스페이스]\nDomain Pack: ${input.context.domainPack}\nSecurity Mode: ${input.context.securityMode}`,
    ];

    for (const source of selectedSources) {
      if (source.id === "vault-confidential" || source.id === "vault-reference") {
        const domainEntries = this.vaultRepo.listByDomainPack(input.context.domainPack, 5);
        const filteredEntries = domainEntries.filter((entry) =>
          source.id === "vault-confidential"
            ? entry.classification === "confidential"
            : entry.classification === "reference"
        );
        if (filteredEntries.length > 0) {
          promptContext.push(
            `[근거 Source: ${source.title}]\n${filteredEntries
              .map((entry) => `- ${entry.title}: ${entry.excerpt ?? "요약 없음"}`)
              .join("\n")}`
          );
          sourceReferences.push(
            ...filteredEntries.map((entry, index) => ({
              id: entry.id,
              title: entry.title,
              category: source.id,
              relevance_score: Math.max(0.5, 0.95 - index * 0.1),
              description: entry.excerpt,
            }))
          );
        } else {
          sourceReferences.push({
            id: source.id,
            title: source.title,
            category: source.id,
            relevance_score: 0.4,
            description: "현재 Domain Pack에 저장된 항목이 없습니다.",
          });
        }
      } else if (source.id.startsWith("vault-entry:") && source.linkedId) {
        const entry = this.vaultRepo.getById(source.linkedId);
        if (entry) {
          promptContext.push(
            `[근거 Source: ${entry.title}]\n${entry.excerpt ?? "요약 없음"}`
          );
          sourceReferences.push({
            id: entry.id,
            title: entry.title,
            category: "vault-entry",
            relevance_score: 0.92,
            description: entry.excerpt,
          });
        }
      } else if (source.id === "current-cbo-run" && input.context.caseContext?.runId) {
        const detail = this.analysisRepo.getRunDetail(input.context.caseContext.runId, 3);
        if (detail?.files.length) {
          promptContext.push(
            `[근거 Source: ${source.title}]\n${detail.files
              .filter((file) => file.result)
              .map((file) => `- ${file.fileName}: ${file.result?.summary ?? "분석 결과 없음"}`)
              .join("\n")}`
          );
          sourceReferences.push(
            ...detail.files.slice(0, 3).map((file, index) => ({
              id: file.id,
              title: file.fileName,
              category: "current-cbo-run",
              relevance_score: Math.max(0.6, 0.9 - index * 0.1),
              description: file.result?.summary ?? file.errorMessage ?? "분석 상세",
            }))
          );
        }
      } else if (source.id === "local-imported-files" && input.context.caseContext?.filePath) {
        sourceReferences.push({
          id: source.id,
          title: input.context.caseContext.filePath.split(/[\\/]/).pop() ?? source.title,
          category: "local-file",
          relevance_score: 0.88,
          description: input.context.caseContext.filePath,
        });
      }
    }

    const uniqueSourceRefs = dedupeSources(sourceReferences);
    return {
      skill: selectedSkill,
      selectedSources,
      promptContext,
      meta: {
        skillUsed: selectedSkill.id,
        skillTitle: selectedSkill.title,
        sources: uniqueSourceRefs,
        sourceIds: selectedSources.map((source) => source.id),
        sourceCount: uniqueSourceRefs.length,
        suggestedTcodes: selectedSkill.suggestedTcodes,
      },
    };
  }
}

function dedupeSources(entries: SourceReference[]): SourceReference[] {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const key = entry.id ?? `${entry.category}:${entry.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function labelDomainPack(domainPack: DomainPack): string {
  switch (domainPack) {
    case "ops":
      return "Ops";
    case "functional":
      return "Functional";
    case "cbo-maintenance":
      return "CBO Maintenance";
    case "pi-integration":
      return "PI Integration";
    case "btp-rap-cap":
      return "BTP / RAP / CAP";
    default:
      return domainPack;
  }
}
