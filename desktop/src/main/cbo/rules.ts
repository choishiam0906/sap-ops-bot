import {
  CboAnalysisResult,
  CboRecommendation,
  CboRisk,
} from "../contracts.js";

interface Rule {
  id: string;
  title: string;
  severity: CboRisk["severity"];
  matcher: RegExp;
  detail: string;
  recommendation: CboRecommendation;
}

const RULES: Rule[] = [
  {
    id: "exec-sql",
    title: "Native SQL( EXEC SQL ) 사용",
    severity: "high",
    matcher: /(^|\n)\s*EXEC\s+SQL\b/i,
    detail:
      "EXEC SQL 사용은 DB 종속성과 SQL 인젝션/권한 검증 누락 위험을 높일 수 있습니다.",
    recommendation: {
      priority: "p0",
      action: "Open SQL 또는 검증된 DB 추상화로 대체",
      rationale: "이식성/보안/운영 안정성을 동시에 확보할 수 있습니다.",
    },
  },
  {
    id: "select-star",
    title: "SELECT * 사용",
    severity: "medium",
    matcher: /(^|\n)\s*SELECT\s+\*\s+FROM\b/i,
    detail: "불필요한 컬럼까지 조회하면 성능 저하와 네트워크 부하가 증가합니다.",
    recommendation: {
      priority: "p1",
      action: "필요 컬럼만 명시적으로 조회",
      rationale: "I/O를 줄이고 향후 스키마 변경 영향도 낮출 수 있습니다.",
    },
  },
  {
    id: "message-x",
    title: "MESSAGE TYPE 'X' 사용",
    severity: "high",
    matcher: /MESSAGE\s+.*TYPE\s+'X'/i,
    detail: "강제 덤프는 운영 장애를 확산시킬 수 있습니다.",
    recommendation: {
      priority: "p0",
      action: "예외 클래스 기반 처리로 대체",
      rationale: "장애 전파를 제어하고 오류 맥락을 구조화해 로깅할 수 있습니다.",
    },
  },
  {
    id: "commit-in-loop",
    title: "LOOP 내부 COMMIT WORK 가능성",
    severity: "high",
    matcher: /LOOP[\s\S]{0,200}?COMMIT\s+WORK/i,
    detail: "루프 내 커밋은 트랜잭션 일관성을 깨고 롤백 복구를 어렵게 만듭니다.",
    recommendation: {
      priority: "p0",
      action: "배치 단위 트랜잭션으로 재설계",
      rationale: "원자성과 장애 복구 가능성을 유지할 수 있습니다.",
    },
  },
  {
    id: "no-auth-check",
    title: "권한 체크 부재 가능성",
    severity: "medium",
    matcher: /(UPDATE|DELETE|INSERT|MODIFY)\s+/i,
    detail:
      "데이터 변경문이 있으나 AUTHORITY-CHECK 패턴이 보이지 않으면 권한 우회 위험이 있습니다.",
    recommendation: {
      priority: "p1",
      action: "중요 변경 경로에 AUTHORITY-CHECK 추가",
      rationale: "업무 권한 정책과 코드 실행 경로를 일치시킬 수 있습니다.",
    },
  },
];

function detectLanguageHint(content: string): "abap" | "unknown" {
  const abapMarkers = [
    /\bREPORT\b/i,
    /\bFORM\b/i,
    /\bENDFORM\b/i,
    /\bSELECT\b/i,
    /\bAUTHORITY-CHECK\b/i,
    /\bSY-SUBRC\b/i,
  ];
  return abapMarkers.some((marker) => marker.test(content)) ? "abap" : "unknown";
}

function buildSummary(content: string, riskCount: number): string {
  const lines = content.split("\n");
  const formCount = (content.match(/\bFORM\b/gi) ?? []).length;
  const selectCount = (content.match(/\bSELECT\b/gi) ?? []).length;
  const updateCount = (content.match(/\b(UPDATE|DELETE|INSERT|MODIFY)\b/gi) ?? []).length;

  return [
    `소스 길이: ${lines.length} lines / ${content.length} chars`,
    `구조 추정: FORM ${formCount}개, SELECT ${selectCount}개, 변경문 ${updateCount}개`,
    `검출 리스크: ${riskCount}건`,
  ].join("\n");
}

function hasAuthorityCheck(content: string): boolean {
  return /\bAUTHORITY-CHECK\b/i.test(content);
}

export function analyzeByRules(fileName: string, content: string): CboAnalysisResult {
  const risks: CboRisk[] = [];
  const recommendations: CboRecommendation[] = [];

  for (const rule of RULES) {
    if (!rule.matcher.test(content)) {
      continue;
    }

    if (rule.id === "no-auth-check" && hasAuthorityCheck(content)) {
      continue;
    }

    const match = content.match(rule.matcher);
    risks.push({
      severity: rule.severity,
      title: rule.title,
      detail: rule.detail,
      evidence: match?.[0]?.slice(0, 160),
    });
    recommendations.push(rule.recommendation);
  }

  if (risks.length === 0) {
    recommendations.push({
      priority: "p2",
      action: "현 상태 유지 + 회귀 테스트 강화",
      rationale: "즉시 위험 신호는 없지만 변경 시 검증 체계가 중요합니다.",
    });
  }

  return {
    summary: buildSummary(content, risks.length),
    risks,
    recommendations,
    metadata: {
      fileName,
      charCount: content.length,
      languageHint: detectLanguageHint(content),
    },
  };
}
