# CLAUDE.md - SAP Assistant Desktop Platform v5.0.0

## 프로젝트 개요

**기술 스택**
- **런타임**: Electron 31 + Vite 6
- **UI**: React 18 + TypeScript 5.7 (strict mode)
- **상태**: Zustand 5 + React Query 5
- **데이터**: better-sqlite3 (SQLite)
- **UI 라이브러리**: lucide-react (아이콘)
- **스타일**: CSS 변수 시스템 (Tailwind/CSS-in-JS 미사용)

**버전**: v5.0.0

---

## 아키텍처

```
Renderer (React)
  ↔ Preload (src/preload/index.ts - IPC bridge, window.sapOpsDesktop)
  ↔ Main Process (Electron)
    ├─ Policy Engine (src/main/policy/)
    ├─ Provider Router (src/main/providers/)
    ├─ CBO Analyzer (src/main/cbo/)
    ├─ Source Manager (src/main/sources/)
    ├─ Auth (src/main/auth/ - OAuth, PKCE, keytar)
    └─ Storage (src/main/storage/ - SQLite repositories)
```

### 신뢰 경계 (Trust Boundary)
- **Renderer → Main**: Preload IPC만 사용 (`window.sapOpsDesktop`)
- **직접 Node.js 접근 금지**: Renderer에서 Node.js 직접 호출 불가
- **자격증명**: 시스템 키체인 저장 (keytar 사용)

---

## 핵심 패턴

### 설정 (Settings)
- **Primitives 라이브러리**: `src/renderer/components/settings/primitives/`
- **설정 페이지**: `src/renderer/pages/settings/`
- **레지스트리 패턴**: `settings-pages.ts`에서 관리

### 타입 시스템
- **모듈화**: `src/main/types/` (기능별 분리)
- **호환성**: `src/main/contracts.ts`에서 재내보내기

### 상태 관리 (Zustand)
- **저장소**: `src/renderer/stores/`
  - `settingsStore`
  - `workspaceStore`
  - `chatStore`
  - 기타
- **지속성**: persist middleware 적용

### IPC 핸들러
- **위치**: `src/main/ipc/`
- **모듈**:
  - `auditHandlers`
  - `authHandlers`
  - `cboHandlers`
  - `chatHandlers` (스트리밍 포함)
  - `sourceHandlers`
  - `closingHandlers`
  - `routineHandlers`
  - `archiveHandlers`
  - `agentHandlers`
  - `scheduleHandlers` (v5.0)
  - `policyHandlers` (v5.0)

### 스타일 시스템
- **변수 파일**: `src/renderer/styles/variables.css`
- **CSS 변수 네이밍**:
  - `--color-*` (색상)
  - `--spacing-*` (간격)
  - `--radius-*` (테두리 반경)
  - `--shadow-*` (그림자)
  - `--font-size-*` (폰트 크기)

---

## 코딩 규칙

### TypeScript
- **Strict Mode 필수**: `tsconfig.json` strict 설정
- **타입 어노테이션**: 복잡한 타입만 명시, 추론 가능한 부분은 생략 금지
- **No `any`**: 타입 안정성 우선

### React & 컴포넌트
- **함수 컴포넌트**: `function` 또는 `const` 문법 모두 허용
- **기본 내보내기 금지**: `export function Component()` (명명 내보내기 필수)
- **Props 타입**: 인터페이스 정의 필수

### CSS
- **변수 우선**: `var(--color-primary)` 사용
- **인라인 스타일 금지**: 별도 CSS 파일 또는 className 사용
- **CSS Modules**: 필요 시 `.module.css` 사용 가능

### 문자열 & UX
- **한국어 UI**: 모든 텍스트는 한국어 (해요체)
- **기술 용어**: 영문 병기 가능 (예: "SAP 정책 엔진")

### Import 문법
- **ESM 확장자**: `.js` 접미사 필수
  ```typescript
  import { ipcMain } from 'electron';  // Built-in은 접미사 불필요
  import { Store } from './store.js';  // 상대 경로는 .js 필수
  ```

---

## 개발 워크플로우

### 설치 및 빌드
```bash
npm install           # 의존성 설치
npm run build         # 전체 빌드 (타입체크 + 번들)
npm run dev           # 개발 모드 (메인 프로세스)
npm run start         # Electron 앱 실행
```

### 검증 및 테스트
```bash
npm run verify        # 빌드 + 린트 + 테스트 (전체 검증)
npm run typecheck     # TypeScript 타입 체크 (모든 tsconfig 포함)
npm run test:run      # Vitest 실행
npm run test:watch    # 감시 모드
```

### 린트 및 포맷팅
```bash
npm run lint          # ESLint 실행
npm run format        # Prettier 포맷팅
```

---

## 테스트 전략

### 테스트 프레임워크
- **러너**: Vitest
- **UI 테스트**: React Testing Library
- **DOM 환경**: happy-dom (jsdom보다 가벼움)

### 테스트 구조
- **위치**: `__tests__/` 디렉토리 (테스트 대상과 같은 위치)
- **예**:
  - `src/renderer/pages/__tests__/Dashboard.test.tsx`
  - `src/renderer/stores/__tests__/settingsStore.test.ts`

### 기존 테스트 커버리지
- **페이지 테스트**: 8개
- **스토어 테스트**: 2개
- **Policy Engine 테스트**: 1개

### 테스트 작성 가이드
- **Happy Path 중심**: 정상 케이스 우선
- **에러 케이스**: 주요 실패 시나리오만
- **UI 상호작용**: React Testing Library 쿼리 우선 (`getByRole` 등)

---

## 디렉토리 구조 (핵심)

```
desktop/
├── src/
│   ├── main/                  # 메인 프로세스
│   │   ├── policy/            # 정책 엔진
│   │   ├── providers/         # 프로바이더 라우터
│   │   ├── cbo/               # CBO 분석기
│   │   ├── sources/           # 소스 관리자
│   │   ├── auth/              # OAuth, PKCE
│   │   ├── storage/           # SQLite 저장소
│   │   ├── ipc/               # IPC 핸들러
│   │   ├── types/             # 타입 정의
│   │   └── contracts.ts       # 타입 재내보내기
│   ├── preload/               # Preload 스크립트 (IPC 브릿지)
│   └── renderer/              # React UI
│       ├── components/
│       │   └── settings/primitives/
│       ├── pages/
│       │   └── settings/
│       ├── stores/            # Zustand 상태
│       ├── styles/
│       │   └── variables.css  # CSS 변수
│       └── __tests__/
├── tsconfig.json
└── package.json
```

---

## 주의사항

### 성능
- **Main Process 블로킹 금지**: 장시간 작업은 Worker 또는 비동기 처리
- **IPC 호출 최소화**: 배치 처리 고려

### 보안
- **Preload 검증**: 모든 IPC 메시지 유효성 검사
- **SQLite 파라미터화**: 쿼리는 항상 바인딩 변수 사용
- **자격증명 노출 금지**: 콘솔 로그에서 제거

### 호환성
- **Electron 31 API**: 최신 API 사용 가능
- **ESM**: 모든 import은 확장자 포함

---

## 참고 자료

- **전역 규칙**: `~/.claude/CLAUDE.md`
- **프로젝트 저장소**: `C:\Users\chois\sap-ops-bot\desktop\`
- **테스트 실행**: `npm run test:run`

---

### v5.0 신규 기능
- **DB 마이그레이션 시스템**: `src/main/storage/migrationRunner.ts` + `migrations/`
- **LLM 스트리밍**: Provider 레벨 `sendMessageStream()`, IPC 스트리밍 채널
- **스케줄 자동 실행**: `node-cron` 기반 `RoutineScheduler`, Cockpit SchedulePanel
- **정책 엔진**: `PolicyEngine` + DB 기반 규칙 관리, Settings PolicySettingsPage
- **에러 복원력**: `ProviderResilience` (Retry + Circuit Breaker + Fallback)
- **Chat History 설정화**: configurable history window (2~100)
- **다크 모드**: CSS 변수 + data-theme 속성 전환 (이미 v4에서 준비됨)

## 최근 변경 이력

| 버전 | 날짜 | 변경 사항 |
|------|------|----------|
| 5.0.0 | 2026-03-11 | v5.0 전체 구현: 스트리밍, 스케줄, 정책 엔진, 에러 복원력, DB 마이그레이션 |
| 3.0.0 | 2026-03-09 | 프로젝트별 CLAUDE.md 작성 (초안) |

