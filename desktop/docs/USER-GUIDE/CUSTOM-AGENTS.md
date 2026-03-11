# Custom Agents — 사용자 정의 에이전트

## 개요

에이전트는 여러 **스킬**을 순서대로 실행하는 자동화 워크플로우입니다. `*.agent.md` 파일을 작성하면 앱에서 자동으로 로드되어 프리셋 에이전트와 함께 사용할 수 있습니다.

---

## 파일 위치

커스텀 에이전트 파일은 다음 경로에 저장합니다:

```
%APPDATA%/SAP Assistant/agents/
```

> 앱 내 에이전트 카탈로그에서 **"폴더 열기"** 버튼으로 바로 접근할 수 있습니다.

---

## agent.md 포맷

YAML frontmatter + 선택적 Markdown 본문으로 구성됩니다.

```markdown
---
id: my-deploy-review
title: 배포 전 자동 리뷰
description: Transport를 분석하고 Runbook을 자동 생성하는 워크플로우
domainPacks: [ops, cbo-maintenance]
category: automation
estimatedDuration: 600
steps:
  - id: analyze
    skillId: transport-risk-review
    label: Transport 리스크 분석
    sortOrder: 1
  - id: runbook
    skillId: ops-runbook-writer
    label: Runbook 작성
    sortOrder: 2
    dependsOn: [analyze]
  - id: tag
    skillId: evidence-tagger
    label: 근거 태깅
    sortOrder: 3
    dependsOn: [runbook]
---

## 설명

이 에이전트는 Transport 변경사항을 분석하고,
운영 Runbook을 자동 생성한 후,
결과를 Vault에 태깅합니다.
```

---

## 필드 설명

### 필수 필드

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | string | 고유 식별자 (영문, 하이픈 허용) |
| `title` | string | 에이전트 이름 |
| `description` | string | 에이전트 설명 |
| `domainPacks` | string[] | 호환 도메인 팩 목록 |
| `category` | string | `analysis`, `documentation`, `validation`, `automation` 중 하나 |
| `steps` | array | 실행 단계 배열 |

### Step 필드

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `id` | string | O | 스텝 고유 ID |
| `skillId` | string | O | 실행할 스킬 ID |
| `label` | string | O | 표시 이름 |
| `sortOrder` | number | O | 실행 순서 |
| `dependsOn` | string[] | X | 선행 스텝 ID 목록 |

### 선택 필드

| 필드 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `estimatedDuration` | number | 300 | 예상 소요 시간 (초) |

---

## 사용 가능한 스킬 ID

| 스킬 ID | 설명 |
|---------|------|
| `cbo-impact-analysis` | CBO 변경 영향 분석 |
| `transport-risk-review` | Transport 리스크 리뷰 |
| `incident-triage` | 운영 장애 트리아지 |
| `ops-runbook-writer` | 운영 Runbook 작성 |
| `sap-explainer` | SAP 설명 보조 |
| `evidence-tagger` | 근거 태깅 |

> 커스텀 스킬을 만들면 해당 스킬 ID도 사용할 수 있습니다.

---

## 의존성 (dependsOn)

스텝 간 의존성을 설정하면, 선행 스텝이 완료된 후에만 다음 스텝이 실행됩니다.
선행 스텝의 출력(LLM 응답)이 다음 스텝의 컨텍스트로 전달됩니다.

```yaml
steps:
  - id: step-a
    skillId: incident-triage
    label: 장애 분석
    sortOrder: 1
  - id: step-b
    skillId: sap-explainer
    label: 현업 설명 생성
    sortOrder: 2
    dependsOn: [step-a]    # step-a 완료 후 실행
```

---

## 예제: Incident 대응 워크플로우

```markdown
---
id: incident-response
title: Incident 대응 자동화
description: 장애를 분석하고, 현업에 설명하고, Runbook을 생성합니다
domainPacks: [ops, functional]
category: automation
estimatedDuration: 300
steps:
  - id: triage
    skillId: incident-triage
    label: 장애 원인 분석
    sortOrder: 1
  - id: explain
    skillId: sap-explainer
    label: 현업용 설명
    sortOrder: 2
    dependsOn: [triage]
  - id: runbook
    skillId: ops-runbook-writer
    label: 대응 절차 문서화
    sortOrder: 3
    dependsOn: [explain]
---

장애 발생 시 이 에이전트를 실행하면:
1. 원인 후보와 점검 순서를 정리하고
2. 현업이 이해할 수 있는 설명을 생성하고
3. 대응 절차 Runbook을 작성합니다.
```

---

## 주의사항

- `id`는 프리셋 에이전트 ID와 중복될 수 없습니다.
- `skillId`는 등록된 스킬(프리셋 또는 커스텀) ID여야 합니다.
- 파일명은 `*.agent.md` 패턴이어야 합니다 (예: `my-workflow.agent.md`).
- YAML frontmatter의 들여쓰기는 **2칸 스페이스**를 사용하세요.
