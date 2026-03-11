# Security Modes — 보안 모드 가이드

## 개요

SAP Assistant는 3가지 보안 모드를 제공하여 데이터 보호 수준을 조절합니다.

---

## 모드 비교

| 모드 | 외부 API | 데이터 전송 | 용도 |
|------|---------|-----------|------|
| **Secure Local** | 차단 | 없음 | 최대 보안 환경 |
| **Reference** | 허용 | 공개 정보만 | 표준 SAP 지식 질의 |
| **Hybrid Approved** | 조건부 | 승인된 요약본만 | 기업 정책 준수 |

---

## Secure Local Mode

- 모든 처리가 로컬 PC에서 진행
- 인터넷 연결 불필요
- 외부 서버 전송 완전 차단
- CBO 규칙 기반 분석, 로컬 Knowledge 검색만 가능

## Reference Mode

- 표준 SAP 지식만 외부 전송
- API 키 기반 인증
- 감사 로그 기록

## Hybrid Approved Mode

- 민감정보 자동 탐지 및 제거
- 승인 워크플로우 (자동/수동)
- 승인된 요약본만 외부 LLM 전송
- 원문 소스는 로컬에만 유지

---

## 설정 방법

**Settings > Security** 에서 모드를 전환할 수 있습니다.
