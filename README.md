<p align="center">
  <img src="https://img.shields.io/badge/SAP-0FAAFF?style=for-the-badge&logo=sap&logoColor=white" alt="SAP" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Azure_OpenAI-0078D4?style=for-the-badge&logo=microsoftazure&logoColor=white" alt="Azure OpenAI" />
  <img src="https://img.shields.io/badge/Teams-6264A7?style=for-the-badge&logo=microsoftteams&logoColor=white" alt="Teams" />
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

## 💡 프로젝트 소개

SAP 운영 현장에서 축적된 노하우를 AI 봇으로 자동화한 프로젝트입니다.

Microsoft Teams에서 자연어로 질문하면, **RAG(Retrieval-Augmented Generation)** 기반 AI가 적절한 T-code, 실행 절차, 주의사항을 안내합니다.

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
      <h3>📂 카테고리별 가이드</h3>
      <p>데이터분석 / 오류분석 / 역할관리 / CTS관리 4개 카테고리로 구조화된 가이드를 제공합니다.</p>
    </td>
    <td width="50%">
      <h3>🖥️ Admin Dashboard</h3>
      <p>지식 베이스 CRUD 관리, 대화 이력 조회, 사용 통계 대시보드를 제공합니다.</p>
    </td>
  </tr>
</table>

---

## 📦 SAP 지식 베이스

PPT 기반으로 구축된 **13개 핵심 운영 지식**이 시드 데이터로 포함되어 있습니다.

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

---

## 🏗️ 아키텍처

```
┌─────────────────────────────────────────────────────┐
│                   사용자 (Teams)                      │
└────────────────────────┬────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────┐
│             Microsoft Copilot Studio                 │
│  · 대화 흐름 관리  · Azure AD 인증                    │
│  · Custom Connector → FastAPI                        │
└────────────────────────┬────────────────────────────┘
                         │ REST API
┌────────────────────────▼────────────────────────────┐
│             Python FastAPI Backend                    │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌────────────────┐     │
│  │ Chat API │  │ RAG 엔진  │  │ Knowledge API  │     │
│  └────┬─────┘  └────┬─────┘  └──────┬─────────┘     │
│       │             │               │                │
│  ┌────▼─────────────▼───────────────▼──────────┐     │
│  │  Azure OpenAI (GPT-4)  ·  ChromaDB (Vector) │     │
│  │  PostgreSQL (구조화 데이터)                    │     │
│  └─────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────┐
│             React Admin Dashboard                    │
│  · 지식 베이스 CRUD  · 대화 이력 조회  · 사용 통계    │
└─────────────────────────────────────────────────────┘
```

---

## 🛠️ 기술 스택

| 레이어 | 기술 | 선택 이유 |
|:------:|------|----------|
| **Backend** | Python 3.12 + FastAPI | AI/LLM 생태계 풍부, 비동기 지원 |
| **Frontend** | React + TypeScript + Vite | 타입 안전성, 빠른 개발 |
| **LLM** | Azure OpenAI GPT-4 | 기업 보안/컴플라이언스 |
| **Vector DB** | ChromaDB → Azure AI Search | RAG 파이프라인 |
| **Database** | PostgreSQL (Supabase) | 구조화 데이터, 대화 이력 |
| **Integration** | Copilot Studio | Teams 배포, 기업 인증 |
| **Infra** | Docker + GitHub Actions | 컨테이너화, CI/CD |

---

## 🚀 빠른 시작

### 사전 요구사항

- Python 3.12+
- Node.js 20+
- Docker & Docker Compose (선택)

### 1. 환경 설정

```bash
git clone https://github.com/choishiam0906/sap-ops-bot.git
cd sap-ops-bot
cp .env.example .env
# .env 파일에 Azure OpenAI API 키 등 실제 값 입력
```

### 2. Backend 실행

```bash
cd backend
pip install -e ".[dev]"
uvicorn app.main:app --reload
# → http://localhost:8000/docs 에서 Swagger UI 확인
```

### 3. Frontend 실행

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173 에서 Admin Dashboard 확인
```

### 4. Docker Compose (전체 스택)

```bash
docker compose up -d
# Backend: http://localhost:8000
# Frontend: http://localhost:5173
# PostgreSQL: localhost:5432
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
| `POST` | `/api/v1/chat` | 사용자 질문 → AI 응답 (RAG 기반) |
| `POST` | `/api/v1/chat/copilot` | Copilot Studio 전용 (Adaptive Card) |
| `GET` | `/api/v1/knowledge` | 지식 목록 조회 |
| `POST` | `/api/v1/knowledge` | 지식 추가 |
| `PUT` | `/api/v1/knowledge/{id}` | 지식 수정 |
| `DELETE` | `/api/v1/knowledge/{id}` | 지식 삭제 |
| `GET` | `/api/v1/health` | 헬스체크 |
| `GET` | `/api/v1/stats` | 사용 통계 |

---

## 📁 프로젝트 구조

```
sap-ops-bot/
├── 📄 README.md
├── 📄 docker-compose.yml
├── 📄 .env.example
│
├── 📂 docs/
│   ├── PRD.md                    # 제품 요구사항 정의서
│   ├── BRD.md                    # 비즈니스 요구사항 정의서
│   └── TRD.md                    # 기술 요구사항 정의서
│
├── 📂 backend/
│   ├── pyproject.toml
│   ├── Dockerfile
│   ├── app/
│   │   ├── main.py               # FastAPI 엔트리포인트
│   │   ├── config.py             # 설정 관리
│   │   ├── api/                  # API 엔드포인트
│   │   │   ├── chat.py           # 채팅 API
│   │   │   ├── knowledge.py      # 지식 베이스 CRUD
│   │   │   └── copilot.py        # Copilot Studio 연동
│   │   ├── core/                 # 핵심 비즈니스 로직
│   │   │   ├── rag_engine.py     # RAG 파이프라인
│   │   │   ├── llm_client.py     # Azure OpenAI 클라이언트
│   │   │   └── knowledge_base.py # 지식 베이스 관리
│   │   ├── models/               # 데이터 모델
│   │   └── data/sap_knowledge/   # SAP 지식 시드 데이터
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

- [x] **Phase 1 MVP** — 지식 Q&A + T-code 추천 + Admin Dashboard
- [ ] **Phase 1.5** — 대화 이력 조회 + 사용자 피드백 반영
- [ ] **Phase 2** — SAP RFC 직접 연결 (pyrfc), 자동 실행
- [ ] **Phase 3** — 실시간 모니터링, 알림 자동화

---

## 🧪 테스트

```bash
# Backend
cd backend
pip install -e ".[dev]"
pytest tests/ -v

# Frontend
cd frontend
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

## 📝 라이선스

MIT License

---

<p align="center">
  <sub>Built with ❤️ by <a href="https://github.com/choishiam0906">choishiam0906</a></sub>
</p>
