import type { Migration } from "../migrationRunner.js";

/**
 * 001: v4.0 기준선 마이그레이션.
 * 기존 ad-hoc ALTER TABLE 로직을 공식 마이그레이션으로 통합한다.
 * CREATE TABLE IF NOT EXISTS / ADD COLUMN try-catch 패턴을 대체.
 *
 * 이 마이그레이션은 v4.0 기존 DB와 신규 DB 모두에서 안전하게 동작한다.
 * (이미 적용된 변경은 IF NOT EXISTS / try-catch로 무시)
 */
export const migration001: Migration = {
  version: 1,
  name: "v4_baseline",
  up(db) {
    // 기존 ad-hoc ALTER를 공식 버전으로 기록만 한다.
    // 실제 테이블은 sqlite.ts의 initSchema()에서 이미 생성되어 있다.
    // 이 마이그레이션은 "v4.0까지의 스키마가 적용되었음"을 schema_version에 기록하는 역할.

    // 혹시 누락된 인덱스 보강
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action
      ON audit_logs (action);

      CREATE INDEX IF NOT EXISTS idx_vault_source_type
      ON knowledge_vault (source_type);
    `);
  },
};
