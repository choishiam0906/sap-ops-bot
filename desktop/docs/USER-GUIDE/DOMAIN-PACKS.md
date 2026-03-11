# Domain Packs — 도메인 팩 가이드

## 개요

도메인 팩은 SAP 업무 영역별로 **T-Code, 프롬프트, 스킬, 소스**를 최적화한 프리셋입니다.

---

## 5가지 도메인 팩

### Ops Pack
- **용도**: SAP 시스템 운영, 성능, 보안 지원
- **주요 T-Code**: ST22, SM21, ST03N, STMS, SE03, SM50, SM37
- **사용 시나리오**: 시스템 성능 진단, 에러 덤프 해석, 배치 작업 분석

### Functional Pack
- **용도**: 업무 프로세스 및 표준 기능 지원
- **주요 T-Code**: VL01N, ME21N, VF01, FC00
- **사용 시나리오**: T-Code 업무 흐름 설명, 마스터 데이터 관리

### CBO Maintenance Pack
- **용도**: 커스터마이징 객체(CBO) 변경 분석 및 위험 평가
- **주요 T-Code**: SE80, SE91, SE38, SMOD
- **사용 시나리오**: CBO 변경 영향 분석, 코드 리뷰

### PI Integration Pack
- **용도**: SAP PI/PO 및 Cloud Integration 지원
- **주요 T-Code**: SXMB_MONI, SXMB_IFR, ID_OWNR
- **사용 시나리오**: 메시지 흐름 설계, 통합 오류 진단

### BTP/RAP/CAP Pack
- **용도**: SAP BTP, RAP, CAP 개발 지원
- **주요 도구**: ADT, SBPA, Fiori
- **사용 시나리오**: 클라우드 앱 개발, RAP 엔티티 설계

---

## 도메인 팩 선택

Chat 페이지 상단에서 현재 워크스페이스의 도메인 팩을 선택할 수 있습니다. 선택된 도메인 팩에 따라:

1. **스킬 추천**이 달라집니다
2. **Vault 소스** 필터링이 적용됩니다
3. **에이전트** 호환성이 결정됩니다
4. **프롬프트 컨텍스트**가 최적화됩니다
