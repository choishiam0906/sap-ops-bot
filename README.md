# SAP Ops Bot - SAP 운영 자동화 AI 봇

> SAP 운영 지식을 AI로 민주화하여, 누구나 자연어로 SAP 운영 절차를 안내받을 수 있는 환경을 만듭니다.

## 개요

GV_MM팀의 SAP 운영 노하우("운영업무 시간절약 팁모음")를 AI 봇으로 자동화한 프로젝트입니다.
Microsoft Teams에서 자연어로 질문하면, RAG 기반 AI가 적절한 T-code, 실행 절차, 주의사항을 안내합니다.

## 주요 기능

- **SAP 운영 Q&A**: 자연어 질문 → RAG 기반 AI 응답
- **T-code 추천**: 업무 상황 설명 → 적절한 T-code + 실행 절차
- **카테고리 가이드**: 데이터분석 / 오류분석 / 역할관리 / CTS관리
- **Teams 연동**: Copilot Studio를 통한 '@SAP운영봇' 호출
- **Admin Dashboard**: 지식 베이스 관리, 대화 이력 조회

## 아키텍처

```
Teams → Copilot Studio → FastAPI Backend → Azure OpenAI + ChromaDB + PostgreSQL
                                         → React Admin Dashboard
```

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| Backend | Python 3.12 + FastAPI |
| Frontend | React + TypeScript + Vite |
| LLM | Azure OpenAI GPT-4 |
| Vector DB | ChromaDB |
| DB | PostgreSQL (Supabase) |
| Integration | Microsoft Copilot Studio |

## 빠른 시작

### 사전 요구사항
- Python 3.12+
- Node.js 20+
- Docker & Docker Compose (선택)

### 환경 설정
```bash
cp .env.example .env
# .env 파일을 편집하여 실제 값 입력
```

### Backend 실행
```bash
cd backend
pip install -e ".[dev]"
uvicorn app.main:app --reload
```

### Frontend 실행
```bash
cd frontend
npm install
npm run dev
```

### Docker Compose
```bash
docker compose up -d
```

## API 문서

Backend 실행 후 자동 생성:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## 프로젝트 문서

| 문서 | 설명 |
|------|------|
| [PRD](docs/PRD.md) | 제품 요구사항 정의서 |
| [BRD](docs/BRD.md) | 비즈니스 요구사항 정의서 |
| [TRD](docs/TRD.md) | 기술 요구사항 정의서 |

## 라이선스

MIT License
