import { logger } from "../logger.js";
import { DEFAULT_POLICY_RULES } from "../policy/policyRules.js";
import { seedRoutineTemplates } from "../services/routineSeedData.js";
import type { Repositories } from "./createRepositories.js";
import type { Services } from "./createServices.js";

export function seedData(repos: Repositories, services: Services): void {
  // 루틴 템플릿 시드 — 실패해도 앱 계속 실행
  try {
    seedRoutineTemplates(repos.routineTemplateRepo);
  } catch (err) {
    logger.error({ err }, "루틴 시드 데이터 삽입 실패");
  }

  // 앱 시작 시 루틴 자동 실행
  try {
    services.routineExecutor.executeDueRoutines();
  } catch (err) {
    logger.error({ err }, "루틴 자동 실행 실패");
  }

  // 스케줄 자동 시작
  try {
    services.routineScheduler.startAll();
  } catch (err) {
    logger.error({ err }, "스케줄 자동 시작 실패");
  }

  // 기본 정책 규칙 시드 (규칙이 없을 때만)
  try {
    if (services.policyEngine.listRules().length === 0) {
      for (const rule of DEFAULT_POLICY_RULES) {
        services.policyEngine.createRule(rule);
      }
    }
  } catch (err) {
    logger.error({ err }, "정책 규칙 시드 삽입 실패");
  }
}
