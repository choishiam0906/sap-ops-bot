# PRD (Product Requirements Document)
# SAP 운영 자동화 AI 봇

## 1. 제품 개요

### 제품명
SAP Ops Bot v2 (SAP 운영 자동화 AI 봇)

### 비전
SAP 운영 지식을 AI로 민주화하여, 누구나 자연어로 SAP 운영 절차를 안내받을 수 있는 환경을 만든다.

### 대상 사용자
- **Primary**: SAP Basis/운영 담당자 (일상 운영 업무 효율화)
- **Secondary**: SAP 신규 인력 (온보딩 학습 도구)
- **Tertiary**: IT 관리자 (운영 현황 모니터링)

---

## 2. 문제 정의

| 문제 | 현재 상태 | 목표 상태 |
|------|----------|----------|
| 지식 종속 | 운영 노하우가 개인/PPT에 산재 | AI 봇이 통합 지식 베이스로 즉시 응답 |
| T-code 검색 | 매번 문서 뒤지거나 동료에게 질문 | 자연어로 상황 설명 → 적절한 T-code 추천 |
| 온보딩 비용 | 신규 인력 3-6개월 학습 기간 | AI 봇이 24/7 멘토 역할 |
| 오류 분석 | 디버깅 T-code 모르면 시간 낭비 | 오류 상황 설명 → 디버깅 절차 안내 |
| CBO 소스 품질 | 커스텀 코드 리뷰가 수동/속인적 | 정적 분석 + LLM 보강으로 자동 리스크 감지 |

---

## 3. 현재 상태 (as-is)

> v2 아키텍처 전환 완료 (2026-03-03)

### 완성된 영역
- **Backend**: FastAPI 기반 RAG Q&A API, 지식 베이스 API, 에러 패턴 카탈로그 (10개 패턴)
- **Desktop Main Process**: Electron 31 + TypeScript, OAuth 인증 (Codex/Copilot), SQLite 로컬 저장
- **CBO 분석 엔진**: ABAP 소스 정적 분석 (5개 규칙), 배치 분석, 실행 이력, 리스크 diff, LLM 보강
- **Preload Bridge**: 14개 IPC API (`window.sapOpsDesktop`)
- **CI/CD**: GitHub Actions 파이프라인

### 미완성 영역
- **Desktop Renderer UI**: HTML/CSS/JS 화면 없음 (Main + Preload만 존재)
- **OAuth 실서비스 검증**: 엔드포인트 검증 및 리프레시 토큰 처리 미완

---

## 4. 원하는 상태 (to-be) — Desktop Renderer UI 구축

### F1: 채팅 UI
- **설명**: SAP 운영 Q&A를 위한 대화형 인터페이스
- **화면 구성**: 세션 리스트 (좌측 패널) + 메시지 타임라인 (우측 영역) + 입력창
- **기능**: 새 세션 생성, 세션 전환, 자연어 질의 → AI 응답 표시
- **API 연동**: `sendMessage`, `listSessions`, `getSessionMessages`
- **우선순위**: P0 (필수)

### F2: CBO 분석 UI
- **설명**: ABAP 소스 코드 정적 분석 + 리스크 대시보드
- **화면 구성**: 소스 입력/파일 선택 영역 + 분석 결과 패널 + 이력 관리
- **기능**:
  - 텍스트 직접 입력 분석 (`analyzeCboText`)
  - 파일/폴더 선택 분석 (`pickAndAnalyzeCboFile`, `pickAndAnalyzeCboFolder`)
  - 실행 이력 조회 (`listCboRuns`, `getCboRunDetail`)
  - Run 간 리스크 비교 (`diffCboRuns`)
  - 지식 베이스 동기화 (`syncCboRunKnowledge`)
  - LLM 보강 분석 토글
- **우선순위**: P0 (필수)

### F3: 설정 UI
- **설명**: OAuth 인증 상태 관리 및 앱 설정
- **화면 구성**: Provider 선택 (Codex/Copilot) + 인증 상태 표시 + 로그아웃
- **기능**: `startOAuth`, `completeOAuth`, `getAuthStatus`, `logout`
- **우선순위**: P1 (중요)

### F4: 에러 패턴 조회 UI
- **설명**: 등록된 10개 SAP 에러 패턴을 검색/조회하는 인터페이스
- **우선순위**: P2 (보통)

---

## 5. 비기능 요구사항

| 항목 | 요구사항 |
|------|---------|
| 응답 시간 | 일반 질의 3초 이내, CBO 분석 5초 이내 |
| 플랫폼 | Windows 10+ (Electron Desktop) |
| 보안 | OAuth 기반 인증, 로컬 SQLite 저장 (사내 데이터 외부 유출 방지) |
| 접근성 | 키보드 내비게이션, 충분한 색상 대비 |
| UX | 토스 스타일 가이드 준수 — 해요체, 긍정적 표현, 다크패턴 방지 |

---

## 6. 성공 기준

| 기준 | 목표 | 측정 방법 |
|------|------|----------|
| UI 완성도 | 채팅 + CBO 분석 + 설정 3개 화면 동작 | 각 화면에서 핵심 플로우 1회 이상 완료 가능 |
| API 연동 | Preload bridge 14개 API 중 10개 이상 UI 연결 | 각 API 호출 후 결과가 화면에 표시됨 |
| 빌드 성공 | `npm run build && npm run start` 정상 실행 | Electron 앱이 크래시 없이 기동 |
| 사용성 | 첫 사용자가 설명 없이 채팅 시작 가능 | 3클릭 이내 첫 질문 전송 |

---

## 7. 기술 스택

| 카테고리 | 기술 |
|---------|------|
| Runtime | Electron 31 |
| 언어 | TypeScript (strict mode) |
| Renderer | HTML + CSS + Vanilla TypeScript (프레임워크 미사용) |
| 스타일링 | CSS Custom Properties (다크/라이트 테마 대비) |
| 로컬 DB | SQLite (better-sqlite3) |
| 인증 | OAuth (Codex, Copilot provider) |
| Backend API | FastAPI (기존 backend/ 활용) |

---

## 8. 로드맵

| 단계 | 기간 | 내용 |
|------|------|------|
| ~~Phase 1 MVP~~ | ~~4주~~ | ~~지식 Q&A + T-code 추천~~ ✅ 완료 |
| **Phase 2 Desktop** | 이번 주 (3/4~3/8) | **Renderer UI 전체 — 채팅 + CBO 분석 + 설정** |
| Phase 2.5 | 2주 | OAuth 실서비스 검증, UI 피드백 반영 |
| Phase 3 | 6주 | SAP RFC 직접 연결, 에러 패턴 자동 감지 |
| Phase 4 | TBD | 실시간 모니터링, 알림 자동화 |

---

## 9. 제외 사항 (Out of Scope — Phase 2)
- SAP 시스템 직접 연결 및 자동 실행
- 실시간 시스템 모니터링
- SAP GUI 화면 자동화
- 다국어 지원 (한국어만)
- React/Vue 등 프론트엔드 프레임워크 도입
- 웹 배포 (Desktop 전용)
