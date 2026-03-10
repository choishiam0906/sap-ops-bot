import {
  CboAnalysisResult,
  CboAnalyzeFileInput,
  CboAnalyzeTextInput,
  ProviderType,
  SourceReference,
} from "../contracts.js";
import { SecureStore } from "../auth/secureStore.js";
import { LlmProvider } from "../providers/base.js";
import { parseCboFile, parseCboText } from "./parser.js";
import { analyzeByRules } from "./rules.js";
import { getSkillDefinition } from "../skills/registry.js";

function buildLlmPrompt(baseResult: CboAnalysisResult, source: string): string {
  const skill = getSkillDefinition("cbo-impact-analysis");
  return [
    skill?.defaultPromptTemplate ??
      "다음 CBO 소스를 검토하여 핵심 요약, 운영 리스크, 개선권고를 간결하게 제시하세요.",
    "응답은 한국어로 작성하세요.",
    "이미 검출된 규칙기반 결과를 보완하는 관점으로 작성하세요.",
    "",
    "[규칙 기반 1차 분석]",
    baseResult.summary,
    ...baseResult.risks.map((risk, i) => `${i + 1}. ${risk.title} (${risk.severity}) - ${risk.detail}`),
    "",
    "[소스 원문]",
    source.slice(0, 12000),
  ].join("\n");
}

export class CboAnalyzer {
  private readonly providers: Map<ProviderType, LlmProvider>;

  constructor(
    providers: LlmProvider[],
    private readonly secureStore: SecureStore
  ) {
    this.providers = new Map(providers.map((provider) => [provider.type, provider]));
  }

  async analyzeText(input: CboAnalyzeTextInput): Promise<CboAnalysisResult> {
    const parsed = parseCboText(input.fileName, input.content);
    return this.analyzeContent(parsed.fileName, parsed.content, input.provider, input.model);
  }

  async analyzeFile(input: CboAnalyzeFileInput): Promise<CboAnalysisResult> {
    const parsed = await parseCboFile(input.filePath);
    return this.analyzeContent(parsed.fileName, parsed.content, input.provider, input.model);
  }

  async analyzeContent(
    fileName: string,
    content: string,
    provider?: ProviderType,
    model?: string,
  ): Promise<CboAnalysisResult> {
    const baseResult = withSkillMeta(analyzeByRules(fileName, content), fileName);
    return this.enrichWithOptionalLlm(baseResult, content, provider, model);
  }

  private async enrichWithOptionalLlm(
    baseResult: CboAnalysisResult,
    source: string,
    providerType?: ProviderType,
    model?: string
  ): Promise<CboAnalysisResult> {
    if (!providerType || !model) {
      return baseResult;
    }

    const provider = this.providers.get(providerType);
    const token = await this.secureStore.get(providerType);
    if (!provider || !token?.accessToken) {
      return baseResult;
    }

    try {
      const llmResponse = await provider.sendMessage(token, {
        model,
        message: buildLlmPrompt(baseResult, source),
        history: [],
      });

      if (llmResponse.content.trim()) {
        return {
          ...baseResult,
          summary: `${baseResult.summary}\n\n[LLM 보강 분석]\n${llmResponse.content.trim()}`,
        };
      }
    } catch {
      // LLM 보강 실패 시 규칙 기반 분석 결과를 그대로 반환한다.
    }

    return baseResult;
  }
}

function withSkillMeta(result: CboAnalysisResult, fileName: string): CboAnalysisResult {
  const skill = getSkillDefinition("cbo-impact-analysis");
  const sources: SourceReference[] = [
    {
      id: "workspace-context",
      title: "CBO Maintenance Workspace",
      category: "workspace",
      relevance_score: 1,
      description: "Secure Local + CBO Maintenance 권장 조합",
    },
    {
      id: "local-imported-files",
      title: fileName,
      category: "local-file",
      relevance_score: 0.95,
      description: "현재 분석 중인 로컬 소스",
    },
  ];

  return {
    ...result,
    skillUsed: skill?.id ?? "cbo-impact-analysis",
    skillTitle: skill?.title ?? "CBO 변경 영향 분석",
    sourceIds: ["workspace-context", "local-imported-files"],
    sources,
    suggestedTcodes: skill?.suggestedTcodes ?? ["SE80", "SE11", "SE38", "STMS"],
  };
}
