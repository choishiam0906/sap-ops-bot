<p align="center">
  <img src="https://img.shields.io/badge/SAP-0FAAFF?style=for-the-badge&logo=sap&logoColor=white" alt="SAP" />
  <img src="https://img.shields.io/badge/Electron-47848F?style=for-the-badge&logo=electron&logoColor=white" alt="Electron" />
  <img src="https://img.shields.io/badge/OAuth-Codex%20%7C%20Copilot-111111?style=for-the-badge" alt="OAuth" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/MCP-Claude_Code-7C3AED?style=for-the-badge" alt="MCP" />
</p>

<h1 align="center">🤖 SAP Ops Bot</h1>

<p align="center">
  <strong>SAP 운영 지식을 AI로 민주화하여, 누구나 자연어로 SAP 운영 절차를 안내받을 수 있는 환경을 만듭니다.</strong>
</p>

<p align="center">
  <a href="docs/PRD.md">📋 PRD</a> •
  <a href="docs/BRD.md">📊 BRD</a> •
  <a href="docs/TRD.md">🔧 TRD</a> •
  <a href="#빠른-시작">🚀 빠른 시작</a> •
  <a href="#api-문서">📖 API 문서</a>
</p>

---

## ⚠️ v2 전환 공지 (2026-03-03)

`sap-ops-bot`은 **클라이언트형 OAuth 아키텍처**로 전환되었습니다.

- 신규 런타임: `desktop/` (Electron)
- 인증: 사용자 OAuth (`Codex`, `Copilot`)
- 데이터 저장: 로컬 SQLite
- 서버 `/api/v1/chat`, `/api/v1/chat/copilot`: `410 Gone` (중단)

Desktop 런타임은 [`desktop/README.md`](desktop/README.md)를 참고하세요.

---

## 💡 프로젝트 소개

SAP 운영 현장에서 축적된 노하우를 AI 봇으로 자동화한 프로젝트입니다.

Desktop 앱에서 자연어로 질문하면, **RAG(Retrieval-Augmented Generation)** 기반 AI가 적절한 T-code, 실행 절차, 주의사항을 안내합니다.

### 해결하는 문제

| 문제 | Before | After |
|------|--------|-------|
| 🔒 지식 종속 | 운영 노하우가 개인/PPT에 산재 | AI 봇이 통합 지식 베이스로 즉시 응답 |
| ⏰ T-code 검색 | 매번 문서 뒤지거나 동료에게 질문 | 자연어로 상황 설명 → T-code 추천 |
| 📚 온보딩 비용 | 신규 인력 3-6개월 학습 | AI 봇이 24/7 멘토 역할 |
| 🐛 오류 분석 | 디버깅 T-code 모르면 시간 낭비 | 오류 상황 설명 → 디버깅 절차 안내 |

---

## ✨ 주요 기능

<table>
  <tr>
    <td width="50%">
      <h3>💬 SAP 운영 Q&A</h3>
      <p>자연어 질문에 대해 RAG 기반으로 정확한 SAP 운영 답변을 제공합니다.</p>
      <pre>"ST22로 덤프 분석하는 방법 알려줘"
→ ST22 T-code 안내 + 단계별 절차 + 주의사항</pre>
    </td>
    <td width="50%">
      <h3>🔍 T-code 추천 엔진</h3>
      <p>업무 상황을 설명하면 적절한 T-code와 실행 방법을 안내합니다.</p>
      <pre>"특정 사용자의 프로그램 실행 이력을 확인하고 싶어"
→ SM20 추천 + 필터 설정 방법</pre>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h3>🐛 에러 패턴 카탈로그</h3>
      <p>10개 주요 SAP 에러 패턴이 등록되어 있으며, 에러코드로 즉시 원인/해결책을 조회합니다.</p>
      <pre>"DBIF_RSQL_SQL_ERROR 덤프가 반복 발생해"
→ 에러 원인 + SAP Note 2220064 + 해결 방법 4가지</pre>
    </td>
    <td width="50%">
      <h3>🧠 도메인 스킬 라우팅</h3>
      <p>질문을 자동으로 전문 스킬(오류분석/데이터분석/역할관리/CTS관리)에 라우팅합니다.</p>
      <pre>"CTS 전송이 실패했어"
→ skill_used: "CTS관리" + STMS/SE03 안내</pre>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h3>🔌 MCP 서버 (Claude Code 연동)</h3>
      <p>Claude Code에서 직접 SAP 지식을 검색하고 문제를 진단할 수 있는 MCP 서버를 제공합니다.</p>
    </td>
    <td width="50%">
      <h3>🖥️ Admin Dashboard</h3>
      <p>지식 베이스 CRUD 관리, 대화 이력 조회, 사용 통계 대시보드를 제공합니다.</p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h3>🧪 CBO 소스 정적 분석</h3>
      <p>`.txt`/`.md`로 전달된 CBO 소스를 규칙 기반으로 점검하고 운영 리스크와 개선 권고를 제시합니다.</p>
      <pre>"EXEC SQL, SELECT *가 포함된 CBO 소스 점검해줘"
→ 리스크 목록 + 우선순위 권고 + 요약 리포트</pre>
    </td>
    <td width="50%">
      <h3>✨ 선택적 LLM 보강</h3>
      <p>OAuth 인증된 provider/model을 선택하면 규칙 분석 결과를 LLM 관점으로 추가 보강할 수 있습니다.</p>
      <pre>규칙 분석 결과 + LLM 보강 요약
→ 실무 개선 포인트 빠른 도출</pre>
    </td>
  </tr>
</table>

---

## 📦 SAP 지식 베이스

**13개 운영 가이드** + **10개 에러 패턴**이 시드 데이터로 포함되어 있습니다.

### 운영 가이드 (13개)

| 카테고리 | T-code | 용도 |
|:--------:|:------:|------|
| 데이터분석 | `ST03N` | Transaction/RFC Profile 조회 |
| 데이터분석 | `SM20` | 보안 감사 로그 (로그온/프로그램 실행 이력) |
| 데이터분석 | `RSM37` | 백그라운드잡 이력 조회 |
| 데이터분석 | `SE38` | 프로그램 소스 검색 (RS_ABAP_SOURCE_SCAN) |
| 데이터분석 | `SE38` | 외부 DB 접근 쿼리 (ADBC_QUERY) |
| 데이터분석 | `SCU3` | Table Logging 기반 DML 이력 조회 |
| 데이터분석 | `ST05` | SQL Trace 활성화/비활성화 |
| 오류분석 | `SE11` | T100 테이블 메시지 찾기 |
| 오류분석 | `ST22` | ABAP 덤프(Runtime Error) 분석 |
| 오류분석 | `SM21` | 시스템 로그 조회 |
| 역할관리 | `S_BCE_68001425` | 역할/사용자/T-code 기반 권한 조회 |
| CTS관리 | `STMS` | CTS 이동 경로 설정 및 전송 |
| CTS관리 | `SE03` | Transport Request 이력 조회 |

### 에러 패턴 카탈로그 (10개)

에러코드로 즉시 원인과 해결 방법을 찾을 수 있습니다.

| 에러코드 | SAP Note | 설명 |
|----------|:--------:|------|
| `DBIF_RSQL_SQL_ERROR` | 2220064 | DB SQL 실행 에러 (Lock, Deadlock) |
| `TSV_TNEW_PAGE_ALLOC_FAILED` | — | Internal Table 메모리 부족 |
| `DYNPRO_MSG_IN_HELP` | — | 다이나프로 Help 이벤트에서 MESSAGE 에러 |
| `MESSAGE_TYPE_X` | — | 프로그램 의도적 강제 종료 |
| `CONVT_NO_NUMBER` | — | 문자열→숫자 형변환 실패 |
| `OBJECTS_OBJREF_NOT_ASSIGNED` | — | 초기화 안 된 객체 참조 (Null 참조) |
| `GETWA_NOT_ASSIGNED` | — | 할당 안 된 필드 심볼 접근 |
| `TIME_OUT` | — | 다이얼로그 실행 시간 초과 |
| `RABAX_STATE` | — | 이중 예외 (덤프 처리 중 재덤프) |
| `SM21_SYSTEM_LOG` | — | 시스템 로그 에러 패턴 종합 |

---

## 🏗️ 아키텍처

```
┌───────────────────────────┐
│ Electron Desktop Client   │
│ (OAuth: Codex/Copilot)    │
└──────────────┬────────────┘
               │ IPC
┌──────────────▼────────────┐
│ Desktop Runtime           │
│ - Provider Adapter        │
│ - Session/Message Store   │
│ - Local SQLite            │
└──────────────┬────────────┘
               │ (보조 API)
┌──────────────▼────────────┐
│ FastAPI Backend (Legacy)  │
│ - Knowledge API           │
│ - Health/Stats API        │
│ - MCP Server              │
│ - /api/v1/chat = 410 Gone │
└───────────────────────────┘
```

---

## 🛠️ 기술 스택

| 레이어 | 기술 | 선택 이유 |
|:------:|------|----------|
| **Desktop Runtime** | Electron + TypeScript | 사용자 OAuth, 로컬 실행, 세션 고정 |
| **Desktop Storage** | SQLite (better-sqlite3) | 로컬 세션/메시지 저장 |
| **Backend API** | Python 3.12 + FastAPI | 지식 관리, 헬스/통계, MCP |
| **Admin UI** | React + TypeScript + Vite | 지식 CRUD 및 운영 화면 |
| **LLM Provider** | Codex OAuth + Copilot OAuth | 사용자 계정 기반 인증 |
| **Vector DB** | ChromaDB | 지식 검색 호환 레이어 |
| **Integration** | MCP | Claude Code 연동 |
| **Infra** | Docker + GitHub Actions | 컨테이너화, CI/CD |

---

## 🚀 빠른 시작

### 사전 요구사항

- Node.js 20+
- Python 3.12+ (Knowledge API/MCP 사용 시)

### 1. Desktop (권장)

```bash
git clone https://github.com/choishiam0906/sap-ops-bot.git
cd sap-ops-bot/desktop
cp .env.example .env
npm install
npm run build
npm run start
```

Desktop 실행 후 기본 화면에서 아래를 바로 수행할 수 있습니다.
- CBO 텍스트 직접 입력 분석
- CBO 파일 선택 분석(`.txt`, `.md`, 최대 1MB)
- CBO 폴더 배치 분석(재귀 스캔 + 동일 해시 스킵)
- CBO 실행 이력 조회(로컬 SQLite 저장)
- CBO 실행 결과를 backend Knowledge API로 동기화(`source_type=source_code`, bulk 우선)
- CBO 실행 간 리스크 변화 비교(diff)
- 선택적 LLM 보강 분석(provider/model 지정)

### 2. Backend (보조 API/MCP)

```bash
cd backend
pip install -e ".[dev]"
uvicorn app.main:app --reload
# http://localhost:8000/docs
```

### 3. Admin Dashboard (선택)

```bash
cd frontend
npm install
npm run dev
# http://localhost:5173
```

---

## 📖 API 문서

Backend 실행 후 자동 생성됩니다:

| 문서 | URL |
|------|-----|
| Swagger UI | `http://localhost:8000/docs` |
| ReDoc | `http://localhost:8000/redoc` |

### 핵심 엔드포인트

| Method | Path | 설명 |
|:------:|------|------|
| `POST` | `/api/v1/chat` | **중단됨** (`410 Gone`) |
| `POST` | `/api/v1/chat/copilot` | **중단됨** (`410 Gone`) |
| `GET` | `/api/v1/chat/skills` | 사용 가능한 스킬 목록 조회 |
| `GET` | `/api/v1/knowledge` | 지식 목록 조회 |
| `POST` | `/api/v1/knowledge` | 지식 추가 (에러 패턴 포함) |
| `POST` | `/api/v1/knowledge/bulk` | 지식 일괄 추가 (Desktop CBO sync) |
| `PUT` | `/api/v1/knowledge/{id}` | 지식 수정 |
| `DELETE` | `/api/v1/knowledge/{id}` | 지식 삭제 |
| `GET` | `/api/v1/health` | 헬스체크 |
| `GET` | `/api/v1/runtime` | 런타임 모드 조회 (`desktop_oauth`) |
| `GET` | `/api/v1/stats` | 사용 통계 |

---

## 🧠 도메인 스킬 시스템

사용자의 질문을 자동으로 분석하여 가장 적합한 전문 스킬에 라우팅합니다.

| 스킬 | 카테고리 | 키워드 예시 | 추천 T-code |
|:----:|:--------:|-----------|:-----------:|
| 데이터분석 | 데이터분석 | 이력, 로그, 조회, trace, 배치 | ST03N, SM20, ST05 |
| 오류분석 | 오류분석 | 덤프, 에러, 런타임, 디버깅 | ST22, SM21, SE91 |
| 역할관리 | 역할관리 | 역할, 권한, 사용자, PFCG | PFCG, SU01, SU53 |
| CTS관리 | CTS관리 | 전송, transport, CTS, request | STMS, SE03, SE09 |
| 일반 | — | 위에 해당하지 않는 질문 (폴백) | — |

채팅 응답에 `skill_used` 필드가 포함되어 어떤 스킬이 선택되었는지 확인할 수 있습니다:

```json
{
  "answer": "ST22는 ABAP Runtime Error를 분석하는 T-code입니다...",
  "skill_used": "오류분석",
  "suggested_tcodes": ["ST22", "SM21"]
}
```

---

## 🔌 MCP 서버 (Claude Code 연동)

Claude Code에서 SAP 운영 지식을 직접 사용할 수 있는 MCP 서버를 제공합니다.

### 설정

프로젝트 루트의 `.mcp.json`이 이미 설정되어 있습니다:

```json
{
  "mcpServers": {
    "sap-ops-bot": {
      "command": "python",
      "args": ["-m", "app.mcp_server"],
      "cwd": "backend",
      "env": { "PYTHONPATH": "." }
    }
  }
}
```

Claude Code에서 프로젝트를 열면 자동으로 MCP 서버가 로드됩니다.

### MCP Tools (4개)

| Tool | 설명 | 사용 예시 |
|------|------|----------|
| `search_knowledge` | SAP 지식 키워드 검색 | `search_knowledge("ST22 덤프")` |
| `get_error_pattern` | 에러코드로 패턴 직접 조회 | `get_error_pattern("DBIF_RSQL_SQL_ERROR")` |
| `suggest_tcode` | 주제별 T-code 추천 | `suggest_tcode("권한 관리")` |
| `diagnose_problem` | RAG + 스킬 라우팅 종합 진단 | `diagnose_problem("메모리 부족 덤프 반복")` |

### MCP Resources (3개)

| URI | 설명 |
|-----|------|
| `sap://skills` | 사용 가능한 스킬 목록 |
| `sap://knowledge/categories` | 지식 카테고리별 항목 수 |
| `sap://error-catalog` | 에러 패턴 카탈로그 전체 목록 |

### 독립 실행 테스트

```bash
cd backend
python -m app.mcp_server
# stdio 기반으로 동작 — Claude Code가 자동 연결
```

---

## 📁 프로젝트 구조

```
sap-ops-bot/
├── 📄 README.md
├── 📄 .mcp.json                  # Claude Code MCP 서버 설정
├── 📄 docker-compose.yml
├── 📄 .env.example
│
├── 📂 docs/
│   ├── PRD.md                    # 제품 요구사항 정의서
│   ├── BRD.md                    # 비즈니스 요구사항 정의서
│   └── TRD.md                    # 기술 요구사항 정의서
│
├── 📂 desktop/
│   ├── package.json
│   ├── tsconfig.json
│   ├── README.md
│   └── src/
│       ├── main/
│       │   ├── index.ts          # Electron main + IPC
│       │   ├── chatRuntime.ts    # 세션/메시지 런타임
│       │   ├── auth/             # OAuth 매니저 + SecureStore
│       │   ├── cbo/              # CBO parser/rules/analyzer
│       │   ├── providers/        # Codex/Copilot 어댑터
│       │   └── storage/          # SQLite 저장소
│       └── preload/index.ts      # renderer 브리지
│
├── 📂 backend/
│   ├── pyproject.toml
│   ├── Dockerfile
│   ├── app/
│   │   ├── main.py               # FastAPI 엔트리포인트
│   │   ├── config.py             # 설정 관리
│   │   ├── mcp_server.py         # MCP 서버 (Claude Code 연동)
│   │   ├── api/                  # API 엔드포인트
│   │   │   ├── chat.py           # /chat 410 + /chat/skills
│   │   │   ├── knowledge.py      # 지식 베이스 CRUD
│   │   │   └── copilot.py        # /chat/copilot 410
│   │   ├── core/                 # 핵심 비즈니스 로직
│   │   │   ├── rag_engine.py     # RAG 파이프라인 + 스킬 라우팅
│   │   │   ├── llm_client.py     # Azure OpenAI 클라이언트
│   │   │   ├── knowledge_base.py # 지식 베이스 관리
│   │   │   └── skills/           # 도메인 스킬 모듈
│   │   │       ├── base.py       # BaseSkill + SkillMetadata
│   │   │       ├── registry.py   # SkillRegistry (스킬 라우팅)
│   │   │       ├── data_analysis.py
│   │   │       ├── error_analysis.py
│   │   │       ├── auth_management.py
│   │   │       ├── cts_management.py
│   │   │       └── general.py    # 폴백 스킬
│   │   ├── models/               # 데이터 모델
│   │   └── data/sap_knowledge/
│   │       ├── seed_data.json    # 운영 가이드 시드 (13개)
│   │       └── error_patterns.json # 에러 패턴 시드 (10개)
│   └── tests/                    # pytest 테스트
│
├── 📂 frontend/
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── pages/                # Dashboard, Knowledge, History
│       └── components/           # Layout, Sidebar, KnowledgeForm
│
├── 📂 copilot/
│   └── connector-spec.json       # Copilot Studio OpenAPI 스펙
│
└── 📂 .github/workflows/
    └── ci.yml                    # GitHub Actions CI
```

---

## 🗺️ 로드맵

- [x] **v2 전환** — Desktop OAuth 런타임 (Codex/Copilot), 서버 채팅 경로 종료
- [x] **Phase 1 MVP** — 지식 Q&A + T-code 추천 + Admin Dashboard
- [x] **Phase 1.5** — 에러 패턴 카탈로그 + 도메인 스킬 모듈화 + MCP 서버
- [ ] **Phase 2** — SAP RFC 직접 연결 (pyrfc), 자동 실행
- [ ] **Phase 3** — 실시간 모니터링, 알림 자동화

---

## 🧪 테스트

```bash
# Backend
cd backend
pip install -e ".[dev]"
pytest tests/ -v

# 린트
ruff check app/ tests/

# Desktop 타입 체크
cd ../desktop
npm install
npm run build

# Frontend
cd ../frontend
npm run build   # TypeScript 타입 체크 + 빌드
```

---

## 📄 프로젝트 문서

| 문서 | 설명 |
|:----:|------|
| [📋 PRD](docs/PRD.md) | 제품 요구사항 정의서 — 기능 명세, 비기능 요구사항, KPI |
| [📊 BRD](docs/BRD.md) | 비즈니스 요구사항 정의서 — ROI 분석, 이해관계자 |
| [🔧 TRD](docs/TRD.md) | 기술 요구사항 정의서 — API 설계, 데이터 모델, RAG 파이프라인 |

---

## 🤝 Codex Co-author 커밋 사용법

Codex와 협업한 변경을 GitHub 히스토리에 남기려면 커밋 footer에 `Co-authored-by`를 포함하세요.

### 1회 설정 (Windows PowerShell)

```powershell
@'
<type>: <summary>

<body>

Co-authored-by: Codex <codex@openai.com>
'@ | Set-Content -Path $HOME\.gitmessage_codex -Encoding utf8

git config commit.template "$HOME\.gitmessage_codex"
```

### 커밋할 때

```bash
git commit
```

- 에디터가 열리면 `<type>: <summary>`, `<body>`만 채우고 `Co-authored-by` 줄은 유지합니다.
- `git commit -m ...`처럼 한 줄 커밋을 쓰면 템플릿을 건너뛸 수 있으니, 아래처럼 footer를 직접 넣어주세요.

```bash
git commit -m "feat: add desktop oauth runtime" \
  -m "Co-authored-by: Codex <codex@openai.com>"
```

### 확인

```bash
git show -s --format=full
```

- 출력 메시지 하단에 `Co-authored-by: Codex <codex@openai.com>`가 보이면 정상입니다.

---

## 📝 라이선스

MIT License

---

<p align="center">
  <sub>Built with ❤️ by <a href="https://github.com/choishiam0906">choishiam0906</a></sub>
</p>
