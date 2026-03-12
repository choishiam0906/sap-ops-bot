# Getting Started — SAP Assistant Desktop Platform

## 필수 요구사항

- **Node.js** 22.22.1 LTS 권장 (`.nvmrc`, `.node-version` 제공)
- **npm** 10.9.4 이상
- **Windows** 10 이상
- **메모리**: 최소 4GB RAM
- **디스크**: 500MB 이상 여유 공간

---

## 설치

```bash
# 저장소 클론
git clone https://github.com/boxlogodev/sap-assistant-desktop.git
cd sap-assistant-desktop/desktop

# 런타임 확인
npm run check:runtime

# 의존성 설치 (Electron 네이티브 모듈 자동 재빌드 포함)
npm install
```

---

## 환경 설정

```bash
# .env 파일 생성
cp .env.example .env
```

`.env` 파일에 LLM API 키를 입력하세요:

```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
```

> API 키는 앱 내 Settings에서도 설정할 수 있습니다.

---

## 개발 모드

```bash
# 권장: 렌더러를 먼저 빌드한 뒤 앱 실행
npm run build

# Electron 앱 실행
npm run start
```

> `npm run start`는 Electron과 충돌하는 `NODE_OPTIONS`를 정리한 뒤 앱을 실행합니다.

---

## 빌드 & 배포

```bash
# 전체 빌드
npm run build

# Windows 포터블 실행 파일
npm run dist:portable

# Windows NSIS 설치 프로그램
npm run dist:nsis

# 모든 배포 포맷
npm run dist
```

---

## 검증

```bash
# 런타임 버전 검증
npm run check:runtime

# 전체 검증 (빌드 + 린트 + 테스트)
npm run verify

# 개별 검증
npm run typecheck     # TypeScript 타입 체크
npm run lint          # ESLint
npm run test:run      # Vitest 테스트
```

---

## 프로젝트 구조

핵심 디렉토리 구조는 [ARCHITECTURE.md](./ARCHITECTURE.md)를 참조하세요.

---

## 다음 단계

- [커스텀 에이전트 만들기](./USER-GUIDE/CUSTOM-AGENTS.md)
- [커스텀 스킬 만들기](./USER-GUIDE/CUSTOM-SKILLS.md)
- [도메인 팩 가이드](./USER-GUIDE/DOMAIN-PACKS.md)
- [보안 모드 설명](./USER-GUIDE/SECURITY-MODES.md)
