# Agent API — AgentDefinition 스키마

## AgentDefinition

```typescript
interface AgentDefinition {
  id: string;
  title: string;
  description: string;
  domainPacks: DomainPack[];
  category: AgentCategory;
  estimatedDuration: number; // seconds
  steps: AgentStep[];
  isCustom?: boolean;        // 커스텀 에이전트 여부
}

type AgentCategory = "analysis" | "documentation" | "validation" | "automation";

type DomainPack = "ops" | "functional" | "cbo-maintenance" | "pi-integration" | "btp-rap-cap";
```

## AgentStep

```typescript
interface AgentStep {
  id: string;
  skillId: string;
  label: string;
  description?: string;
  config: Record<string, unknown>;
  sortOrder: number;
  dependsOn?: string[];
}
```

## AgentExecution

```typescript
interface AgentExecution {
  id: string;
  agentId: string;
  status: AgentExecutionStatus;
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
  stepResults: AgentStepResult[];
}

type AgentExecutionStatus = "running" | "completed" | "failed" | "cancelled";
```

## agent.md YAML 스키마

```yaml
---
id: string              # 필수, 고유 식별자
title: string            # 필수, 표시 이름
description: string      # 필수, 설명
domainPacks: string[]    # 필수, 호환 도메인 팩
category: string         # 필수, analysis|documentation|validation|automation
estimatedDuration: number # 선택, 기본값 300 (초)
steps:                   # 필수, 1개 이상
  - id: string           # 필수, 스텝 고유 ID
    skillId: string      # 필수, 스킬 ID 참조
    label: string        # 필수, 표시 이름
    sortOrder: number    # 필수, 실행 순서
    dependsOn: string[]  # 선택, 선행 스텝 ID
---
```
