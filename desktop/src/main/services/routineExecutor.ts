import type { ClosingPlanRepository } from "../storage/repositories/closingPlanRepository.js";
import type { ClosingStepRepository } from "../storage/repositories/closingStepRepository.js";
import type { RoutineTemplateRepository } from "../storage/repositories/routineTemplateRepository.js";
import type { RoutineExecutionRepository } from "../storage/repositories/routineExecutionRepository.js";
import type { RoutineTemplate } from "../contracts.js";
import { logger } from "../logger.js";

export class RoutineExecutor {
  constructor(
    private readonly templateRepo: RoutineTemplateRepository,
    private readonly executionRepo: RoutineExecutionRepository,
    private readonly planRepo: ClosingPlanRepository,
    private readonly stepRepo: ClosingStepRepository,
  ) {}

  /**
   * 앱 시작 시 호출: 오늘 날짜 기준으로 실행해야 할 루틴 템플릿을 확인하고
   * 아직 실행되지 않은 것만 Plan + Steps를 자동 생성한다.
   */
  executeDueRoutines(): { created: number; skipped: number } {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const day = today.getDate();
    const month = today.getMonth() + 1; // 1-based

    let created = 0;
    let skipped = 0;

    // Daily 루틴
    const dailyTemplates = this.templateRepo.listByFrequency('daily');
    for (const template of dailyTemplates) {
      if (this.executionRepo.hasExecution(template.id, todayStr)) {
        skipped++;
        continue;
      }
      this.createPlanFromTemplate(template, todayStr, todayStr);
      created++;
    }

    // Monthly 루틴: triggerDay와 오늘 날짜가 일치할 때
    const monthlyTemplates = this.templateRepo.listByFrequency('monthly');
    for (const template of monthlyTemplates) {
      const triggerDay = template.triggerDay ?? 25;
      if (day < triggerDay) {
        skipped++;
        continue;
      }
      // 실행 키: template_id + 해당 월의 execution_date (YYYY-MM)
      const monthKey = todayStr.slice(0, 7); // YYYY-MM
      const execDate = `${monthKey}-${String(triggerDay).padStart(2, '0')}`;
      if (this.executionRepo.hasExecution(template.id, execDate)) {
        skipped++;
        continue;
      }
      // 월말을 target_date로 설정
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      const targetDate = `${monthKey}-${String(lastDay).padStart(2, '0')}`;
      this.createPlanFromTemplate(template, execDate, targetDate);
      created++;
    }

    // Yearly 루틴: triggerMonth/triggerDay 모두 일치할 때
    const yearlyTemplates = this.templateRepo.listByFrequency('yearly');
    for (const template of yearlyTemplates) {
      const triggerMonth = template.triggerMonth ?? 12;
      const triggerDay = template.triggerDay ?? 20;
      if (month < triggerMonth || (month === triggerMonth && day < triggerDay)) {
        skipped++;
        continue;
      }
      const year = today.getFullYear();
      const execDate = `${year}-${String(triggerMonth).padStart(2, '0')}-${String(triggerDay).padStart(2, '0')}`;
      if (this.executionRepo.hasExecution(template.id, execDate)) {
        skipped++;
        continue;
      }
      // 연말을 target_date로 설정
      const targetDate = `${year}-12-31`;
      this.createPlanFromTemplate(template, execDate, targetDate);
      created++;
    }

    logger.info({ created, skipped }, "루틴 자동 실행 완료");
    return { created, skipped };
  }

  private createPlanFromTemplate(
    template: RoutineTemplate,
    executionDate: string,
    targetDate: string,
  ): void {
    const steps = this.templateRepo.getSteps(template.id);

    // Plan 생성
    const plan = this.planRepo.create({
      title: this.buildPlanTitle(template, executionDate),
      description: template.description,
      type: template.frequency === 'daily' ? 'custom' : template.frequency === 'monthly' ? 'monthly' : 'yearly',
      targetDate,
    });

    // Steps 생성
    for (const step of steps) {
      this.stepRepo.create({
        planId: plan.id,
        title: step.title,
        description: step.description,
        module: step.module as never, // SapLabel 호환
        deadline: targetDate,
      });
    }

    // 실행 기록
    this.executionRepo.create(template.id, plan.id, executionDate);

    logger.info(
      { templateId: template.id, planId: plan.id, executionDate },
      `루틴 Plan 생성: ${template.name}`
    );
  }

  private buildPlanTitle(template: RoutineTemplate, executionDate: string): string {
    switch (template.frequency) {
      case 'daily':
        return `[Daily] ${template.name} — ${executionDate}`;
      case 'monthly': {
        const [y, m] = executionDate.split('-');
        return `[Monthly] ${template.name} — ${y}년 ${Number(m)}월`;
      }
      case 'yearly': {
        const year = executionDate.split('-')[0];
        return `[Yearly] ${template.name} — ${year}년`;
      }
    }
  }
}
