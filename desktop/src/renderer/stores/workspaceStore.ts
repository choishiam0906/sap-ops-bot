import { create } from 'zustand'
import type { DomainPack } from '../../main/contracts'

export type { DomainPack }

interface DomainPackDetail {
  label: string
  description: string
  chatTitle: string
  chatDescription: string
  inputPlaceholder: string
  suggestions: string[]
}

const DOMAIN_PACK_KEY = 'sap-assistant-domain-pack'

export const DOMAIN_PACK_DETAILS: Record<DomainPack, DomainPackDetail> = {
  ops: {
    label: 'Ops',
    description: 'Basis, 배치잡, 권한, 덤프, 성능 이슈를 다룹니다.',
    chatTitle: '운영 이슈를 빠르게 진단하세요',
    chatDescription: 'ST22, SM21, 배치잡, 권한, 성능 이슈를 운영 관점으로 정리합니다.',
    inputPlaceholder: '예: ST22 덤프 TSV_TNEW_PAGE_ALLOC_FAILED 원인과 점검 순서',
    suggestions: [
      'ST22 덤프 발생 시 우선 점검할 T-code와 원인을 알려줘',
      '배치잡이 주기적으로 실패할 때 운영자가 확인할 순서를 정리해줘',
      '권한 이슈로 보이는 경우 SU53과 ST01을 어떻게 같이 봐야 해?',
    ],
  },
  functional: {
    label: 'Functional',
    description: '현업 문의, 업무 절차, T-code 흐름, 프로세스 설명에 맞춥니다.',
    chatTitle: '현업 문의를 업무 언어로 풀어냅니다',
    chatDescription: '트랜잭션, 업무 절차, 오류 메시지를 현업 관점으로 설명합니다.',
    inputPlaceholder: '예: 전표 생성이 안 될 때 현업이 먼저 확인할 절차를 설명해줘',
    suggestions: [
      'MM에서 입고 후 송장 처리 흐름을 현업 관점으로 정리해줘',
      '전표 생성 오류가 나올 때 현업이 먼저 확인할 항목은 뭐야?',
      '사용자 교육용으로 VA01 입력 절차를 쉽게 설명해줘',
    ],
  },
  'cbo-maintenance': {
    label: 'CBO Maintenance',
    description: '커스텀 ABAP 소스, Z 프로그램, 운영용 CBO 규칙 점검에 최적화합니다.',
    chatTitle: '커스텀 소스와 운영 규칙을 안전하게 다룹니다',
    chatDescription: 'TXT로 반출한 CBO 소스와 내부 운영 메모를 기준으로 분석 흐름을 만듭니다.',
    inputPlaceholder: '예: 이 Z 프로그램 TXT에서 권한, 성능, 예외처리 리스크를 찾아줘',
    suggestions: [
      'TXT로 넣은 Z 리포트에서 권한 체크 누락 가능성을 먼저 봐줘',
      '커스텀 인터페이스 소스에서 COMMIT/ROLLBACK 위치가 위험한지 검토해줘',
      '운영 중 장애가 난 CBO 프로그램을 로컬 기준으로 어떻게 점검해야 해?',
    ],
  },
  'pi-integration': {
    label: 'PI / Integration',
    description: 'PI/PO, Cloud Integration, Adapter, Mapping, 메시지 추적을 다룹니다.',
    chatTitle: '인터페이스 장애를 메시지 흐름 기준으로 추적하세요',
    chatDescription: 'PI/PO와 Integration Suite 운영 이슈를 어댑터와 메시지 관점으로 풉니다.',
    inputPlaceholder: '예: PI 메시지가 지연될 때 채널, 어댑터, 모니터링 순서를 알려줘',
    suggestions: [
      'PI/PO 메시지 실패 시 모니터링 순서를 단계별로 알려줘',
      'Cloud Integration iFlow 오류를 볼 때 MPL에서 뭘 먼저 봐야 해?',
      'RFC to SOAP 인터페이스 장애 시 채널과 매핑을 어떻게 분리해서 진단해?',
    ],
  },
  'btp-rap-cap': {
    label: 'BTP / RAP / CAP',
    description: 'ABAP Cloud, RAP, CAP, BTP 운영과 개발 질의를 처리합니다.',
    chatTitle: '클라우드 SAP 스택 질문을 구조적으로 답변합니다',
    chatDescription: 'BTP, RAP, CAP 설계와 운영 포인트를 공개 지식 기준으로 정리합니다.',
    inputPlaceholder: '예: RAP unmanaged 시나리오와 CAP 서비스 설계 차이를 비교해줘',
    suggestions: [
      'RAP managed와 unmanaged를 유지보수 관점에서 비교해줘',
      'CAP 서비스에서 CDS 모델링과 서비스 노출 흐름을 설명해줘',
      'BTP Cloud Foundry에서 운영자가 자주 보는 지표와 로그를 정리해줘',
    ],
  },
}

interface WorkspaceState {
  domainPack: DomainPack
  setDomainPack: (pack: DomainPack) => void
  applyRecommendedCboWorkspace: () => void
}

function getInitialDomainPack(): DomainPack {
  try {
    const stored = localStorage.getItem(DOMAIN_PACK_KEY)
    if (
      stored === 'ops' ||
      stored === 'functional' ||
      stored === 'cbo-maintenance' ||
      stored === 'pi-integration' ||
      stored === 'btp-rap-cap'
    ) {
      return stored
    }
  } catch {
    // localStorage 접근 실패는 무시하고 기본값을 사용한다.
  }

  return 'ops'
}

function persistWorkspace(partial: Partial<Pick<WorkspaceState, 'domainPack'>>): void {
  try {
    if (partial.domainPack) {
      localStorage.setItem(DOMAIN_PACK_KEY, partial.domainPack)
    }
  } catch {
    // 저장 실패는 무시하고 세션 상태만 갱신한다.
  }
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  domainPack: getInitialDomainPack(),
  setDomainPack: (domainPack) => {
    persistWorkspace({ domainPack })
    set({ domainPack })
  },
  applyRecommendedCboWorkspace: () => {
    persistWorkspace({
      domainPack: 'cbo-maintenance',
    })
    set({
      domainPack: 'cbo-maintenance',
    })
  },
}))
