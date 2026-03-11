# Contributing — 기여 가이드

## 개발 환경 설정

[GETTING-STARTED.md](./GETTING-STARTED.md)를 참조하세요.

---

## 코드 컨벤션

### TypeScript
- **Strict Mode 필수**
- **ESM Import**: `.js` 확장자 필수 (`import { X } from './module.js'`)
- **No `any`**: 타입 안정성 우선
- **함수형 선호**: 불변성, 순수함수

### React
- **명명 내보내기 필수**: `export function Component()`
- **Props 타입**: 인터페이스 정의 필수
- **CSS 변수 기반**: 인라인 스타일 금지

### 문자열 & UX
- **UI 텍스트**: 한국어 (해요체)
- **기술 용어**: 영문 병기 가능

---

## Git 컨벤션

### 브랜치 전략 (Git Flow)
- `main`: 프로덕션 배포
- `develop`: 개발 통합
- `feature/*`: 기능 개발
- `release/*`: 릴리즈 준비
- `hotfix/*`: 긴급 수정

### 커밋 메시지 (Conventional Commits)
```
feat(domain): 간단한 설명
fix(domain): 버그 설명
refactor(domain): 리팩토링 설명
docs: 문서 업데이트
test: 테스트 추가
chore: 빌드, 의존성 등
```

### Pull Request
1. `feature/*` 브랜치에서 작업
2. `npm run verify` 통과 확인
3. PR 생성 (Summary + Test Plan 필수)
4. Co-Authored-By 헤더 포함

---

## 테스트

```bash
npm run test:run      # 전체 테스트
npm run test:watch    # 감시 모드
npm run test:coverage # 커버리지
```

- **위치**: `__tests__/` 디렉토리
- **프레임워크**: Vitest + React Testing Library
- **DOM**: happy-dom

---

## 디렉토리 구조

핵심 구조는 [ARCHITECTURE.md](./ARCHITECTURE.md)를 참조하세요.
