import type { RoutineTemplateInput } from "../contracts.js";
import type { RoutineTemplateRepository } from "../storage/repositories/routineTemplateRepository.js";
import { logger } from "../logger.js";

const SEED_TEMPLATES: RoutineTemplateInput[] = [
  // ─── Daily (매일) ───
  {
    frequency: 'daily',
    name: 'SAP 일일 점검',
    description: '매일 수행하는 SAP 시스템 점검 및 운영 업무',
    steps: [
      { title: 'SAP 시스템 상태 확인', description: 'SM51, SM21 트랜잭션 확인', module: 'BC', sortOrder: 0 },
      { title: '배치 잡 결과 검토', description: 'SM37 배치 잡 모니터링', module: 'BC', sortOrder: 1 },
      { title: '에러 로그 점검', description: 'ST22, SM21 덤프/에러 확인', module: 'BC', sortOrder: 2 },
      { title: '마스터 데이터 변경 승인', description: '자재/공급업체 마스터 변경 요청 처리', module: 'MM', sortOrder: 3 },
      { title: '미처리 PO/SO 확인', description: '미결 구매오더/판매오더 현황 점검', module: 'MM', sortOrder: 4 },
    ],
  },

  // ─── Monthly (매월 25일) ───
  {
    frequency: 'monthly',
    name: 'SAP 월말 마감',
    description: '매월 25일부터 시작하는 SAP 월별 마감 프로세스',
    triggerDay: 25,
    steps: [
      { title: '미결 전표 정리', description: 'FBL1N/FBL5N 미결 항목 처리', module: 'FI', sortOrder: 0 },
      { title: '환율 조정', description: 'FAGL_FC_VAL 외화 평가', module: 'FI', sortOrder: 1 },
      { title: '감가상각 실행', description: 'AFAB 감가상각 배치 실행', module: 'FI', sortOrder: 2 },
      { title: '원가 정산', description: 'KSS2/CO88 원가 정산 실행', module: 'CO', sortOrder: 3 },
      { title: '내부 오더 정산', description: 'KO88 내부오더 정산', module: 'CO', sortOrder: 4 },
      { title: '재고 평가', description: 'CKMLCP 재고 평가 실행', module: 'MM', sortOrder: 5 },
      { title: 'GR/IR 정리', description: 'MR11 GR/IR 클리어링', module: 'MM', sortOrder: 6 },
      { title: '미납 청구 처리', description: 'VF04 미납 대금 청구 문서 생성', module: 'SD', sortOrder: 7 },
    ],
  },

  // ─── Yearly (12월 20일) ───
  {
    frequency: 'yearly',
    name: 'SAP 연간 결산',
    description: '12월 20일부터 시작하는 SAP 연간 결산 프로세스',
    triggerDay: 20,
    triggerMonth: 12,
    steps: [
      { title: '결산 전표 작성', description: '결산 조정 분개 작성', module: 'FI', sortOrder: 0 },
      { title: '이월 설정', description: 'FAGLGVTR 잔액 이월 실행', module: 'FI', sortOrder: 1 },
      { title: '감사 대응 자료', description: '감사 요청 자료 추출 및 정리', module: 'FI', sortOrder: 2 },
      { title: '연간 원가 배부', description: 'KSU5 연간 원가 배부 실행', module: 'CO', sortOrder: 3 },
      { title: '계획 대 실적 분석', description: 'S_ALR_87013611 계획/실적 비교', module: 'CO', sortOrder: 4 },
      { title: '재고실사', description: 'MI01/MI04 재고 실사 프로세스', module: 'MM', sortOrder: 5 },
      { title: '재고차이 조정', description: 'MI07 재고 차이 전기', module: 'MM', sortOrder: 6 },
      { title: '연도변경 설정', description: 'SXDA/OB52 회계연도 변경', module: 'BC', sortOrder: 7 },
      { title: '번호범위 갱신', description: 'SNRO/FBN1 번호범위 연도 갱신', module: 'BC', sortOrder: 8 },
    ],
  },
];

/**
 * routine_templates 테이블이 비어있으면 기본 SAP 루틴 템플릿을 자동 삽입한다.
 */
export function seedRoutineTemplates(repo: RoutineTemplateRepository): number {
  if (repo.count() > 0) {
    return 0;
  }

  let inserted = 0;
  for (const template of SEED_TEMPLATES) {
    repo.create(template);
    inserted++;
  }

  logger.info({ inserted }, "기본 루틴 템플릿 시드 데이터 삽입 완료");
  return inserted;
}
