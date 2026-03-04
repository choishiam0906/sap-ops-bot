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
3. `폴더 배치 분석`을 눌러 디렉터리 전체를 일괄 분석할 수 있습니다(기본 재귀 스캔).
4. `최근 실행 이력`에서 저장된 분석 run 목록을 조회할 수 있습니다.
5. `Run 상세 조회`로 파일별 리스크/권고 상세를 다시 조회할 수 있습니다.
6. `Run 지식 동기화`로 선택 run 결과를 backend Knowledge API(`source_type=source_code`)에 반영합니다(가능하면 `/knowledge/bulk` 사용, 실패 시 단건 fallback).
7. `Run 리스크 비교`로 두 실행 간 신규/해소/지속 리스크를 확인할 수 있습니다.
8. `LLM 보강 분석 사용` 체크 시 provider/model을 함께 전달해 규칙 분석 결과를 보강합니다.
9. 결과는 우측 JSON 패널에서 `summary`, `risks`, `recommendations`, `metadata` 형태로 확인합니다.

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
- 동기화 기본 엔드포인트: `SAP_OPS_BACKEND_API_BASE_URL` (기본값 `http://127.0.0.1:8000/api/v1`)

## 현재 포함 범위
- Main process 런타임
- OAuth 상태 머신(`auth:start`, `auth:complete`, `auth:status`, `auth:logout`)
- 채팅 런타임(`chat:send`)
- 세션 조회(`sessions:list`, `sessions:messages`)
- CBO 분석(`cbo:analyzeText`, `cbo:analyzeFile`, `cbo:analyzeFolder`)
- CBO picker(`cbo:pickAndAnalyzeFile`, `cbo:pickAndAnalyzeFolder`)
- CBO 실행 이력(`cbo:runs:list`, `cbo:runs:detail`)
- CBO 지식 동기화(`cbo:runs:syncKnowledge`)
- CBO 리스크 diff(`cbo:runs:diff`)
- Preload 브리지

## 다음 작업
- Renderer UI(세션 리스트 + 타임라인 + 설정)
- OAuth 실서비스 엔드포인트 검증/리프레시 토큰 처리
- 패키징 및 코드서명
