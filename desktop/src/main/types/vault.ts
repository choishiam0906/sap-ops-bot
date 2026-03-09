import type { DomainPack } from './policy.js';

export type VaultClassification = "confidential" | "reference";
export type VaultSourceType = "cbo_analysis" | "sap_standard" | "internal_memo";

export interface VaultEntry {
  id: string;
  classification: VaultClassification;
  sourceType: VaultSourceType;
  domainPack: DomainPack | null;
  title: string;
  excerpt: string | null;
  sourceId: string | null;
  filePath: string | null;
  indexedAt: string;
}
