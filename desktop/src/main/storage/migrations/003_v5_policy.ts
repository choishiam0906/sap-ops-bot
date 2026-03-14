import type { Migration } from "../migrationRunner.js";

/**
 * 003: v5.0 정책 규칙 테이블.
 * 규칙 기반 승인 워크플로우를 지원한다.
 */
export const migration003: Migration = {
  version: 3,
  name: "v5_policy",
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS policy_rules (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        condition_json TEXT NOT NULL,
        action TEXT NOT NULL,
        priority INTEGER NOT NULL DEFAULT 0,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS approval_history (
        id TEXT PRIMARY KEY,
        rule_id TEXT,
        session_id TEXT,
        summary TEXT NOT NULL,
        decision TEXT NOT NULL,
        decided_at TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (rule_id) REFERENCES policy_rules(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_policy_rules_priority
      ON policy_rules (enabled, priority DESC);

      CREATE INDEX IF NOT EXISTS idx_approval_history_created
      ON approval_history (created_at DESC);
    `);
  },
};
