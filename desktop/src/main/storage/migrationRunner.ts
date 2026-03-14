import type Database from "better-sqlite3";

export interface Migration {
  version: number;
  name: string;
  up(db: Database.Database): void;
}

/**
 * 버전 관리형 DB 마이그레이션 실행기.
 * schema_version 테이블에 적용된 버전을 기록하고,
 * 앱 시작 시 미적용 마이그레이션을 순차적으로 트랜잭션 내에서 실행한다.
 */
export class MigrationRunner {
  constructor(private readonly db: Database.Database) {
    this.ensureVersionTable();
  }

  private ensureVersionTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  }

  getCurrentVersion(): number {
    const row = this.db
      .prepare("SELECT MAX(version) AS v FROM schema_version")
      .get() as { v: number | null } | undefined;
    return row?.v ?? 0;
  }

  run(migrations: Migration[]): { applied: number; currentVersion: number } {
    const current = this.getCurrentVersion();
    const pending = migrations
      .filter((m) => m.version > current)
      .sort((a, b) => a.version - b.version);

    if (pending.length === 0) {
      return { applied: 0, currentVersion: current };
    }

    const applyAll = this.db.transaction(() => {
      for (const migration of pending) {
        migration.up(this.db);
        this.db
          .prepare("INSERT INTO schema_version (version, name) VALUES (?, ?)")
          .run(migration.version, migration.name);
      }
    });

    applyAll();

    const newVersion = this.getCurrentVersion();
    return { applied: pending.length, currentVersion: newVersion };
  }
}
