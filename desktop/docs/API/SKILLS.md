# Skill API — SapSkillDefinition 스키마

## SapSkillDefinition

```typescript
interface SapSkillDefinition {
  id: string;
  title: string;
  description: string;
  supportedDomainPacks: DomainPack[];
  supportedDataTypes: Array<"chat" | "cbo">;
  defaultPromptTemplate: string;
  outputFormat: SkillOutputFormat;
  requiredSources: string[];
  suggestedInputs: string[];
  suggestedTcodes: string[];
  isCustom?: boolean;          // 커스텀 스킬 여부
}

type SkillOutputFormat = "chat-answer" | "structured-report" | "checklist" | "explanation";
```

## skill.md YAML 스키마

```yaml
---
id: string                    # 필수, 고유 식별자
title: string                  # 필수, 표시 이름
description: string            # 필수, 설명
supportedDomainPacks: string[] # 필수, 호환 도메인 팩
supportedDataTypes: string[]   # 필수, chat|cbo
defaultPromptTemplate: string  # 필수, LLM 프롬프트 템플릿
outputFormat: string           # 선택, 기본값 chat-answer
requiredSources: string[]      # 선택, 필요 소스 ID
suggestedInputs: string[]      # 선택, 추천 질문
suggestedTcodes: string[]      # 선택, 관련 T-Code
---
```

## SkillPackDefinition

```typescript
interface SkillPackDefinition {
  id: string;
  title: string;
  description: string;
  audience: "ops" | "functional" | "mixed";
  domainPacks: DomainPack[];
  skillIds: string[];
}
```
