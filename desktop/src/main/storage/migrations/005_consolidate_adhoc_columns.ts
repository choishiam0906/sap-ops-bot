import type { Migration } from "../migrationRunner.js";

/**
 * 005: initSchema()의 ad-hoc ALTER TABLE 11개를 정식 마이그레이션으로 통합.
 *
 * 신규 DB: CREATE TABLE에 이미 컬럼이 포함되어 있으므로 ALTER가 중복 →
 *          try-catch로 안전하게 무시.
 * 기존 DB: 컬럼이 없으면 ALTER 성공, 이미 있으면 try-catch로 무시.
 */
export const migration005: Migration = {
  version: 5,
  name: "consolidate_adhoc_columns",
  up(db) {
    const safeAlter = (sql: string) => {
      try {
        db.exec(sql);
      } catch {
        // duplicate column name — 이미 존재하면 무시
      }
    };

    // provider_accounts
    safeAlter("ALTER TABLE provider_accounts ADD COLUMN auth_type TEXT");

    // audit_logs
    safeAlter("ALTER TABLE audit_logs ADD COLUMN skill_id TEXT");
    safeAlter("ALTER TABLE audit_logs ADD COLUMN source_ids TEXT");
    safeAlter(
      "ALTER TABLE audit_logs ADD COLUMN source_count INTEGER NOT NULL DEFAULT 0",
    );

    // sessions (Cockpit)
    safeAlter("ALTER TABLE sessions ADD COLUMN todo_state TEXT DEFAULT 'open'");
    safeAlter("ALTER TABLE sessions ADD COLUMN is_flagged INTEGER DEFAULT 0");
    safeAlter("ALTER TABLE sessions ADD COLUMN is_archived INTEGER DEFAULT 0");
    safeAlter("ALTER TABLE sessions ADD COLUMN labels TEXT DEFAULT '[]'");

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_sessions_cockpit
      ON sessions (is_archived, todo_state, is_flagged, updated_at DESC)
    `);

    // messages
    safeAlter(
      "ALTER TABLE messages ADD COLUMN source_references_json TEXT DEFAULT '[]'",
    );
  },
};
