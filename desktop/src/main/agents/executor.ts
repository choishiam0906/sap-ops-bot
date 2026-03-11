import type { ChatRuntime } from "../chatRuntime.js";
import type { DomainPack } from "../contracts.js";
import type { SkillSourceRegistry } from "../skills/registry.js";
import type { AgentExecutionRepository } from "../storage/repositories/agentExecutionRepository.js";
import type { AgentExecution, AgentStepResult } from "../types/agent.js";
import { getAgentDefinition } from "./registry.js";

export class AgentExecutor {
  private readonly runningExecutions = new Set<string>();

  constructor(
    private readonly chatRuntime: ChatRuntime,
    private readonly skillRegistry: SkillSourceRegistry,
    private readonly executionRepo: AgentExecutionRepository
  ) {}

  async startExecution(agentId: string, domainPack: DomainPack): Promise<string> {
    const agent = getAgentDefinition(agentId);
    if (!agent) throw new Error(`에이전트를 찾을 수 없습니다: ${agentId}`);

    const execution = this.executionRepo.create(agentId);
    this.runningExecutions.add(execution.id);

    // 초기 스텝 결과를 pending으로 모두 생성
    const sortedSteps = [...agent.steps].sort((a, b) => a.sortOrder - b.sortOrder);
    for (const step of sortedSteps) {
      this.executionRepo.upsertStepResult(execution.id, {
        stepId: step.id,
        skillId: step.skillId,
        status: "pending",
      });
    }

    // 비동기로 실행 (즉시 executionId 반환)
    void this.runPipeline(execution.id, agentId, domainPack).catch(() => {
      // runPipeline 내부에서 에러 처리 완료
    });

    return execution.id;
  }

  getStatus(executionId: string): AgentExecution | null {
    return this.executionRepo.getById(executionId);
  }

  async cancelExecution(executionId: string): Promise<void> {
    this.runningExecutions.delete(executionId);
    this.executionRepo.updateStatus(executionId, "cancelled");
  }

  private async runPipeline(
    executionId: string,
    agentId: string,
    domainPack: DomainPack
  ): Promise<void> {
    const agent = getAgentDefinition(agentId);
    if (!agent) {
      this.executionRepo.updateStatus(executionId, "failed", "에이전트 정의를 찾을 수 없습니다.");
      return;
    }

    const sortedSteps = [...agent.steps].sort((a, b) => a.sortOrder - b.sortOrder);
    const stepOutputs = new Map<string, string>();

    try {
      for (const step of sortedSteps) {
        // 취소 확인
        if (!this.runningExecutions.has(executionId)) return;

        // 선행 스텝 완료 확인
        if (step.dependsOn) {
          for (const depId of step.dependsOn) {
            if (!stepOutputs.has(depId)) {
              throw new Error(`선행 스텝 '${depId}'이 완료되지 않았습니다.`);
            }
          }
        }

        const now = new Date().toISOString();
        this.executionRepo.upsertStepResult(executionId, {
          stepId: step.id,
          skillId: step.skillId,
          status: "running",
          startedAt: now,
        });

        // 이전 스텝 출력을 컨텍스트로 구성
        const previousContext = step.dependsOn
          ?.map((depId) => {
            const depStep = sortedSteps.find((s) => s.id === depId);
            const output = stepOutputs.get(depId);
            return depStep && output ? `[${depStep.label} 결과]\n${output}` : null;
          })
          .filter(Boolean)
          .join("\n\n");

        const skillDef = this.skillRegistry.resolveSkillExecution({
          skillId: step.skillId,
          context: {
            domainPack,
            dataType: "chat",
            message: previousContext
              ? `${step.label}을 수행하세요.\n\n이전 단계 결과:\n${previousContext}`
              : `${step.label}을 수행하세요.`,
          },
        });

        // ChatRuntime을 통해 LLM 호출
        const result = await this.chatRuntime.sendMessage({
          provider: "copilot", // 기본 provider
          model: "gpt-4o",
          message: previousContext
            ? `${step.label}을 수행하세요.\n\n이전 단계 결과:\n${previousContext}`
            : `${step.label}을 수행하세요.`,
          domainPack,
          skillId: step.skillId,
          sourceIds: skillDef.meta.sourceIds,
        });

        const output = result.assistantMessage.content;
        stepOutputs.set(step.id, output);

        const completedAt = new Date().toISOString();
        this.executionRepo.upsertStepResult(executionId, {
          stepId: step.id,
          skillId: step.skillId,
          status: "completed",
          startedAt: now,
          completedAt,
          output,
        });
      }

      this.executionRepo.updateStatus(executionId, "completed");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류";
      // 현재 실행 중인 스텝을 실패로 표시
      const currentExecution = this.executionRepo.getById(executionId);
      if (currentExecution) {
        const runningStep = currentExecution.stepResults.find((s) => s.status === "running");
        if (runningStep) {
          this.executionRepo.upsertStepResult(executionId, {
            ...runningStep,
            status: "failed",
            completedAt: new Date().toISOString(),
            error: errorMessage,
          });
        }
      }
      this.executionRepo.updateStatus(executionId, "failed", errorMessage);
    } finally {
      this.runningExecutions.delete(executionId);
    }
  }
}
