# SAP Ops Bot Desktop

Electron 기반 클라이언트 런타임입니다.

## 핵심 목적
- 서버 API 키 방식 대신 사용자 OAuth 기반 인증(Codex/Copilot)
- 세션/메시지 로컬 저장(SQLite)
- 세션별 provider/model lock
- CBO 소스(`.txt`, `.md`) 정적 분석 + 선택적 LLM 보강

## 빠른 시작
```bash
cd desktop
cp .env.example .env
npm install
npm run build
npm run start
```

## CBO 분석 사용법
앱 실행 후 기본 화면에서 바로 사용할 수 있습니다.

1. `파일명`과 `소스 입력`에 분석할 텍스트를 입력하고 `텍스트 분석`을 누릅니다.
2. 또는 `파일 선택 후 분석`을 눌러 `.txt`/`.md` 파일을 직접 선택합니다.
3. `LLM 보강 분석 사용` 체크 시 provider/model을 함께 전달해 규칙 분석 결과를 보강합니다.
4. 결과는 우측 JSON 패널에서 `summary`, `risks`, `recommendations`, `metadata` 형태로 확인합니다.

### 분석 규칙(1차)
- `EXEC SQL` 사용
- `SELECT *` 사용
- `MESSAGE ... TYPE 'X'` 사용
- `LOOP` 내부 `COMMIT WORK` 가능성
- 데이터 변경문 대비 `AUTHORITY-CHECK` 부재 가능성

### 제한사항
- 지원 파일: `.txt`, `.md`
- 최대 파일 크기: 1MB
- UTF-8 텍스트만 허용(바이너리 형태 파일 차단)

## 현재 포함 범위
- Main process 런타임
- OAuth 상태 머신(`auth:start`, `auth:complete`, `auth:status`, `auth:logout`)
- 채팅 런타임(`chat:send`)
- 세션 조회(`sessions:list`, `sessions:messages`)
- CBO 분석(`cbo:analyzeText`, `cbo:analyzeFile`, `cbo:pickAndAnalyzeFile`)
- Preload 브리지

## 다음 작업
- Renderer UI(세션 리스트 + 타임라인 + 설정)
- OAuth 실서비스 엔드포인트 검증/리프레시 토큰 처리
- 패키징 및 코드서명
