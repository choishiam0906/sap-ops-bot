# Custom Skills — 사용자 정의 스킬

## 개요

스킬은 특정 SAP 운영 작업에 특화된 **LLM 프롬프트 템플릿**입니다. `*.skill.md` 파일을 작성하면 앱에서 자동으로 로드되어 프리셋 스킬과 함께 사용할 수 있습니다.

---

## 파일 위치

커스텀 스킬 파일은 다음 경로에 저장합니다:

```
%APPDATA%/SAP Assistant/skills/
```

---

## skill.md 포맷

```markdown
---
id: my-custom-analysis
title: 내부 정책 기반 분석
description: 팀 내부 정책 기준으로 변경 분석
supportedDomainPacks: [ops, cbo-maintenance]
supportedDataTypes: [chat, cbo]
outputFormat: structured-report
requiredSources: [vault-confidential, vault-reference]
suggestedInputs:
  - "이 변경의 위험도를 평가해줘"
  - "내부 정책 위반 여부를 확인해줘"
suggestedTcodes: [SE80, SE11]
defaultPromptTemplate: |
  당신은 우리 팀의 정책 검토자입니다.
  다음 기준으로 분석하세요:
  1. 내부 코딩 규칙 준수 여부
  2. 성능 영향 평가
  3. 보안 취약점 검토
---

## 추가 설명

이 스킬은 팀 내부에서 합의된 정책을 기반으로
CBO 변경사항을 리뷰합니다.
```

---

## 필드 설명

### 필수 필드

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | string | 고유 식별자 |
| `title` | string | 스킬 이름 |
| `description` | string | 스킬 설명 |
| `supportedDomainPacks` | string[] | 호환 도메인 팩 목록 |
| `supportedDataTypes` | string[] | `chat`, `cbo` 중 하나 이상 |
| `defaultPromptTemplate` | string | LLM에 전달할 시스템 프롬프트 |

### 선택 필드

| 필드 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `outputFormat` | string | `chat-answer` | `chat-answer`, `structured-report`, `checklist`, `explanation` |
| `requiredSources` | string[] | `[]` | 필요한 소스 ID 목록 |
| `suggestedInputs` | string[] | `[]` | 추천 질문 목록 |
| `suggestedTcodes` | string[] | `[]` | 관련 T-Code 목록 |

---

## 사용 가능한 소스 ID

| 소스 ID | 설명 |
|---------|------|
| `vault-confidential` | 기밀 Vault 항목 |
| `vault-reference` | 참고 Vault 항목 |
| `current-cbo-run` | 현재 CBO 분석 결과 |
| `local-imported-files` | 로컬 임포트 파일 |
| `workspace-context` | 워크스페이스 설정 |

---

## 사용 가능한 도메인 팩

| ID | 이름 |
|----|------|
| `ops` | Ops Pack |
| `functional` | Functional Pack |
| `cbo-maintenance` | CBO Maintenance Pack |
| `pi-integration` | PI Integration Pack |
| `btp-rap-cap` | BTP/RAP/CAP Pack |

---

## 프롬프트 템플릿 작성 가이드

`defaultPromptTemplate`은 LLM에 시스템 프롬프트로 전달됩니다:

```yaml
defaultPromptTemplate: |
  당신은 SAP Basis 전문가입니다.

  다음 규칙에 따라 분석하세요:
  - 변경 범위를 파악하세요
  - 영향받는 T-Code를 나열하세요
  - 위험도를 높음/중간/낮음으로 분류하세요

  응답은 한국어로 작성하세요.
```

### 팁
- `|` (파이프)를 사용하면 여러 줄 문자열을 작성할 수 있습니다
- 구체적인 역할과 분석 기준을 명시하세요
- 출력 형식을 안내하면 일관된 결과를 얻을 수 있습니다

---

## 주의사항

- `id`는 프리셋 스킬 ID와 중복될 수 없습니다.
- 파일명은 `*.skill.md` 패턴이어야 합니다.
- `defaultPromptTemplate`은 코드 실행이 아닌 텍스트 프롬프트입니다.
