// 워크스페이스 정책 타입 — Main/Renderer 공유
export type SecurityMode = "secure-local" | "reference" | "hybrid-approved";

export type DomainPack =
  | "ops"
  | "functional"
  | "cbo-maintenance"
  | "pi-integration"
  | "btp-rap-cap";

export interface PolicyContext {
  securityMode: SecurityMode;
  domainPack: DomainPack;
  dataType: "chat" | "cbo";
}

export interface PolicyDecision {
  allowed: boolean;
  reason: string;
  requiresApproval: boolean;
}
