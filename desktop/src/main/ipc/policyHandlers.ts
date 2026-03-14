import { ipcMain } from "electron";
import type { PolicyEngine } from "../policy/policyEngine.js";
import type { PolicyRuleInput, PolicyEvaluationContext } from "../policy/policyRules.js";
import type { ApprovalManager } from "../policy/approvalManager.js";

export interface PolicyIpcContext {
  policyEngine: PolicyEngine;
  approvalManager: ApprovalManager;
}

export function registerPolicyHandlers(ctx: PolicyIpcContext): void {
  ipcMain.handle("policy:rules:list", () => {
    return ctx.policyEngine.listRules();
  });

  ipcMain.handle("policy:rules:create", (_event, input: PolicyRuleInput) => {
    return ctx.policyEngine.createRule(input);
  });

  ipcMain.handle("policy:rules:update", (_event, id: string, patch: Partial<PolicyRuleInput> & { enabled?: boolean }) => {
    return ctx.policyEngine.updateRule(id, patch);
  });

  ipcMain.handle("policy:rules:delete", (_event, id: string) => {
    return ctx.policyEngine.deleteRule(id);
  });

  ipcMain.handle("policy:evaluate", (_event, context: PolicyEvaluationContext) => {
    return ctx.policyEngine.evaluate(context);
  });

  ipcMain.handle("policy:approvals:list", () => {
    return ctx.approvalManager.listPending();
  });

  ipcMain.handle("policy:approvals:decide", (_event, requestId: string, approved: boolean) => {
    ctx.approvalManager.decide(requestId, approved);
  });
}
